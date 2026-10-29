import React, { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw, ShieldCheck, Info } from 'lucide-react';
import type { ISLSignEntry } from '../ml/dictionaryData';

interface SignVisualizerProps {
  entry: ISLSignEntry;
  onCompleted?: () => void;
}

export const SignVisualizer: React.FC<SignVisualizerProps> = ({ entry, onCompleted }) => {
  const [isPlaying, setIsPlaying] = useState(true);
  const [speed, setSpeed] = useState<number>(1);
  const [progress, setProgress] = useState<number>(0);

  // Playback timer loop
  useEffect(() => {
    if (!isPlaying) return;

    const intervalTime = Math.max(30, 50 / speed);
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + 1.5;
        if (next >= 100) {
          if (onCompleted) onCompleted();
          return 0; // loop
        }
        return next;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isPlaying, speed, onCompleted]);

  // Derive active step directly during render without extra setState
  const activeStep =
    entry.stepInstructions.length > 0
      ? Math.min(
          entry.stepInstructions.length - 1,
          Math.floor((progress / 100) * entry.stepInstructions.length)
        )
      : 0;

  const handleRestart = () => {
    setProgress(0);
    setIsPlaying(true);
  };

  // Render hand gesture illustration SVG dynamically based on visual type
  const renderGestureGraphic = () => {
    // Phase calculation: 0 to 1
    const t = (progress % 100) / 100;
    const osc = Math.sin(t * Math.PI * 2);

    switch (entry.svgVisualType) {
      case 'namaste':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="ISL Namaste gesture illustration">
            <defs>
              <linearGradient id="skin" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde047" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
            </defs>
            {/* Gentle vertical pulsing */}
            <g transform={`translate(100, ${100 + osc * 5})`}>
              {/* Left Hand */}
              <path
                d="M -6 50 L -6 -35 Q -6 -50 -1 -48 L -1 50 Z"
                fill="url(#skin)"
                stroke="#d97706"
                strokeWidth="2"
              />
              {/* Right Hand */}
              <path
                d="M 6 50 L 6 -35 Q 6 -50 1 -48 L 1 50 Z"
                fill="url(#skin)"
                stroke="#d97706"
                strokeWidth="2"
              />
              {/* Thumbs resting */}
              <ellipse cx="-12" cy="15" rx="5" ry="12" fill="url(#skin)" stroke="#d97706" strokeWidth="2" />
              <ellipse cx="12" cy="15" rx="5" ry="12" fill="url(#skin)" stroke="#d97706" strokeWidth="2" />
              {/* Reverence motion aura */}
              <circle cx="0" cy="-60" r={15 + Math.abs(osc) * 5} fill="none" stroke="#6366f1" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            </g>
          </svg>
        );

      case 'hello':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="ISL Hello wave gesture illustration">
            <g transform={`translate(100, 110) rotate(${osc * 15}) translate(-100, -110)`}>
              {/* Palm */}
              <rect x="75" y="80" width="50" height="55" rx="10" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              {/* 4 Fingers */}
              <rect x="75" y="30" width="10" height="52" rx="5" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              <rect x="88" y="24" width="10" height="58" rx="5" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              <rect x="101" y="27" width="10" height="55" rx="5" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              <rect x="114" y="38" width="10" height="44" rx="5" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              {/* Thumb */}
              <path d="M 75 95 Q 55 90 58 75 Q 68 70 75 85 Z" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              {/* Wave ripples */}
              <path d="M 50 35 Q 40 50 50 65" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity={osc > 0 ? 0.8 : 0.2} />
              <path d="M 150 35 Q 160 50 150 65" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" opacity={osc < 0 ? 0.8 : 0.2} />
            </g>
          </svg>
        );

      case 'yes':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="ISL Yes nod gesture illustration">
            <g transform={`translate(100, ${100 + osc * 12})`}>
              {/* Fist */}
              <rect x="-25" y="-20" width="50" height="50" rx="12" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              {/* Curled fingers segments */}
              <line x1="-20" y1="-5" x2="15" y2="-5" stroke="#d97706" strokeWidth="2" />
              <line x1="-20" y1="10" x2="15" y2="10" stroke="#d97706" strokeWidth="2" />
              {/* Thumb over fist */}
              <path d="M -30 10 Q -32 -10 -15 -15 Q -5 -15 -10 5 Z" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              {/* Nodding arrows */}
              <path d="M 35 -15 L 35 15 M 30 10 L 35 15 L 40 10" fill="none" stroke="#255ee7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        );

      case 'no':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="ISL No gesture illustration">
            <g transform={`translate(100, 100)`}>
              {/* Palm base */}
              <rect x="-25" y="0" width="50" height="40" rx="8" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              {/* Index & Middle snapping */}
              <g transform={`rotate(${osc * 10}, 0, 0)`}>
                <rect x="-15" y="-55" width="12" height="55" rx="6" fill="#fde047" stroke="#d97706" strokeWidth="2" />
                <rect x="3" y="-53" width="12" height="53" rx="6" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              </g>
              {/* Lateral negation indicators */}
              <path d="M -45 -30 L -35 -30 M -45 -30 L -40 -35 M -45 -30 L -40 -25" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
              <path d="M 45 -30 L 35 -30 M 45 -30 L 40 -35 M 45 -30 L 40 -25" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
        );

      case 'thank_you':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="ISL Thank You gesture illustration">
            {/* Head profile marker */}
            <circle cx="65" cy="70" r="24" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1.5" />
            <path d="M 85 75 Q 90 85 80 90" stroke="#94a3b8" strokeWidth="1.5" fill="none" />
            {/* Hand moving forward from chin */}
            <g transform={`translate(${85 + t * 45}, ${95 + t * 15})`}>
              <polygon points="0,0 35,-15 40,-5 5,10" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              <line x1="5" y1="5" x2="38" y2="-10" stroke="#d97706" strokeWidth="1.5" />
            </g>
            {/* Motion trail */}
            <path d="M 85 95 Q 110 100 130 110" fill="none" stroke="#255ee7" strokeWidth="2" strokeDasharray="4 4" />
          </svg>
        );

      case 'good':
      case 'help':
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="ISL Thumbs-up gesture illustration">
            <g transform="translate(100, 105)">
              {/* Supporting base if Help */}
              {entry.svgVisualType === 'help' && (
                <rect x="-40" y="32" width="80" height="18" rx="6" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              )}
              {/* Thumbs-up Fist */}
              <rect x="-25" y="-10" width="50" height="42" rx="10" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              {/* Thumb pointing up */}
              <rect x="-22" y="-55" width="16" height="50" rx="8" fill="#fde047" stroke="#d97706" strokeWidth="2" />
              {/* Upward motion glow */}
              <path d="M 0 -60 L 0 -75 M -6 -68 L 0 -75 L 6 -68" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </g>
          </svg>
        );

      default:
        // Generic canonical hand pose with landmark skeleton
        return (
          <svg viewBox="0 0 200 200" className="w-full h-full" aria-label="Hand landmark illustration">
            <g transform="translate(100, 100)">
              {/* Palm */}
              <circle cx="0" cy="15" r="28" fill="#fef08a" stroke="#d97706" strokeWidth="2" />
              {/* Fingers */}
              <line x1="-18" y1="-5" x2="-22" y2="-45" stroke="#255ee7" strokeWidth="4" strokeLinecap="round" />
              <line x1="-6" y1="-10" x2="-7" y2="-55" stroke="#255ee7" strokeWidth="4" strokeLinecap="round" />
              <line x1="6" y1="-10" x2="8" y2="-52" stroke="#255ee7" strokeWidth="4" strokeLinecap="round" />
              <line x1="18" y1="-5" x2="22" y2="-40" stroke="#255ee7" strokeWidth="4" strokeLinecap="round" />
              <line x1="-22" y1="15" x2="-40" y2="0" stroke="#255ee7" strokeWidth="4" strokeLinecap="round" />
              {/* Joint markers */}
              {[-45, -55, -52, -40].map((y, i) => (
                <circle key={i} cx={-22 + i * 14} cy={y} r="4" fill="#10b981" />
              ))}
              <circle cx="0" cy="40" r="5" fill="#ef4444" />
            </g>
          </svg>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header with Title and Provenance Badge */}
      <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/60">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-slate-900">{entry.englishPhrase}</h3>
            {entry.hindiPhrase && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                {entry.hindiPhrase}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{entry.category} • {entry.twoHanded ? 'Two-Handed' : 'Single Hand'}</p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Validated ISL</span>
        </div>
      </div>

      {/* Visual Canvas Area */}
      <div className="relative bg-gradient-to-b from-slate-900/5 to-slate-900/10 p-6 flex items-center justify-center min-h-[220px]">
        <div className="w-52 h-52 relative drop-shadow-md">
          {renderGestureGraphic()}
        </div>

        {/* Progress tracker bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-slate-200">
          <div
            className="h-full bg-brand-600 transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Playback Controls */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded-lg bg-brand-50 hover:bg-brand-100 text-brand-700 font-medium text-sm flex items-center gap-1.5 transition-colors"
            aria-label={isPlaying ? 'Pause animation' : 'Play animation'}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            <span>{isPlaying ? 'Pause' : 'Play'}</span>
          </button>

          <button
            onClick={handleRestart}
            className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium transition-colors"
            aria-label="Restart animation"
            title="Restart"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Speed Selector */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 mr-1">Speed:</span>
          {[0.5, 0.75, 1, 1.25].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-2 py-1 rounded font-medium transition-colors ${
                speed === s
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* Step-by-Step Instructions */}
      <div className="p-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
          Step-by-Step Execution
        </h4>
        <div className="space-y-2.5">
          {entry.stepInstructions.map((step, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-xl border text-sm transition-all ${
                activeStep === idx
                  ? 'border-brand-400 bg-brand-50/50 text-brand-950 ring-1 ring-brand-300'
                  : 'border-slate-100 bg-slate-50/60 text-slate-600'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 mt-0.5 ${
                    activeStep === idx ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {idx + 1}
                </span>
                <p className="leading-relaxed">{step}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Hand Shape and Movement details */}
        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-600">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
            <span className="font-semibold text-slate-800 block mb-1">Hand Shape:</span>
            {entry.handShape}
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200/60">
            <span className="font-semibold text-slate-800 block mb-1">Movement Guidance:</span>
            {entry.movementDescription}
          </div>
        </div>

        {/* Provenance Footer */}
        <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 shrink-0" />
          <span>Source: {entry.sourceProvenance}</span>
        </div>
      </div>
    </div>
  );
};
