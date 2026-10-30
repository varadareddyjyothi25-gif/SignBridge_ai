import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation, type ActiveTab } from './components/Navigation';
import { WelcomeView } from './components/WelcomeView';
import { HomeView } from './components/HomeView';
import { GesturePredictorView } from './components/GesturePredictorView';
import { LearningLibraryView } from './components/LearningLibraryView';
import { DashboardView } from './components/DashboardView';
import { AuthModal } from './components/AuthModal';
import { Shield } from 'lucide-react';

const VALID_TABS: ActiveTab[] = ['welcome', 'home', 'gesture', 'library', 'dashboard'];
const PROTECTED_TABS: ActiveTab[] = ['home', 'dashboard'];

const parseHashTab = (): ActiveTab => {
  if (typeof window === 'undefined') return 'welcome';
  const hash = window.location.hash.replace(/^#\/?/, '') as ActiveTab;
  return VALID_TABS.includes(hash) ? hash : 'welcome';
};

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>(parseHashTab);
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Sync state with browser back/forward history navigation
  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const raw = window.location.hash.replace(/^#\/?/, '') as ActiveTab;
      const targetTab = (event.state?.tab || raw || 'welcome') as ActiveTab;

      if (!VALID_TABS.includes(targetTab)) {
        setActiveTab('welcome');
        return;
      }

      // Check protection on browser Back/Forward navigation
      if (PROTECTED_TABS.includes(targetTab) && !user) {
        window.history.replaceState({ tab: 'welcome' }, '', '#welcome');
        setActiveTab('welcome');
        setAuthMode('signin');
        return;
      }

      setActiveTab(targetTab);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [user]);

  // Reactive guard: If user logs out or session terminates while on protected view
  useEffect(() => {
    if (!loading && !user && PROTECTED_TABS.includes(activeTab)) {
      queueMicrotask(() => {
        setActiveTab('welcome');
        window.history.replaceState({ tab: 'welcome' }, '', '#welcome');
      });
    }
  }, [user, loading, activeTab]);

  // Handle protected navigation
  const handleNavigate = (tab: ActiveTab, replace = false) => {
    if (PROTECTED_TABS.includes(tab) && !user) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      setActiveTab('welcome');
      window.history.replaceState({ tab: 'welcome' }, '', '#welcome');
      return;
    }

    setActiveTab(tab);
    if (replace) {
      window.history.replaceState({ tab }, '', `#${tab}`);
    } else {
      window.history.pushState({ tab }, '', `#${tab}`);
    }
  };

  const handleOpenAuth = (mode: 'signin' | 'signup' = 'signin') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  // Determine current view
  const renderCurrentView = () => {
    if (loading) {
      return (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-medium text-slate-500">Loading SignBridge AI...</p>
        </div>
      );
    }

    // Strict security guard: Unauthenticated users MUST NEVER access protected pages
    if (!user && PROTECTED_TABS.includes(activeTab)) {
      return (
        <WelcomeView
          onGetStarted={() => handleOpenAuth('signup')}
          onSignIn={() => handleOpenAuth('signin')}
          onExploreFeatures={() => handleNavigate('library')}
        />
      );
    }

    // Default unauthenticated experience
    if (activeTab === 'welcome' && !user) {
      return (
        <WelcomeView
          onGetStarted={() => handleOpenAuth('signup')}
          onSignIn={() => handleOpenAuth('signin')}
          onExploreFeatures={() => handleNavigate('library')}
        />
      );
    }

    if (activeTab === 'welcome' && user) {
      return <HomeView onNavigate={handleNavigate} />;
    }

    switch (activeTab) {
      case 'home':
        return <HomeView onNavigate={handleNavigate} />;
      case 'gesture':
        return <GesturePredictorView />;
      case 'library':
        return <LearningLibraryView />;
      case 'dashboard':
        return (
          <DashboardView
            onNavigateToLibrary={() => {
              handleNavigate('library');
            }}
          />
        );
      default:
        return user ? (
          <HomeView onNavigate={handleNavigate} />
        ) : (
          <WelcomeView
            onGetStarted={() => handleOpenAuth('signup')}
            onSignIn={() => handleOpenAuth('signin')}
            onExploreFeatures={() => handleNavigate('library')}
          />
        );
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <Navigation
        activeTab={activeTab}
        onNavigate={handleNavigate}
        onOpenAuth={handleOpenAuth}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderCurrentView()}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="SignBridge AI Logo" className="w-5 h-5 object-contain" />
            <span className="font-bold text-slate-800">SignBridge AI</span>
            <span>—</span>
            <span>Transforming Oral Understanding into Clear HandSigns</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-600">
            <span className="flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-emerald-600" />
              <span>100% On-Device Privacy Guaranteed</span>
            </span>
            <span>•</span>
            <span>ISLRTC Standardized Corpus</span>
          </div>
        </div>
      </footer>

      {/* Supabase Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
