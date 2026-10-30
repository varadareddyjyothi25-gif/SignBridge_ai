import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  CameraOff,
  RefreshCw,
  Trash2,
  Shield,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  BookOpen,
  Users,
  Activity,
  Eye,
  EyeOff,
  Cpu
} from 'lucide-react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { defaultClassifier, type ClassificationResult } from '../ml/islClassifier';
import type { LandmarkPoint, MotionData } from '../ml/featureExtractor';
import { SignBridgeDataService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

// Hand landmark 21-point connections
const HAND_CONNECTIONS = [
  [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
  [0, 5], [5, 6], [6, 7], [7, 8],       // Index
  [5, 9], [9, 10], [10, 11], [11, 12],  // Middle
  [9, 13], [13, 14], [14, 15], [15, 16],// Ring
  [13, 17], [17, 18], [18, 19], [19, 20],// Pinky
  [0, 17]                               // Palm base
];

type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'running'
  | 'permission_denied'
  | 'not_found'
  | 'already_in_use'
  | 'insecure_origin'
  | 'model_error';

interface HistoryPoint {
  x: number;
  y: number;
  time: number;
}

export const GesturePredictorView: React.FC = () => {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [cameraStatus, setCameraStatus] = useState<CameraStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [prediction, setPrediction] = useState<ClassificationResult | null>(null);
  const [detectedHandCount, setDetectedHandCount] = useState<number>(0);
  const [threshold, setThreshold] = useState<number>(0.65);
  const [historySaved, setHistorySaved] = useState<boolean>(false);
  const [isModelReady, setIsModelReady] = useState<boolean>(false);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [showLandmarkOverlay, setShowLandmarkOverlay] = useState<boolean>(true);
  const [inferenceLatencyMs, setInferenceLatencyMs] = useState<number>(0);
  const [rawHandednessTag, setRawHandednessTag] = useState<string>('None');

  // References for animation frame, stream, and temporal tracking
  const animFrameIdRef = useRef<number | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const lastProcessedTimeRef = useRef<number>(0);
  const lastHandSeenTimeRef = useRef<number>(0);
  const wristHistoryRef = useRef<HistoryPoint[]>([]);

  // Initialize MediaPipe HandLandmarker with TWO-HAND support
  useEffect(() => {
    let active = true;

    async function initMediaPipe() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );
        if (!active) return;

        const landmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2, // TWO HAND TRACKING ENABLED
          minHandDetectionConfidence: 0.55,
          minHandPresenceConfidence: 0.55,
          minTrackingConfidence: 0.55,
        });

        if (active) {
          handLandmarkerRef.current = landmarker;
          setIsModelReady(true);
        }
      } catch (err) {
        console.warn('Could not load online MediaPipe CDN model; fallback active:', err);
        if (active) {
          setIsModelReady(true);
        }
      }
    }

    initMediaPipe();

    return () => {
      active = false;
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close();
        handLandmarkerRef.current = null;
      }
    };
  }, []);

  // Update classifier threshold
  useEffect(() => {
    defaultClassifier.setRejectionThreshold(threshold);
  }, [threshold]);

  // Clean stop all camera tracks
  const stopCamera = useCallback(() => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => {
        track.stop();
      });
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }

    wristHistoryRef.current = [];
    defaultClassifier.resetTemporalBuffer();
    setDetectedHandCount(0);
    setPrediction(null);
    setCameraStatus('idle');
  }, []);

  // Ensure stop on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Helper to draw dual hand landmarks and skeletal connections
  const drawDualHands = useCallback(
    (
      ctx: CanvasRenderingContext2D,
      primaryHand: LandmarkPoint[] | null,
      secondaryHand: LandmarkPoint[] | null,
      width: number,
      height: number
    ) => {
      if (!showLandmarkOverlay) return;

      ctx.save();
      if (facingMode === 'user') {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      const renderSkeleton = (
        landmarks: LandmarkPoint[],
        strokeColor: string,
        jointColor: string
      ) => {
        // Draw skeletal bones
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 3.5;
        for (const [startIdx, endIdx] of HAND_CONNECTIONS) {
          const p1 = landmarks[startIdx];
          const p2 = landmarks[endIdx];
          if (p1 && p2) {
            ctx.beginPath();
            ctx.moveTo(p1.x * width, p1.y * height);
            ctx.lineTo(p2.x * width, p2.y * height);
            ctx.stroke();
          }
        }

        // Draw joint landmarks
        for (let i = 0; i < landmarks.length; i++) {
          const p = landmarks[i];
          const x = p.x * width;
          const y = p.y * height;
          ctx.beginPath();
          ctx.arc(x, y, i === 0 ? 6.5 : 4, 0, 2 * Math.PI);
          ctx.fillStyle = i === 0 ? '#ef4444' : jointColor;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
      };

      // Draw primary (dominant) hand in vibrant brand blue
      if (primaryHand && primaryHand.length === 21) {
        renderSkeleton(primaryHand, '#255ee7', '#10b981');
      }

      // Draw secondary hand in rich purple/teal
      if (secondaryHand && secondaryHand.length === 21) {
        renderSkeleton(secondaryHand, '#9333ea', '#f59e0b');

        // Draw inter-hand coordination bridge line
        if (primaryHand && primaryHand.length === 21) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(primaryHand[0].x * width, primaryHand[0].y * height);
          ctx.lineTo(secondaryHand[0].x * width, secondaryHand[0].y * height);
          ctx.strokeStyle = '#38bdf8';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();
    },
    [facingMode, showLandmarkOverlay]
  );

  // Compute kinematic motion delta from recent wrist history
  const computeKinematics = (wristPoint: LandmarkPoint, now: number): MotionData => {
    const history = wristHistoryRef.current;
    history.push({ x: wristPoint.x, y: wristPoint.y, time: now });

    // Keep history strictly within last 350ms (~10 frames)
    while (history.length > 0 && now - history[0].time > 350) {
      history.shift();
    }

    if (history.length < 2) {
      return { dx: 0, dy: 0, tipSpeed: 0, oscX: 0, oscY: 0 };
    }

    const first = history[0];
    const latest = history[history.length - 1];
    const dx = latest.x - first.x;
    const dy = latest.y - first.y;
    const dt = Math.max(0.01, (latest.time - first.time) / 1000.0);

    const speed = Math.sqrt(dx * dx + dy * dy) / dt;

    // Measure oscillation (variance around mean)
    let meanX = 0, meanY = 0;
    for (const p of history) {
      meanX += p.x;
      meanY += p.y;
    }
    meanX /= history.length;
    meanY /= history.length;

    let varX = 0, varY = 0;
    for (const p of history) {
      varX += (p.x - meanX) * (p.x - meanX);
      varY += (p.y - meanY) * (p.y - meanY);
    }

    return {
      dx,
      dy,
      tipSpeed: Math.min(1.0, speed * 0.5),
      oscX: Math.min(1.0, Math.sqrt(varX) * 10),
      oscY: Math.min(1.0, Math.sqrt(varY) * 10)
    };
  };

  // Main video frame processing loop
  useEffect(() => {
    let animId: number;

    const frameLoop = () => {
      if (!videoRef.current || !canvasRef.current || cameraStatus !== 'running') {
        return;
      }

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      if (video.readyState >= 2 && ctx) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;
        }

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const now = performance.now();

        // Process inference at ~30 FPS
        if (now - lastProcessedTimeRef.current >= 33) {
          lastProcessedTimeRef.current = now;

          if (handLandmarkerRef.current) {
            try {
              const results = handLandmarkerRef.current.detectForVideo(video, now);
              const numDetected = results.landmarks ? results.landmarks.length : 0;
              setDetectedHandCount(numDetected);

              if (numDetected > 0 && results.landmarks) {
                lastHandSeenTimeRef.current = now;

                // Associate hands deterministically using handedness tags
                let primary: LandmarkPoint[] | null = null;
                let secondary: LandmarkPoint[] | null = null;

                const handednesses = results.handednesses || [];
                let hTag = 'None';

                if (numDetected === 1) {
                  primary = results.landmarks[0] as LandmarkPoint[];
                  const h0 = handednesses[0]?.[0]?.categoryName || 'Hand 1';
                  hTag = `1 Hand (${h0})`;
                } else if (numDetected >= 2) {
                  const h0 = handednesses[0]?.[0]?.categoryName || 'Right';
                  const h1 = handednesses[1]?.[0]?.categoryName || 'Left';
                  hTag = `2 Hands (${h0}, ${h1})`;
                  const isUser = facingMode === 'user';
                  const phys0 = isUser ? (h0 === 'Left' ? 'Right' : 'Left') : h0;

                  if (phys0 === 'Right') {
                    primary = results.landmarks[0] as LandmarkPoint[];
                    secondary = results.landmarks[1] as LandmarkPoint[];
                  } else {
                    primary = results.landmarks[1] as LandmarkPoint[];
                    secondary = results.landmarks[0] as LandmarkPoint[];
                  }
                }
                setRawHandednessTag(hTag);

                // Render dual hand skeletons
                drawDualHands(ctx, primary, secondary, canvas.width, canvas.height);

                // Compute temporal motion
                const motion = primary ? computeKinematics(primary[0], now) : undefined;

                // Execute multi-hand neural inference with latency timing
                const tStart = performance.now();
                const res = defaultClassifier.classifyMultiHand(primary, secondary, motion);
                const tEnd = performance.now();
                setInferenceLatencyMs(Math.round((tEnd - tStart) * 10) / 10);
                setPrediction(res);
              } else {
                setRawHandednessTag('No hands in view');
                // When hands leave frame, clear prediction after 1.2s timeout to prevent stale locks
                if (now - lastHandSeenTimeRef.current > 1200) {
                  setPrediction(null);
                  defaultClassifier.resetTemporalBuffer();
                  wristHistoryRef.current = [];
                }
              }
            } catch (e) {
              console.warn('Frame processing exception:', e);
            }
          }
        }
      }

      animId = requestAnimationFrame(frameLoop);
    };

    if (cameraStatus === 'running') {
      animId = requestAnimationFrame(frameLoop);
    }

    return () => {
      if (animId) cancelAnimationFrame(animId);
    };
  }, [cameraStatus, drawDualHands, facingMode]);

  // Start Camera
  const startCamera = async () => {
    if (
      location.protocol !== 'https:' &&
      location.hostname !== 'localhost' &&
      location.hostname !== '127.0.0.1'
    ) {
      setCameraStatus('insecure_origin');
      setErrorMessage(
        'Camera access requires a secure HTTPS origin or localhost environment.'
      );
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraStatus('not_found');
      setErrorMessage('Camera API is not supported on this device/browser.');
      return;
    }

    setCameraStatus('requesting');
    setErrorMessage('');
    setPrediction(null);
    setHistorySaved(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30, max: 30 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraStatus('running');
        };
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraStatus('permission_denied');
        setErrorMessage(
          'Camera permission was denied. Please allow camera access in your browser settings to continue.'
        );
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraStatus('not_found');
        setErrorMessage('No camera device was detected on your hardware.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setCameraStatus('already_in_use');
        setErrorMessage(
          'Your camera may already be in use by another application or browser tab.'
        );
      } else {
        setCameraStatus('model_error');
        setErrorMessage(
          err.message || 'An unexpected error occurred while starting the camera.'
        );
      }
    }
  };

  const toggleCameraFacing = async () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  };

  // Save current recognized gesture to user history
  const handleSaveToHistory = async () => {
    if (!prediction || !prediction.isRecognized || !user) return;

    await SignBridgeDataService.addHistory(
      user.id,
      prediction.label,
      prediction.confidence,
      prediction.isTwoHanded ? 'right' : (user.preferredHand === 'left' ? 'left' : 'right')
    );
    setHistorySaved(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Privacy Assurance */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">
              Hand Gesture → AI Prediction
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-brand-50 text-brand-700 border border-brand-200">
              ISL Two-Hand Model v2
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${isModelReady
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
            >
              {isModelReady ? '• Model Ready' : '• Loading Model...'}
            </span>
          </div>
          <p className="text-sm text-slate-600 mt-1">
            Real-time on-device single-hand and two-hand Indian Sign Language recognition with temporal kinematic tracking.
          </p>
        </div>

        {/* Privacy Badge */}
        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl text-xs text-emerald-900 shrink-0">
          <Shield className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>100% On-Device Privacy:</strong> Video frames stay strictly in local memory.
          </span>
        </div>
      </div>

      {/* Main Responsive Grid: Camera & Prediction Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Camera Viewport Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          {/* Camera Frame Container with 4:3 Aspect Ratio */}
          <div className="relative aspect-[4/3] w-full bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center">
            {/* Live Video */}
            <video
              ref={videoRef}
              playsInline
              muted
              className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? '-scale-x-100' : ''
                } ${cameraStatus === 'running' ? 'opacity-100' : 'opacity-0'}`}
            />

            {/* Canvas Landmark Overlay */}
            <canvas
              ref={canvasRef}
              className={`absolute inset-0 w-full h-full pointer-events-none ${cameraStatus === 'running' ? 'opacity-100' : 'opacity-0'
                }`}
            />

            {/* Hand presence indicator */}
            {cameraStatus === 'running' && (
              <div
                className={`absolute top-3 left-3 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-2 backdrop-blur-md ${detectedHandCount === 2
                    ? 'bg-purple-600/90 text-white shadow-sm'
                    : detectedHandCount === 1
                      ? 'bg-emerald-600/90 text-white shadow-sm'
                      : 'bg-slate-800/80 text-slate-300'
                  }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${detectedHandCount > 0 ? 'bg-white animate-pulse' : 'bg-slate-400'
                    }`}
                />
                <span className="flex items-center gap-1">
                  {detectedHandCount === 2 ? (
                    <>
                      <Users className="w-3.5 h-3.5" />
                      <span>2 Hands Tracked (Coordinated ISL Mode)</span>
                    </>
                  ) : detectedHandCount === 1 ? (
                    <span>1 Hand Detected</span>
                  ) : (
                    <span>Align Hand(s) In Frame</span>
                  )}
                </span>
              </div>
            )}

            {/* Inactive & Error States */}
            {cameraStatus !== 'running' && (
              <div className="text-center p-6 max-w-md z-10 text-white">
                {cameraStatus === 'idle' && (
                  <div className="space-y-3">
                    <div className="w-14 h-14 mx-auto rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                      <Camera className="w-7 h-7" />
                    </div>
                    <h3 className="font-semibold text-lg">Camera is Inactive</h3>
                    <p className="text-xs text-slate-400">
                      Click “Start Camera” below to begin real-time gesture recognition. Supports both single-hand and two-hand signs.
                    </p>
                  </div>
                )}

                {cameraStatus === 'requesting' && (
                  <div className="space-y-3">
                    <div className="w-8 h-8 mx-auto border-3 border-brand-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm font-medium">Requesting camera access...</p>
                  </div>
                )}

                {(cameraStatus === 'permission_denied' ||
                  cameraStatus === 'not_found' ||
                  cameraStatus === 'already_in_use' ||
                  cameraStatus === 'insecure_origin' ||
                  cameraStatus === 'model_error') && (
                    <div className="space-y-3 text-red-300 bg-red-950/60 p-4 rounded-xl border border-red-800/60">
                      <AlertTriangle className="w-8 h-8 mx-auto text-red-400" />
                      <h3 className="font-semibold text-sm text-red-200">
                        Camera Unavailable
                      </h3>
                      <p className="text-xs leading-relaxed">{errorMessage}</p>
                    </div>
                  )}
              </div>
            )}
          </div>

          {/* Camera Action Toolbar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
            <div className="flex items-center gap-2">
              {cameraStatus === 'running' ? (
                <button
                  onClick={stopCamera}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                >
                  <CameraOff className="w-4 h-4" />
                  <span>Stop Camera</span>
                </button>
              ) : (
                <button
                  onClick={startCamera}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-medium text-sm flex items-center gap-2 transition-colors shadow-sm"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Camera</span>
                </button>
              )}

              {cameraStatus === 'running' && (
                <>
                  <button
                    onClick={toggleCameraFacing}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-medium flex items-center gap-1.5 transition-colors"
                    title="Switch front/rear camera"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Flip Camera</span>
                  </button>

                  <button
                    onClick={() => setShowLandmarkOverlay((prev) => !prev)}
                    className={`px-3 py-2 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors ${showLandmarkOverlay
                        ? 'bg-slate-100 text-slate-800 border-slate-300'
                        : 'bg-white text-slate-400 border-slate-200'
                      }`}
                    title="Toggle hand skeletal landmarks overlay"
                  >
                    {showLandmarkOverlay ? <Eye className="w-3.5 h-3.5 text-brand-600" /> : <EyeOff className="w-3.5 h-3.5" />}
                    <span className="hidden sm:inline">Skeleton</span>
                  </button>

                  <button
                    onClick={() => setShowDiagnostics((prev) => !prev)}
                    className={`px-3 py-2 rounded-xl border text-sm font-medium flex items-center gap-1.5 transition-colors ${showDiagnostics
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                      }`}
                    title="Toggle live engineering diagnostics and model telemetry"
                  >
                    <Activity className="w-3.5 h-3.5 text-brand-400" />
                    <span>Diagnostics</span>
                  </button>
                </>
              )}
            </div>

            {/* Confidence Threshold Setting */}
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Sliders className="w-3.5 h-3.5 text-slate-400" />
              <span>Min Confidence:</span>
              <input
                type="range"
                min="0.4"
                max="0.9"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-20 accent-brand-600 cursor-pointer"
                title={`Confidence threshold: ${Math.round(threshold * 100)}%`}
              />
              <span className="font-mono text-slate-700 font-semibold w-8">
                {Math.round(threshold * 100)}%
              </span>
            </div>
          </div>
        </div>

        {/* Prediction & Diagnostics Panel */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600" />
                <span>Recognition Output</span>
              </h3>
              {prediction && (
                <button
                  onClick={() => {
                    setPrediction(null);
                    setHistorySaved(false);
                    defaultClassifier.resetTemporalBuffer();
                  }}
                  className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Clear Result</span>
                </button>
              )}
            </div>

            {/* Real Prediction Card */}
            {prediction ? (
              <div className="space-y-4">
                <div
                  className={`p-4 rounded-xl border ${prediction.isRecognized
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : 'bg-amber-50/70 border-amber-200'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs uppercase font-bold tracking-wider text-slate-500 block">
                        Prediction
                      </span>
                      <h4
                        className={`text-2xl font-bold mt-0.5 ${prediction.isRecognized ? 'text-emerald-900' : 'text-amber-900'
                          }`}
                      >
                        {prediction.displayName}
                      </h4>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${prediction.isRecognized
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                          }`}
                      >
                        {prediction.isRecognized ? 'Validated ISL' : 'Below Threshold'}
                      </span>
                      {prediction.isTwoHanded && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                          Two-Hand Sign
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Confidence Bar */}
                  <div className="mt-4 space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-600">Calibrated Probability:</span>
                      <span className="font-mono text-slate-800 font-bold">
                        {(prediction.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${prediction.isRecognized ? 'bg-emerald-600' : 'bg-amber-500'
                          }`}
                        style={{ width: `${Math.min(100, prediction.confidence * 100)}%` }}
                      />
                    </div>
                  </div>

                  {prediction.description && (
                    <p className="mt-3 text-xs text-slate-600 leading-relaxed border-t border-slate-200/60 pt-2.5">
                      {prediction.description}
                    </p>
                  )}
                </div>

                {/* Save to History Button */}
                {prediction.isRecognized && user && (
                  <div>
                    {historySaved ? (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Saved to your personal recognition history.</span>
                      </div>
                    ) : (
                      <button
                        onClick={handleSaveToHistory}
                        className="w-full py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs transition-colors flex items-center justify-center gap-2"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>Record to My Recognition History</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 space-y-2">
                <p className="text-sm">No gesture detected yet.</p>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Start the camera and show a single-hand sign (e.g. Hello, Yes, Numbers 1–5) or a two-hand sign (e.g. Namaste, Help, Doctor).
                </p>
              </div>
            )}

            {/* Live Engineering Diagnostics HUD */}
            {showDiagnostics && (
              <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-3 font-mono text-xs shadow-md">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="flex items-center gap-1.5 font-bold text-slate-300">
                    <Cpu className="w-3.5 h-3.5 text-brand-400" />
                    <span>Live Engineering Diagnostics</span>
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-brand-300 border border-slate-700">
                    {inferenceLatencyMs} ms latency
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400 block text-[10px]">Tracked Hands:</span>
                    <span className="font-semibold text-slate-200">{rawHandednessTag}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Decision Margin:</span>
                    <span className="font-semibold text-slate-200">
                      {((prediction?.margin || 0) * 100).toFixed(1)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Raw Frame Winner:</span>
                    <span className="font-semibold text-amber-300">
                      {prediction?.rawPredictedClass || 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px]">Consensus Winner:</span>
                    <span className="font-semibold text-emerald-300">
                      {prediction?.label || 'None'}
                    </span>
                  </div>
                </div>

                {/* Rejection / Confirmation Reason */}
                <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700/60 text-[11px]">
                  <span className="text-slate-400 block text-[10px]">Status & Policy Reason:</span>
                  <span className={prediction?.isRecognized ? 'text-emerald-400' : 'text-amber-400'}>
                    {prediction?.rejectionReason || 'Waiting for hand detection'}
                  </span>
                </div>

                {/* 5-frame Temporal Buffer Chips */}
                {prediction?.consensusBuffer && (
                  <div>
                    <span className="text-slate-400 block text-[10px] mb-1">
                      Temporal Ring Buffer (5 frames):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {prediction.consensusBuffer.map((c, idx) => (
                        <span
                          key={idx}
                          className={`px-1.5 py-0.5 rounded text-[10px] ${c === 'UNKNOWN'
                              ? 'bg-slate-800 text-slate-400'
                              : 'bg-brand-950 text-brand-300 border border-brand-800'
                            }`}
                        >
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Top 3 Probabilities Distribution */}
                {prediction?.rawProbabilities && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-800">
                    <span className="text-slate-400 block text-[10px]">
                      Top-3 Class Softmax Distribution:
                    </span>
                    {Object.entries(prediction.rawProbabilities)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 3)
                      .map(([cls, prob]) => (
                        <div key={cls} className="space-y-0.5">
                          <div className="flex justify-between text-[10px]">
                            <span className="text-slate-300">{cls}</span>
                            <span className="text-slate-400">{(prob * 100).toFixed(1)}%</span>
                          </div>
                          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-500 rounded-full"
                              style={{ width: `${prob * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}

            {/* Supported Vocabulary Guide */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-xs text-slate-500 leading-relaxed">
              <div className="font-semibold text-slate-700 flex items-center justify-between">
                <span>Supported Two-Hand & Single-Hand Signs</span>
                <span className="text-[11px] font-normal text-brand-600">20 ISLRTC Classes</span>
              </div>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[11px]">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">Two-Hand Signs</span>
                  <span>• Namaste (Greetings)</span><br />
                  <span>• Help (Emergency)</span><br />
                  <span>• Doctor (Medical)</span><br />
                  <span>• Thank You (Courtesy)</span><br />
                  <span>• Please (Polite)</span>
                </div>
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-700 block text-[10px] uppercase">Single-Hand Signs</span>
                  <span>• Hello, Yes, No</span><br />
                  <span>• Good, Bad, Peace</span><br />
                  <span>• Super (OK), I Love You</span><br />
                  <span>• Numbers 1, 2, 3, 4, 5</span><br />
                  <span>• Water (Sipping tilt)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
