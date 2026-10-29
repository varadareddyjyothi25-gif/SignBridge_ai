import React, { useRef, useEffect, useState, useCallback } from 'react';

export interface Hand3DProps {
  signLabel: string;
  progress: number; // 0 to 100
  isTwoHanded?: boolean;
  className?: string;
}

// 3D Point
interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Projected 2D Point with depth
interface ProjectedPoint {
  x: number;
  y: number;
  z: number;
  scale: number;
}

// Renderable 3D Primitive for depth sorting
type RenderItem =
  | {
      type: 'joint';
      z: number;
      p: ProjectedPoint;
      radius: number;
      color: string;
      highlightColor: string;
    }
  | {
      type: 'bone';
      z: number;
      p1: ProjectedPoint;
      p2: ProjectedPoint;
      width: number;
      color: string;
      shadowColor: string;
    }
  | {
      type: 'palm';
      z: number;
      points: ProjectedPoint[];
      fillColor: string;
      strokeColor: string;
    };

// Kinematic joint angles for 5 fingers
export interface FingerAngles {
  // [mcp, pip, dip] flexion (0 = fully extended, 1 = tightly curled)
  bend: [number, number, number];
  spread: number; // lateral spread from finger centerline (radians)
}

export interface HandKinematicPose {
  wristPos: Point3D;
  wristRot: [number, number, number]; // [pitch, yaw, roll] in radians
  thumb: { bend: [number, number, number]; abduction: number };
  index: FingerAngles;
  middle: FingerAngles;
  ring: FingerAngles;
  pinky: FingerAngles;
}

// 3D forward kinematics hand generator
function computeHandLandmarks(pose: HandKinematicPose, isLeft = false): Point3D[] {
  const points: Point3D[] = new Array(21);
  const handSign = isLeft ? -1 : 1;

  // Euler angles rotation matrix
  const [pitch, yaw, roll] = pose.wristRot;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cr = Math.cos(roll);
  const sr = Math.sin(roll);

  // Rotation R = Rz(roll) * Ry(yaw) * Rx(pitch)
  function rotatePoint(p: Point3D): Point3D {
    // Rx
    const y1 = p.y * cp - p.z * sp;
    const z1 = p.y * sp + p.z * cp;
    // Ry
    const x2 = p.x * cy + z1 * sy;
    const z2 = -p.x * sy + z1 * cy;
    // Rz
    const x3 = x2 * cr - y1 * sr;
    const y3 = x2 * sr + y1 * cr;

    return {
      x: x3 + pose.wristPos.x,
      y: y3 + pose.wristPos.y,
      z: z2 + pose.wristPos.z,
    };
  }

  // 0: Wrist
  points[0] = rotatePoint({ x: 0, y: 0, z: 0 });

  // Palm base MCPs relative to wrist in local coordinates
  // Hand anatomical layout:
  // Thumb CMC: (-16, -14, 6)
  // Index MCP: (-12, -42, 0)
  // Middle MCP: (0, -46, 0)
  // Ring MCP: (12, -42, 0)
  // Pinky MCP: (22, -36, 0)
  const mcpLocal = [
    { x: -16 * handSign, y: -14, z: 6 }, // Thumb CMC (1)
    { x: -12 * handSign, y: -42, z: 0 }, // Index MCP (5)
    { x: 0, y: -46, z: 0 },              // Middle MCP (9)
    { x: 12 * handSign, y: -42, z: 0 },  // Ring MCP (13)
    { x: 22 * handSign, y: -36, z: 0 },  // Pinky MCP (17)
  ];

  // 1: Thumb CMC
  points[1] = rotatePoint(mcpLocal[0]);

  // Thumb segments: 1 -> 2 (MCP) -> 3 (IP) -> 4 (Tip)
  const tAbd = pose.thumb.abduction * handSign;
  const [t1, t2, t3] = pose.thumb.bend;
  // Thumb angles
  const tDir1 = {
    x: -Math.cos(tAbd) * 16 * handSign,
    y: -Math.sin(tAbd) * 16 - t1 * 6,
    z: 10 + t1 * 12,
  };
  points[2] = rotatePoint({
    x: mcpLocal[0].x + tDir1.x,
    y: mcpLocal[0].y + tDir1.y,
    z: mcpLocal[0].z + tDir1.z,
  });

  const tDir2 = {
    x: tDir1.x * 0.85,
    y: tDir1.y * 0.85 - t2 * 8,
    z: tDir1.z * 0.85 + t2 * 10,
  };
  points[3] = rotatePoint({
    x: points[2].x - pose.wristPos.x + tDir2.x * 0.7,
    y: points[2].y - pose.wristPos.y + tDir2.y * 0.7,
    z: points[2].z - pose.wristPos.z + tDir2.z * 0.7,
  });

  points[4] = rotatePoint({
    x: points[3].x - pose.wristPos.x + tDir2.x * 0.6 - t3 * 4 * handSign,
    y: points[3].y - pose.wristPos.y + tDir2.y * 0.6 - t3 * 6,
    z: points[3].z - pose.wristPos.z + tDir2.z * 0.6 + t3 * 8,
  });

  // Helper to compute 3 phalanx bones for standard finger (MCP -> PIP -> DIP -> Tip)
  function computeFinger(
    startIndex: number,
    mcpIndex: number,
    angles: FingerAngles,
    lens: [number, number, number]
  ) {
    const baseMcp = mcpLocal[mcpIndex];
    points[startIndex] = rotatePoint(baseMcp);

    const [b1, b2, b3] = angles.bend;
    const spread = angles.spread * handSign;

    // Angle of phalanx segments curving inward on flexion
    const phi1 = -Math.PI / 2 + b1 * (Math.PI * 0.55);
    const seg1 = {
      x: baseMcp.x + Math.sin(spread) * lens[0],
      y: baseMcp.y + Math.sin(phi1) * lens[0] * Math.cos(spread),
      z: baseMcp.z + Math.cos(phi1) * lens[0] * (b1 > 0.1 ? 1 : 0.2),
    };
    points[startIndex + 1] = rotatePoint(seg1);

    const phi2 = phi1 + b2 * (Math.PI * 0.5);
    const seg2 = {
      x: seg1.x + Math.sin(spread) * lens[1],
      y: seg1.y + Math.sin(phi2) * lens[1],
      z: seg1.z + Math.cos(phi2) * lens[1] * (b2 > 0.1 ? 1 : 0.2),
    };
    points[startIndex + 2] = rotatePoint(seg2);

    const phi3 = phi2 + b3 * (Math.PI * 0.45);
    const seg3 = {
      x: seg2.x + Math.sin(spread) * lens[2],
      y: seg2.y + Math.sin(phi3) * lens[2],
      z: seg2.z + Math.cos(phi3) * lens[2] * (b3 > 0.1 ? 1 : 0.2),
    };
    points[startIndex + 3] = rotatePoint(seg3);
  }

  // Index (5, 6, 7, 8)
  computeFinger(5, 1, pose.index, [24, 16, 12]);
  // Middle (9, 10, 11, 12)
  computeFinger(9, 2, pose.middle, [26, 18, 14]);
  // Ring (13, 14, 15, 16)
  computeFinger(13, 3, pose.ring, [24, 16, 12]);
  // Pinky (17, 18, 19, 20)
  computeFinger(17, 4, pose.pinky, [18, 12, 10]);

  return points;
}

// Smooth cosine easing
function easeInOut(t: number): number {
  return 0.5 * (1 - Math.cos(t * Math.PI));
}

// Generate anatomically authentic kinematic poses for all 19 ISL signs
export function getSignKinematics(signLabel: string, progress: number): { dominant: HandKinematicPose; secondary?: HandKinematicPose } {
  const normT = (progress % 100) / 100;
  const eased = easeInOut(normT);
  const osc = Math.sin(normT * Math.PI * 2);
  const osc2 = Math.sin(normT * Math.PI * 4);

  // Baseline relaxed open hand
  const openFingers: FingerAngles = { bend: [0.05, 0.05, 0.05], spread: 0 };
  const curledFingers: FingerAngles = { bend: [0.95, 0.95, 0.9], spread: 0 };

  const label = signLabel.toUpperCase().trim();

  switch (label) {
    case 'NAMASTE': {
      // Coordinated two-hand reverence: both palms pressed together vertically at chest
      const bow = osc * 0.08;
      const dominant: HandKinematicPose = {
        wristPos: { x: 14, y: 20 + osc * 4, z: 0 },
        wristRot: [bow, -0.65, 0.05],
        thumb: { bend: [0.2, 0.2, 0.2], abduction: 0.1 },
        index: { bend: [0, 0, 0], spread: -0.02 },
        middle: { bend: [0, 0, 0], spread: 0 },
        ring: { bend: [0, 0, 0], spread: 0.02 },
        pinky: { bend: [0, 0, 0], spread: 0.04 },
      };
      const secondary: HandKinematicPose = {
        wristPos: { x: -14, y: 20 + osc * 4, z: 0 },
        wristRot: [bow, 0.65, -0.05],
        thumb: { bend: [0.2, 0.2, 0.2], abduction: 0.1 },
        index: { bend: [0, 0, 0], spread: -0.02 },
        middle: { bend: [0, 0, 0], spread: 0 },
        ring: { bend: [0, 0, 0], spread: 0.02 },
        pinky: { bend: [0, 0, 0], spread: 0.04 },
      };
      return { dominant, secondary };
    }

    case 'HELP': {
      // Non-dominant hand flat horizontal tray, dominant thumbs-up fist lifts upward together
      const liftY = 35 - eased * 24;
      const secondary: HandKinematicPose = {
        wristPos: { x: 0, y: liftY + 28, z: 0 },
        wristRot: [-1.45, 0, 0], // flat palm up
        thumb: { bend: [0.1, 0.1, 0.1], abduction: 0.4 },
        index: { bend: [0.05, 0.05, 0.05], spread: 0.05 },
        middle: { bend: [0.05, 0.05, 0.05], spread: 0 },
        ring: { bend: [0.05, 0.05, 0.05], spread: -0.05 },
        pinky: { bend: [0.05, 0.05, 0.05], spread: -0.1 },
      };
      const dominant: HandKinematicPose = {
        wristPos: { x: 0, y: liftY, z: -4 },
        wristRot: [0, 0, 0], // upright thumbs up fist resting on palm
        thumb: { bend: [0, 0, 0], abduction: 0.8 },
        index: curledFingers,
        middle: curledFingers,
        ring: curledFingers,
        pinky: curledFingers,
      };
      return { dominant, secondary };
    }

    case 'DOCTOR': {
      // Non-dominant wrist horizontal; dominant index & middle fingertips tap radial pulse twice
      const tapDist = Math.abs(osc2) * 14;
      const secondary: HandKinematicPose = {
        wristPos: { x: -25, y: 25, z: 0 },
        wristRot: [-1.3, -0.3, 0], // horizontal wrist extended
        thumb: { bend: [0.2, 0.2, 0.2], abduction: 0.3 },
        index: openFingers,
        middle: openFingers,
        ring: openFingers,
        pinky: openFingers,
      };
      const dominant: HandKinematicPose = {
        wristPos: { x: -20, y: 12 - tapDist, z: 12 },
        wristRot: [0.6, 0.3, 0],
        thumb: { bend: [0.8, 0.8, 0.8], abduction: 0.2 },
        index: { bend: [0.15, 0.1, 0.05], spread: -0.04 },
        middle: { bend: [0.15, 0.1, 0.05], spread: 0.04 },
        ring: curledFingers,
        pinky: curledFingers,
      };
      return { dominant, secondary };
    }

    case 'HELLO': {
      // Open hand waving side-to-side at shoulder level
      const waveRoll = osc * 0.28;
      const waveX = 25 + osc * 8;
      return {
        dominant: {
          wristPos: { x: waveX, y: -5, z: 0 },
          wristRot: [0, 0, waveRoll],
          thumb: { bend: [0.05, 0.05, 0.05], abduction: 0.6 },
          index: { bend: [0, 0, 0], spread: 0.1 },
          middle: { bend: [0, 0, 0], spread: 0.02 },
          ring: { bend: [0, 0, 0], spread: -0.06 },
          pinky: { bend: [0, 0, 0], spread: -0.14 },
        },
      };
    }

    case 'YES': {
      // Upright fist nodding forward and back twice
      const nodPitch = 0.2 + osc2 * 0.32;
      return {
        dominant: {
          wristPos: { x: 0, y: 15, z: 0 },
          wristRot: [nodPitch, 0, 0],
          thumb: { bend: [0.8, 0.8, 0.8], abduction: 0.1 },
          index: curledFingers,
          middle: curledFingers,
          ring: curledFingers,
          pinky: curledFingers,
        },
      };
    }

    case 'NO': {
      // Index & middle snap down against thumb twice while wrist shakes
      const snapBend = 0.15 + (1 - Math.abs(osc2)) * 0.7;
      const shakeYaw = osc * 0.2;
      return {
        dominant: {
          wristPos: { x: 0, y: 10, z: 0 },
          wristRot: [0, shakeYaw, 0],
          thumb: { bend: [0.4, 0.4, 0.4], abduction: 0.4 },
          index: { bend: [snapBend, snapBend * 0.8, snapBend * 0.6], spread: -0.03 },
          middle: { bend: [snapBend, snapBend * 0.8, snapBend * 0.6], spread: 0.03 },
          ring: curledFingers,
          pinky: curledFingers,
        },
      };
    }

    case 'GOOD': {
      // High-held thumbs up with gentle affirmative lift
      return {
        dominant: {
          wristPos: { x: 0, y: 15 - osc * 6, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0, 0, 0], abduction: 0.9 },
          index: curledFingers,
          middle: curledFingers,
          ring: curledFingers,
          pinky: curledFingers,
        },
      };
    }

    case 'BAD': {
      // Thumbs down with downward drop
      return {
        dominant: {
          wristPos: { x: 0, y: 25 + osc * 6, z: 0 },
          wristRot: [0, 0, Math.PI], // inverted thumb
          thumb: { bend: [0, 0, 0], abduction: 0.9 },
          index: curledFingers,
          middle: curledFingers,
          ring: curledFingers,
          pinky: curledFingers,
        },
      };
    }

    case 'PEACE': {
      // V-sign with index & middle spread wide
      return {
        dominant: {
          wristPos: { x: 0, y: 10, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0.8, 0.8, 0.8], abduction: 0.2 },
          index: { bend: [0, 0, 0], spread: 0.22 },
          middle: { bend: [0, 0, 0], spread: -0.22 },
          ring: curledFingers,
          pinky: curledFingers,
        },
      };
    }

    case 'SUPER': {
      // Thumb and index pads touch forming circle; middle, ring, pinky extended
      return {
        dominant: {
          wristPos: { x: 0, y: 10, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0.45, 0.45, 0.4], abduction: 0.45 },
          index: { bend: [0.5, 0.5, 0.45], spread: 0 },
          middle: { bend: [0, 0, 0], spread: 0.06 },
          ring: { bend: [0, 0, 0], spread: 0.12 },
          pinky: { bend: [0, 0, 0], spread: 0.18 },
        },
      };
    }

    case 'I_LOVE_YOU': {
      // Thumb, index, pinky extended upright; middle and ring curled
      return {
        dominant: {
          wristPos: { x: 0, y: 10, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0, 0, 0], abduction: 0.85 },
          index: { bend: [0, 0, 0], spread: 0.08 },
          middle: curledFingers,
          ring: curledFingers,
          pinky: { bend: [0, 0, 0], spread: -0.16 },
        },
      };
    }

    case 'NUMBER_1': {
      return {
        dominant: {
          wristPos: { x: 0, y: 15, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0.8, 0.8, 0.8], abduction: 0.1 },
          index: { bend: [0, 0, 0], spread: 0 },
          middle: curledFingers,
          ring: curledFingers,
          pinky: curledFingers,
        },
      };
    }

    case 'NUMBER_2': {
      return {
        dominant: {
          wristPos: { x: 0, y: 15, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0.8, 0.8, 0.8], abduction: 0.1 },
          index: { bend: [0, 0, 0], spread: 0.04 },
          middle: { bend: [0, 0, 0], spread: -0.04 },
          ring: curledFingers,
          pinky: curledFingers,
        },
      };
    }

    case 'NUMBER_3': {
      return {
        dominant: {
          wristPos: { x: 0, y: 15, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0, 0, 0], abduction: 0.7 },
          index: { bend: [0, 0, 0], spread: 0.04 },
          middle: { bend: [0, 0, 0], spread: -0.04 },
          ring: curledFingers,
          pinky: curledFingers,
        },
      };
    }

    case 'NUMBER_4': {
      return {
        dominant: {
          wristPos: { x: 0, y: 15, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0.9, 0.9, 0.9], abduction: 0 },
          index: { bend: [0, 0, 0], spread: 0.08 },
          middle: { bend: [0, 0, 0], spread: 0.02 },
          ring: { bend: [0, 0, 0], spread: -0.04 },
          pinky: { bend: [0, 0, 0], spread: -0.1 },
        },
      };
    }

    case 'NUMBER_5': {
      return {
        dominant: {
          wristPos: { x: 0, y: 15, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0, 0, 0], abduction: 0.8 },
          index: { bend: [0, 0, 0], spread: 0.14 },
          middle: { bend: [0, 0, 0], spread: 0.04 },
          ring: { bend: [0, 0, 0], spread: -0.06 },
          pinky: { bend: [0, 0, 0], spread: -0.16 },
        },
      };
    }

    case 'WATER': {
      // Cupped hand tilting toward lips twice
      const sipAngle = 0.2 + osc2 * 0.35;
      return {
        dominant: {
          wristPos: { x: 10, y: -5 + osc2 * 8, z: 0 },
          wristRot: [sipAngle, -0.2, 0],
          thumb: { bend: [0.35, 0.35, 0.35], abduction: 0.4 },
          index: { bend: [0.4, 0.35, 0.3], spread: 0.04 },
          middle: { bend: [0.4, 0.35, 0.3], spread: 0.01 },
          ring: { bend: [0.4, 0.35, 0.3], spread: -0.02 },
          pinky: { bend: [0.4, 0.35, 0.3], spread: -0.06 },
        },
      };
    }

    case 'THANK_YOU': {
      // Flat hand starts at chin and sweeps forward towards conversational partner
      const forwardT = eased;
      const reachZ = -forwardT * 40;
      const reachY = -10 + forwardT * 25;
      return {
        dominant: {
          wristPos: { x: 0, y: reachY, z: reachZ },
          wristRot: [-0.4 - forwardT * 0.4, 0, 0],
          thumb: { bend: [0.1, 0.1, 0.1], abduction: 0.2 },
          index: { bend: [0, 0, 0], spread: 0.02 },
          middle: { bend: [0, 0, 0], spread: 0 },
          ring: { bend: [0, 0, 0], spread: -0.02 },
          pinky: { bend: [0, 0, 0], spread: -0.04 },
        },
      };
    }

    case 'PLEASE': {
      // Flat palm rubs chest in gentle clockwise circle
      const circleX = Math.cos(normT * Math.PI * 2) * 14;
      const circleY = 15 + Math.sin(normT * Math.PI * 2) * 14;
      return {
        dominant: {
          wristPos: { x: circleX, y: circleY, z: -5 },
          wristRot: [-0.1, 0, 0],
          thumb: { bend: [0.1, 0.1, 0.1], abduction: 0.2 },
          index: openFingers,
          middle: openFingers,
          ring: openFingers,
          pinky: openFingers,
        },
      };
    }

    default: {
      // Generic open hand
      return {
        dominant: {
          wristPos: { x: 0, y: 15, z: 0 },
          wristRot: [0, 0, 0],
          thumb: { bend: [0.05, 0.05, 0.05], abduction: 0.5 },
          index: openFingers,
          middle: openFingers,
          ring: openFingers,
          pinky: openFingers,
        },
      };
    }
  }
}

export const RealisticHand3D: React.FC<Hand3DProps> = ({
  signLabel,
  progress,
  isTwoHanded = false,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // User Orbit controls state
  const [viewAngle, setViewAngle] = useState<'perspective' | 'front' | 'side'>('perspective');
  const [orbitRot, setOrbitRot] = useState<{ yaw: number; pitch: number }>({
    yaw: 0.4,   // ~23 degrees angled
    pitch: 0.15 // ~9 degrees tilt
  });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; yaw: number; pitch: number }>({
    x: 0,
    y: 0,
    yaw: 0.4,
    pitch: 0.15,
  });

  // Handle angle presets
  const handleAngleSelect = (mode: 'perspective' | 'front' | 'side') => {
    setViewAngle(mode);
    if (mode === 'front') {
      setOrbitRot({ yaw: 0, pitch: 0 });
    } else if (mode === 'perspective') {
      setOrbitRot({ yaw: 0.42, pitch: 0.18 });
    } else if (mode === 'side') {
      setOrbitRot({ yaw: 1.15, pitch: 0.1 });
    }
  };

  // Mouse / Touch orbit drag handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      yaw: orbitRot.yaw,
      pitch: orbitRot.pitch,
    };
  };

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isDragging) return;
      const dx = (e.clientX - dragStartRef.current.x) * 0.01;
      const dy = (e.clientY - dragStartRef.current.y) * 0.01;
      setOrbitRot({
        yaw: dragStartRef.current.yaw + dx,
        pitch: Math.max(-0.6, Math.min(0.6, dragStartRef.current.pitch + dy)),
      });
    },
    [isDragging]
  );

  const handleMouseUp = () => setIsDragging(false);

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      dragStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        yaw: orbitRot.yaw,
        pitch: orbitRot.pitch,
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDragging || e.touches.length !== 1) return;
    const dx = (e.touches[0].clientX - dragStartRef.current.x) * 0.01;
    const dy = (e.touches[0].clientY - dragStartRef.current.y) * 0.01;
    setOrbitRot({
      yaw: dragStartRef.current.yaw + dx,
      pitch: Math.max(-0.6, Math.min(0.6, dragStartRef.current.pitch + dy)),
    });
  };

  const handleTouchEnd = () => setIsDragging(false);

  // Main Canvas 3D render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle high-DPI scaling
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth || 320;
    const height = canvas.clientHeight || 260;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Camera 3D perspective setup
    const cx = width / 2;
    const cy = height / 2 + 15;
    const cameraDist = 320;
    const focalLength = 300;

    // Scene orbit rotation matrix
    const cyaw = Math.cos(orbitRot.yaw);
    const syaw = Math.sin(orbitRot.yaw);
    const cpitch = Math.cos(orbitRot.pitch);
    const spitch = Math.sin(orbitRot.pitch);

    function project3D(p: Point3D): ProjectedPoint {
      // Orbit Yaw (Y axis)
      const x1 = p.x * cyaw + p.z * syaw;
      const z1 = -p.x * syaw + p.z * cyaw;
      // Orbit Pitch (X axis)
      const y2 = p.y * cpitch - z1 * spitch;
      const z2 = p.y * spitch + z1 * cpitch;

      const zFinal = z2 + cameraDist;
      const scale = focalLength / Math.max(zFinal, 60);

      return {
        x: cx + x1 * scale,
        y: cy + y2 * scale,
        z: zFinal,
        scale,
      };
    }

    // Get current hand kinematic poses
    const poses = getSignKinematics(signLabel, progress);
    const dominantLandmarks = computeHandLandmarks(poses.dominant, false);
    const secondaryLandmarks =
      poses.secondary || isTwoHanded
        ? computeHandLandmarks(poses.secondary || poses.dominant, true)
        : null;

    // Collect all renderable items for unified 3D depth sorting
    const renderQueue: RenderItem[] = [];

    // Helper to add hand bones, joints and palm
    function addHandToQueue(
      landmarks: Point3D[],
      colorTheme: 'dominant' | 'secondary'
    ) {
      const proj = landmarks.map(project3D);

      const boneColor =
        colorTheme === 'dominant'
          ? '#e0a96d' // Warm realistic skin
          : '#c99661'; // Secondary hand tone
      const boneShadow =
        colorTheme === 'dominant' ? '#b47b42' : '#996332';
      const jointColor =
        colorTheme === 'dominant' ? '#f4c28d' : '#dfaf7b';
      const jointHighlight = '#fff2df';

      // 1. Palm polygon
      const palmIndices = [0, 1, 5, 9, 13, 17];
      const palmZ =
        palmIndices.reduce((acc, idx) => acc + proj[idx].z, 0) /
        palmIndices.length;
      renderQueue.push({
        type: 'palm',
        z: palmZ + 2, // Slight bias so fingers sit naturally atop palm
        points: palmIndices.map((i) => proj[i]),
        fillColor: boneColor,
        strokeColor: boneShadow,
      });

      // 2. Bones (Skeletal phalanxes)
      const boneConnections = [
        // Thumb
        [0, 1], [1, 2], [2, 3], [3, 4],
        // Index
        [0, 5], [5, 6], [6, 7], [7, 8],
        // Middle
        [0, 9], [9, 10], [10, 11], [11, 12],
        // Ring
        [0, 13], [13, 14], [14, 15], [15, 16],
        // Pinky
        [0, 17], [17, 18], [18, 19], [19, 20],
        // Palm arches
        [5, 9], [9, 13], [13, 17],
      ];

      for (const [i1, i2] of boneConnections) {
        const p1 = proj[i1];
        const p2 = proj[i2];
        const midZ = (p1.z + p2.z) / 2;
        const width =
          i1 === 0 || i2 === 0
            ? 12
            : [4, 8, 12, 16, 20].includes(i2)
            ? 7
            : 9;

        renderQueue.push({
          type: 'bone',
          z: midZ,
          p1,
          p2,
          width,
          color: boneColor,
          shadowColor: boneShadow,
        });
      }

      // 3. Knuckle joints and fingertips
      for (let i = 0; i < proj.length; i++) {
        const p = proj[i];
        const isFingertip = [4, 8, 12, 16, 20].includes(i);
        const radius = i === 0 ? 9 : isFingertip ? 5.5 : 6;

        renderQueue.push({
          type: 'joint',
          z: p.z,
          p,
          radius,
          color: isFingertip ? '#e8a573' : jointColor,
          highlightColor: jointHighlight,
        });
      }
    }

    addHandToQueue(dominantLandmarks, 'dominant');
    if (secondaryLandmarks) {
      addHandToQueue(secondaryLandmarks, 'secondary');
    }

    // Depth Sorting: Painter's algorithm from furthest (highest z) to closest (lowest z)
    renderQueue.sort((a, b) => b.z - a.z);

    // Draw coordinate subtle ground shadow
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, height - 24, 75, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(15, 23, 42, 0.07)';
    ctx.fill();
    ctx.restore();

    // Render sorted elements
    for (const item of renderQueue) {
      if (item.type === 'palm') {
        ctx.save();
        ctx.beginPath();
        item.points.forEach((pt, idx) => {
          if (idx === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.closePath();

        // Shaded palm gradient
        const grad = ctx.createLinearGradient(
          item.points[0].x,
          item.points[0].y,
          item.points[2].x,
          item.points[2].y
        );
        grad.addColorStop(0, item.strokeColor);
        grad.addColorStop(1, item.fillColor);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = item.strokeColor;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.stroke();
        ctx.restore();
      } else if (item.type === 'bone') {
        ctx.save();
        const thickness = item.width * item.p1.scale * 0.95;

        // Draw bone capsule
        ctx.beginPath();
        ctx.moveTo(item.p1.x, item.p1.y);
        ctx.lineTo(item.p2.x, item.p2.y);
        ctx.lineCap = 'round';
        ctx.strokeStyle = item.color;
        ctx.lineWidth = Math.max(3, thickness);
        ctx.stroke();

        // Subtle specular highlight line along bone
        ctx.beginPath();
        ctx.moveTo(item.p1.x - 1, item.p1.y - 1);
        ctx.lineTo(item.p2.x - 1, item.p2.y - 1);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = Math.max(1, thickness * 0.3);
        ctx.stroke();
        ctx.restore();
      } else if (item.type === 'joint') {
        ctx.save();
        const r = Math.max(2, item.radius * item.p.scale);

        // Spherical anatomical shading
        const radialGrad = ctx.createRadialGradient(
          item.p.x - r * 0.35,
          item.p.y - r * 0.35,
          r * 0.1,
          item.p.x,
          item.p.y,
          r
        );
        radialGrad.addColorStop(0, item.highlightColor);
        radialGrad.addColorStop(0.6, item.color);
        radialGrad.addColorStop(1, '#945b2b');

        ctx.beginPath();
        ctx.arc(item.p.x, item.p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = radialGrad;
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }, [signLabel, progress, isTwoHanded, orbitRot]);

  return (
    <div className={`relative flex flex-col items-center select-none ${className}`}>
      {/* 3D Canvas Canvas Area */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="w-full h-64 cursor-grab active:cursor-grabbing rounded-xl bg-gradient-to-b from-slate-900/5 to-slate-900/15 border border-slate-200/60 shadow-inner"
        aria-label={`Realistic 3D hand animation for ${signLabel}`}
      />

      {/* Orbit Interaction & Perspective Controls Bar */}
      <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-slate-200/80 shadow-xs text-xs">
        <button
          onClick={() => handleAngleSelect('front')}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            viewAngle === 'front'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Front camera angle"
        >
          Front
        </button>
        <button
          onClick={() => handleAngleSelect('perspective')}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            viewAngle === 'perspective'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="3D perspective view"
        >
          3D Angle
        </button>
        <button
          onClick={() => handleAngleSelect('side')}
          className={`px-2 py-0.5 rounded font-medium transition-colors ${
            viewAngle === 'side'
              ? 'bg-brand-600 text-white'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="Side profile view"
        >
          Side
        </button>
      </div>

      {/* Drag Hint */}
      <div className="absolute bottom-2 left-3 text-[10px] text-slate-500 bg-white/80 backdrop-blur-xs px-2 py-0.5 rounded-md pointer-events-none border border-slate-200/50">
        Click & drag to rotate 3D view
      </div>
    </div>
  );
};
