import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navigation, type ActiveTab } from './components/Navigation';
import { WelcomeView } from './components/WelcomeView';
import { HomeView } from './components/HomeView';
import { GesturePredictorView } from './components/GesturePredictorView';
import { TextToSignView } from './components/TextToSignView';
import { LearningLibraryView } from './components/LearningLibraryView';
import { DashboardView } from './components/DashboardView';
import { AuthModal } from './components/AuthModal';
import { Shield } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('welcome');
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');

  // Handle protected navigation
  const handleNavigate = (tab: ActiveTab) => {
    if (tab === 'dashboard' && !user) {
      setAuthMode('signin');
      setAuthModalOpen(true);
      return;
    }
    setActiveTab(tab);
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
          <p className="text-sm font-medium text-slate-500">Loading SPARSHA...</p>
        </div>
      );
    }

    // Default unauthenticated experience
    if (activeTab === 'welcome' && !user) {
      return (
        <WelcomeView
          onGetStarted={() => handleOpenAuth('signup')}
          onSignIn={() => handleOpenAuth('signin')}
          onExploreFeatures={() => setActiveTab('library')}
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
      case 'text':
        return <TextToSignView />;
      case 'library':
        return <LearningLibraryView />;
      case 'dashboard':
        return (
          <DashboardView
            onNavigateToSign={() => {
              setActiveTab('text');
            }}
          />
        );
      default:
        return <HomeView onNavigate={handleNavigate} />;
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
            <img src="/logo.png" alt="SPARSHA Logo" className="w-5 h-5 object-contain" />
            <span className="font-bold text-slate-800">SPARSHA</span>
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
