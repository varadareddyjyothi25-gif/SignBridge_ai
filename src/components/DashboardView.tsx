import React, { useState, useEffect } from 'react';
import {
  User,
  History,
  Bookmark,
  Award,
  Trash2,
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import {
  SparshaDataService,
  type RecognitionHistoryItem,
  type SavedSignItem
} from '../lib/supabase';
import { VALIDATED_ISL_DICTIONARY, type ISLSignEntry } from '../ml/dictionaryData';
import { useAuth } from '../context/AuthContext';

export const DashboardView: React.FC<{ onNavigateToSign?: (sign: ISLSignEntry) => void }> = ({
  onNavigateToSign
}) => {
  const { user, updateProfile } = useAuth();
  const [history, setHistory] = useState<RecognitionHistoryItem[]>([]);
  const [savedSigns, setSavedSigns] = useState<SavedSignItem[]>([]);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');

  useEffect(() => {
    if (!user) return;

    async function loadUserData() {
      setLoading(true);
      if (user) {
        const hist = await SparshaDataService.getHistory(user.id);
        const saved = await SparshaDataService.getSavedSigns(user.id);
        const count = SparshaDataService.getCompletedLearningCount(user.id);
        setHistory(hist);
        setSavedSigns(saved);
        setCompletedCount(count);
      }
      setLoading(false);
    }

    loadUserData();
  }, [user]);

  const handleClearHistory = async () => {
    if (!user) return;
    await SparshaDataService.clearHistory(user.id);
    setHistory([]);
    setShowClearConfirm(false);
    setFeedbackMsg('Recognition history has been permanently cleared.');
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleToggleHistoryRecording = async () => {
    if (!user) return;
    await updateProfile({ recordHistory: !user.recordHistory });
  };

  const handleHandPreferenceChange = async (hand: 'right' | 'left' | 'both') => {
    if (!user) return;
    await updateProfile({ preferredHand: hand });
  };

  // Find sign entry details for saved signs
  const savedEntriesWithDetails = savedSigns
    .map((item) => {
      const entry = VALIDATED_ISL_DICTIONARY.find((d) => d.id === item.signId);
      return { ...item, entry };
    })
    .filter((item) => Boolean(item.entry));

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-100 border border-brand-200 flex items-center justify-center text-brand-700 font-bold text-xl">
            {user?.fullName ? user.fullName.charAt(0).toUpperCase() : <User className="w-7 h-7" />}
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user?.fullName || 'SPARSHA Member'}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-medium">
                Dominant Hand: {user?.preferredHand === 'left' ? 'Left' : 'Right'}
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-medium">
                Account Active
              </span>
            </div>
          </div>
        </div>

        {/* Clear feedback alert */}
        {feedbackMsg && (
          <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}
      </div>

      {/* Real Statistics Calculated from Stored Data */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Gestures Recognized</span>
            <History className="w-4 h-4 text-brand-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{history.length}</div>
          <p className="text-[11px] text-slate-400">Total verified on-device matches recorded</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Saved Signs</span>
            <Bookmark className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{savedSigns.length}</div>
          <p className="text-[11px] text-slate-400">Personal study list bookmarks</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Learning Modules Finished</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{completedCount}</div>
          <p className="text-[11px] text-slate-400">Step-by-step sign tutorials completed</p>
        </div>
      </div>

      {/* Main Grid: History & Saved Items */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Recent Recognition History Column */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2">
              <History className="w-4 h-4 text-brand-600" />
              <span>Real Recognition History</span>
            </h3>

            {history.length > 0 && (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete All History</span>
              </button>
            )}
          </div>

          {/* Delete History Confirmation Dialog */}
          {showClearConfirm && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 space-y-2 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <span>Permanently delete your recognition history?</span>
              </div>
              <p className="text-red-700">
                This will delete all stored recognition logs from your account. This action cannot be undone.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={handleClearHistory}
                  className="px-3 py-1 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
                >
                  Confirm Delete
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Table / List of records */}
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading history records...</div>
          ) : history.length === 0 ? (
            <div className="py-8 text-center space-y-1">
              <p className="text-sm font-medium text-slate-700">No recognition history yet</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Gestures you recognize using the camera can be saved here for your personal review.
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-semibold text-slate-900 text-sm block">
                      {item.signLabel.replace(/_/g, ' ')}
                    </span>
                    <div className="flex items-center gap-2 text-slate-400 mt-0.5">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(item.recognizedAt).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-slate-700 block">
                      {(item.confidenceScore * 100).toFixed(0)}% Match
                    </span>
                    <span className="text-[11px] text-emerald-600 font-medium">Validated</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Saved Signs & Preferences Column */}
        <div className="lg:col-span-5 space-y-6">
          {/* Saved Signs */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <Bookmark className="w-4 h-4 text-amber-500" />
              <span>Saved Signs ({savedSigns.length})</span>
            </h3>

            {savedEntriesWithDetails.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">
                No signs saved yet. Bookmark signs from Text → Hand Sign or the Learning Library to review later.
              </p>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                {savedEntriesWithDetails.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigateToSign && item.entry && onNavigateToSign(item.entry)}
                    className="p-2.5 rounded-xl border border-slate-100 hover:border-brand-200 hover:bg-brand-50/30 cursor-pointer transition-colors flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">
                        {item.entry?.englishPhrase}
                      </span>
                      <span className="text-slate-400 block text-[11px]">
                        {item.entry?.category}
                      </span>
                    </div>
                    <span className="text-[11px] text-brand-600 font-medium">Practice →</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Privacy & Account Settings */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 pb-2 border-b border-slate-100">
              <Shield className="w-4 h-4 text-brand-600" />
              <span>Privacy & Camera Settings</span>
            </h3>

            {/* History Opt-in Toggle */}
            <div className="flex items-center justify-between gap-3 text-xs">
              <div>
                <span className="font-medium text-slate-800 block">Record Recognition History</span>
                <span className="text-slate-400 text-[11px]">
                  Opt-in to saving predictions to your dashboard.
                </span>
              </div>
              <button
                onClick={handleToggleHistoryRecording}
                className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${
                  user?.recordHistory ? 'bg-brand-600' : 'bg-slate-200'
                }`}
                aria-label="Toggle history recording"
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    user?.recordHistory ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Preferred Hand Preference */}
            <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
              <span className="font-medium text-slate-800 block">Dominant Hand Orientation:</span>
              <div className="grid grid-cols-2 gap-2">
                {(['right', 'left'] as const).map((hand) => (
                  <button
                    key={hand}
                    onClick={() => handleHandPreferenceChange(hand)}
                    className={`py-1.5 px-3 rounded-lg border text-center capitalize transition-colors font-medium ${
                      user?.preferredHand === hand
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    {hand} Hand
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
