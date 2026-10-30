import { useState } from 'react';
import { Search, ShieldCheck, BookOpen, CheckCircle2 } from 'lucide-react';
import { VALIDATED_ISL_DICTIONARY, type ISLSignEntry } from '../ml/dictionaryData';
import { SignVisualizer } from './SignVisualizer';
import { SignBridgeDataService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const LearningLibraryView: React.FC = () => {
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeModalSign, setActiveModalSign] = useState<ISLSignEntry | null>(null);
  const [completedSignIds, setCompletedSignIds] = useState<string[]>(() => {
    if (!user) return [];
    try {
      const stored = localStorage.getItem('signbridge_completed_learning') || localStorage.getItem('sparsha_completed_learning');
      if (stored) {
        const map = JSON.parse(stored);
        return map[user.id] || [];
      }
    } catch { }
    return [];
  });

  const categories = ['All', 'Greetings', 'Essentials', 'Emergency', 'Numbers', 'Everyday', 'Feelings'];

  const filteredSigns = VALIDATED_ISL_DICTIONARY.filter((sign) => {
    const matchesCategory = selectedCategory === 'All' || sign.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      sign.englishPhrase.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sign.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sign.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCompleteSign = (signId: string) => {
    if (!user) return;
    SignBridgeDataService.markLearningCompleted(user.id, signId);
    setCompletedSignIds((prev) => (prev.includes(signId) ? prev : [...prev, signId]));
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-900">Sign Learning Library</h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                ISLRTC Standard Corpus
              </span>
            </div>
            <p className="text-sm text-slate-600 mt-1 max-w-2xl">
              Explore officially verified Indian Sign Language (ISL) gestures, anatomical hand shapes, and kinematic execution breakdowns.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 shrink-0">
            <BookOpen className="w-4 h-4 text-brand-600" />
            <span>{filteredSigns.length} Signs Available</span>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mt-5 flex flex-col md:flex-row items-center gap-3">
          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sign or keyword..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-300 text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-colors ${selectedCategory === cat
                    ? 'bg-brand-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Grid of Signs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSigns.map((sign) => {
          const isCompleted = completedSignIds.includes(sign.id);
          return (
            <div
              key={sign.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                    {sign.category}
                  </span>
                  {isCompleted ? (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>Learned</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-400">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Verified</span>
                    </span>
                  )}
                </div>

                <h3 className="text-base font-bold text-slate-900 mt-2">{sign.englishPhrase}</h3>
                {sign.hindiPhrase && (
                  <p className="text-xs text-slate-500 font-medium">{sign.hindiPhrase}</p>
                )}
                <p className="text-xs text-slate-600 mt-2 line-clamp-2 leading-relaxed">
                  {sign.description}
                </p>

                <div className="mt-3 text-[11px] text-slate-500 space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                  <p>
                    <strong className="text-slate-700">Shape:</strong> {sign.handShape}
                  </p>
                  <p>
                    <strong className="text-slate-700">Execution:</strong> {sign.movementDescription}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {sign.twoHanded ? 'Two-Handed' : 'Single Hand'}
                </span>
                <button
                  onClick={() => setActiveModalSign(sign)}
                  className="px-3.5 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-700 font-semibold text-xs transition-colors"
                >
                  View Animation & Steps →
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Detailed Visualizer */}
      {activeModalSign && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <button
              onClick={() => setActiveModalSign(null)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm transition-colors z-10"
              aria-label="Close modal"
            >
              ✕
            </button>
            <div className="p-2 sm:p-4">
              <SignVisualizer
                entry={activeModalSign}
                onCompleted={() => handleCompleteSign(activeModalSign.id)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
