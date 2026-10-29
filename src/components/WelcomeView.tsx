import React from 'react';
import { Camera, BookOpen, ShieldCheck, ArrowRight, Sparkles, CheckCircle2 } from 'lucide-react';

interface WelcomeViewProps {
  onGetStarted: () => void;
  onSignIn: () => void;
  onExploreFeatures: () => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onGetStarted,
  onSignIn,
  onExploreFeatures,
}) => {
  return (
    <div className="space-y-12 py-6 md:py-10">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto space-y-5 px-4">
        {/* Brand Emblem */}
        <div className="w-24 h-24 mx-auto rounded-3xl bg-white p-2.5 shadow-md border border-slate-200/80 hover:scale-105 transition-transform flex items-center justify-center">
          <img src="/logo.png" alt="SPARSHA Logo" className="w-full h-full object-contain" />
        </div>

        {/* Brand Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-50 border border-brand-200 text-brand-800 text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5 text-brand-600" />
          <span>TOUCH: Transforming Oral Understanding into Clear HandSigns</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
          SPARSHA
          <span className="block text-xl sm:text-2xl font-normal text-slate-600 mt-2">
            “Bridging Communication, One Gesture at a Time.”
          </span>
        </h1>

        <p className="text-slate-600 text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
          An accessible, privacy-centric AI platform bridging speech, text, and Indian Sign Language (ISL). Built with validated scientific hand landmarks and zero-server video retention.
        </p>

        {/* Call to Actions */}
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <button
            onClick={onGetStarted}
            className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-all shadow-md hover:shadow-lg flex items-center gap-2"
          >
            <span>Get Started Free</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={onSignIn}
            className="px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 font-semibold text-sm transition-colors shadow-sm"
          >
            Sign In
          </button>
          <button
            onClick={onExploreFeatures}
            className="px-5 py-3 rounded-xl text-slate-600 hover:text-brand-700 font-medium text-sm transition-colors"
          >
            Explore Dictionary →
          </button>
        </div>

        {/* Clear Vocabulary Limitation Notice */}
        <div className="mt-4 p-3 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-600 max-w-xl mx-auto flex items-center justify-center gap-2">
          <ShieldCheck className="w-4 h-4 text-brand-600 shrink-0" />
          <span>
            Sign recognition is strictly calibrated to the vocabulary supported by our validated ISLRTC dataset model.
          </span>
        </div>
      </div>

      {/* Core Features Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto px-4">
        {/* Feature 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-600 flex items-center justify-center">
            <Camera className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Hand Gesture → AI Prediction</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Real-time on-device computer vision analyzes 21 hand landmarks directly in your browser. Video frames are never stored or uploaded.
          </p>
          <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Calibrated confidence scoring</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rejection threshold for unknown signs</span>
            </li>
          </ul>
        </div>

        {/* Feature 2: Sign Learning Library */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-900 text-lg">Sign Learning Library</h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Explore authentic Indian Sign Language curated from ISLRTC standards across Greetings, Emergencies, Essentials, and Numbers.
          </p>
          <ul className="text-xs text-slate-500 space-y-1.5 pt-2">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Track completed learning modules</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Bookmark signs for personal review</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};
