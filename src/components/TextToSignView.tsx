import { useState } from 'react';
import { Search, AlertCircle, Bookmark, Check, ShieldCheck } from 'lucide-react';
import { VALIDATED_ISL_DICTIONARY, findSignsByText, type ISLSignEntry } from '../ml/dictionaryData';
import { SignVisualizer } from './SignVisualizer';
import { SparshaDataService } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export const TextToSignView: React.FC = () => {
  const { user } = useAuth();
  const [inputText, setInputText] = useState<string>('');
  const [selectedSign, setSelectedSign] = useState<ISLSignEntry>(VALIDATED_ISL_DICTIONARY[0]);
  const [savedStatus, setSavedStatus] = useState<boolean>(false);
  const [inputError, setInputError] = useState<string>('');

  const searchResults = inputText.trim() ? findSignsByText(inputText) : VALIDATED_ISL_DICTIONARY;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = inputText.trim();

    if (!cleanText) {
      setInputError('Please enter a word or phrase to look up.');
      return;
    }

    if (cleanText.length > 50) {
      setInputError('Input limit is 50 characters for verified sign entries.');
      return;
    }

    setInputError('');

    const matches = findSignsByText(cleanText);
    if (matches.length > 0) {
      setSelectedSign(matches[0]);
      setSavedStatus(false);
    }
  };

  const handleSelectSign = (sign: ISLSignEntry) => {
    setSelectedSign(sign);
    setSavedStatus(false);
  };

  const handleBookmarkToggle = async () => {
    if (!user) return;
    const isNowSaved = await SparshaDataService.toggleSavedSign(user.id, selectedSign.id);
    setSavedStatus(isNowSaved);
  };

  const handleMarkLearned = () => {
    if (!user) return;
    SparshaDataService.markLearningCompleted(user.id, selectedSign.id);
  };

  return (
    <div className="space-y-6">
      {/* Header and Scope Notice */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900">Text → Hand Sign Converter</h2>
        <p className="text-sm text-slate-600 mt-1 max-w-3xl">
          Search the standardized Indian Sign Language (ISL) vocabulary to view verified hand sign mechanics, finger positioning, and execution steps.
        </p>

        {/* Translation Scope Warning */}
        <div className="mt-3.5 p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Linguistic Notice:</strong> ISL has its own distinct syntax and spatial grammar. This dictionary displays verified word-level and phrase-level signs. It does <em>not</em> generate unverified continuous sentence translations or fabricated finger gestures.
          </p>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="space-y-2">
          <div className="relative">
            <input
              type="text"
              value={inputText}
              maxLength={50}
              onChange={(e) => {
                setInputText(e.target.value);
                if (inputError) setInputError('');
              }}
              placeholder="Type an English or Hindi word (e.g. Namaste, Help, Thank You, Yes, Doctor)..."
              className="w-full pl-11 pr-28 py-3 rounded-xl border border-slate-300 text-sm focus:border-brand-500 focus:ring-2 focus:ring-brand-200 placeholder:text-slate-400"
              aria-label="Text to hand sign lookup input"
            />
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3.5" />
            <button
              type="submit"
              className="absolute right-2 top-2 px-4 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-700 text-white font-medium text-xs transition-colors shadow-sm"
            >
              Search
            </button>
          </div>
          {inputError && <p className="text-xs text-red-600 pl-1">{inputError}</p>}
        </form>

        {/* Category Pills */}
        <div className="mt-3 flex flex-wrap gap-1.5 items-center text-xs">
          <span className="text-slate-400 mr-1 font-medium">Quick explore:</span>
          {['Greetings', 'Essentials', 'Emergency', 'Numbers', 'Everyday', 'Feelings'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => {
                  setInputText(cat);
                  setInputError('');
                }}
                className="px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors font-medium"
              >
                {cat}
              </button>
            )
          )}
        </div>
      </div>

      {/* Main Grid: Visualizer & Dictionary List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Selected Sign Visualizer Panel */}
        <div className="lg:col-span-7 space-y-4">
          {selectedSign ? (
            <div className="space-y-3">
              <SignVisualizer entry={selectedSign} onCompleted={handleMarkLearned} />

              {/* Bookmark & Actions bar */}
              {user && (
                <div className="flex items-center justify-between p-3.5 bg-white rounded-xl border border-slate-200 text-xs">
                  <span className="text-slate-500">
                    Studying: <strong className="text-slate-800">{selectedSign.englishPhrase}</strong>
                  </span>
                  <button
                    onClick={handleBookmarkToggle}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium transition-colors ${
                      savedStatus
                        ? 'bg-amber-100 text-amber-800 border border-amber-300'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {savedStatus ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-amber-700" />
                        <span>Saved to Bookmarks</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5 text-slate-500" />
                        <span>Save Sign</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
              Select a sign from the dictionary list to view.
            </div>
          )}
        </div>

        {/* Dictionary Results & Vocabulary List */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-semibold text-sm text-slate-800">
              Verified Vocabulary ({searchResults.length})
            </h3>
            <span className="text-xs text-slate-400">ISLRTC Verified</span>
          </div>

          {/* Unsupported word message if searched term returned 0 matches */}
          {inputText.trim() && searchResults.length === 0 && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
              <div className="flex items-center gap-1.5 font-bold">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span>Sign Not Available Yet — Unsupported Word or Phrase</span>
              </div>
              <p>
                The phrase <strong>“{inputText}”</strong> is not currently in our validated Indian Sign Language database.
              </p>
              <p className="text-amber-800">
                To maintain linguistic accuracy and avoid misleading gestures, SPARSHA does not generate synthetic or unverified hand signs.
              </p>
            </div>
          )}

          {/* List of matched / available signs */}
          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {searchResults.map((sign) => {
              const isSelected = selectedSign?.id === sign.id;
              return (
                <button
                  key={sign.id}
                  onClick={() => handleSelectSign(sign)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'border-brand-500 bg-brand-50/70 text-brand-950 ring-1 ring-brand-300'
                      : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50 text-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{sign.englishPhrase}</span>
                      {sign.hindiPhrase && (
                        <span className="text-[11px] text-slate-500">({sign.hindiPhrase})</span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      {sign.category} • {sign.twoHanded ? 'Two-handed' : 'One hand'}
                    </span>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
