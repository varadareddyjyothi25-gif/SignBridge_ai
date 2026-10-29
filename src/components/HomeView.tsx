import { useEffect, useState } from 'react';
import { Camera, Type, BookOpen, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SparshaDataService, type RecognitionHistoryItem } from '../lib/supabase';
import type { ActiveTab } from './Navigation';

interface HomeViewProps {
  onNavigate: (tab: ActiveTab) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [recentHistory, setRecentHistory] = useState<RecognitionHistoryItem[]>([]);

  useEffect(() => {
    if (!user) return;
    async function fetchRecent() {
      if (user) {
        const hist = await SparshaDataService.getHistory(user.id);
        setRecentHistory(hist.slice(0, 4));
      }
    }
    fetchRecent();
  }, [user]);

  return (
    <div className="space-y-8 py-4">
      {/* Welcome Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gradient-to-r from-brand-50 to-teal-50/50 p-6 rounded-3xl border border-brand-100/80">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-700">
            Welcome Back
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
            Hello, {user?.fullName || 'Signer'}
          </h1>
          <p className="text-slate-600 text-sm mt-1 max-w-xl">
            What would you like to translate or practice today?
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 border border-slate-200 text-xs font-medium text-slate-700">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>ISL Standard Model Active</span>
        </div>
      </div>

      {/* Two Prominent Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Action 1: Hand Gesture -> AI Prediction */}
        <div
          onClick={() => onNavigate('gesture')}
          className="group relative bg-white p-7 rounded-3xl border border-slate-200 hover:border-brand-300 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 group-hover:bg-brand-100 text-brand-600 flex items-center justify-center transition-colors">
              <Camera className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-brand-600 uppercase tracking-wider">
                Module 01
              </span>
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-brand-700 transition-colors mt-0.5">
                Hand Gesture → AI Prediction
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Start your camera to translate live Indian Sign Language gestures into text with real-time landmark tracking.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-brand-600 font-semibold text-sm">
            <span>Launch Live Camera</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>

        {/* Action 2: Text -> Hand Sign */}
        <div
          onClick={() => onNavigate('text')}
          className="group relative bg-white p-7 rounded-3xl border border-slate-200 hover:border-teal-300 hover:shadow-xl transition-all cursor-pointer flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-teal-50 group-hover:bg-teal-100 text-teal-600 flex items-center justify-center transition-colors">
              <Type className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs font-bold text-teal-600 uppercase tracking-wider">
                Module 02
              </span>
              <h2 className="text-2xl font-bold text-slate-900 group-hover:text-teal-700 transition-colors mt-0.5">
                Text → Hand Sign
              </h2>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                Type words or phrases to inspect verified sign animations with speed controls and anatomical step breakdowns.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-teal-700 font-semibold text-sm">
            <span>Lookup Sign Dictionary</span>
            <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* Compact Recent Activity Section & Sign Learning Library Link */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Activity */}
        <div className="lg:col-span-8 bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-600" />
              <span>Recent Recognition Activity</span>
            </h3>
            {recentHistory.length > 0 && (
              <button
                onClick={() => onNavigate('dashboard')}
                className="text-xs text-brand-600 hover:underline font-medium"
              >
                View all in Dashboard →
              </button>
            )}
          </div>

          {recentHistory.length === 0 ? (
            <p className="text-xs text-slate-400 py-4 text-center">
              No recent recognition logs found. Start the camera to detect gestures.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentHistory.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between"
                >
                  <div>
                    <span className="font-semibold text-slate-800 text-sm block">
                      {item.signLabel.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {new Date(item.recognizedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                    {(item.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Learning Library Quick Banner */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-4">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-teal-300">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-lg text-white">Sign Learning Library</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Master the official Indian Sign Language alphabet, emergency alerts, numbers, and common courtesy phrases.
            </p>
          </div>

          <button
            onClick={() => onNavigate('library')}
            className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <span>Explore Library</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
