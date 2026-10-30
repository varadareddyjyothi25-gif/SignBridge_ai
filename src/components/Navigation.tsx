import React, { useState } from 'react';
import {
  Camera,
  BookOpen,
  LayoutDashboard,
  LogOut,
  Loader2,
  Database,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../lib/supabase';

export type ActiveTab = 'welcome' | 'home' | 'gesture' | 'library' | 'dashboard';

interface NavigationProps {
  activeTab: ActiveTab;
  onNavigate: (tab: ActiveTab) => void;
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onNavigate,
  onOpenAuth,
}) => {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleSignOut = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError(null);
    try {
      const res = await signOut();
      if (res && res.error) {
        setLogoutError(res.error);
      } else {
        onNavigate('welcome');
        setMobileMenuOpen(false);
      }
    } catch (err: any) {
      setLogoutError(err?.message || 'Logout failed. Please try again.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const navItems = [
    { id: 'gesture' as ActiveTab, label: 'Hand Gesture AI', icon: Camera },
    { id: 'library' as ActiveTab, label: 'ISL Library', icon: BookOpen },
    ...(user ? [{ id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard }] : []),
  ];

  const handleNavClick = (tab: ActiveTab) => {
    onNavigate(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <div
          onClick={() => onNavigate(user ? 'home' : 'welcome')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 p-0.5 flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
            <img src="/logo.png" alt="SignBridge AI Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-slate-900 tracking-tight text-lg">
                SignBridge AI
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-brand-50 text-brand-700 border border-brand-200">
                TOUCH
              </span>
            </div>
            <p className="text-[10px] text-slate-500 hidden sm:block">
              Transforming Oral Understanding into Clear HandSigns
            </p>
          </div>
        </div>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors ${isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right Section: Supabase status & User Actions */}
        <div className="hidden md:flex items-center gap-3">
          {/* Supabase status badge */}
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${isSupabaseConfigured
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            title={
              isSupabaseConfigured
                ? 'Connected to production Supabase cloud database'
                : 'Running in local verified storage mode'
            }
          >
            <Database className="w-3 h-3 text-slate-500" />
            <span>{isSupabaseConfigured ? 'Supabase Connected' : 'Local Sandbox Mode'}</span>
          </div>

          {user ? (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
              <button
                onClick={() => handleNavClick('dashboard')}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-slate-100 transition-colors text-left"
              >
                <div className="w-7 h-7 rounded-lg bg-brand-100 text-brand-700 font-bold text-xs flex items-center justify-center">
                  {user.fullName.charAt(0).toUpperCase()}
                </div>
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block leading-tight">
                    {user.fullName.split(' ')[0]}
                  </span>
                </div>
              </button>

              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className={`p-2 rounded-lg transition-colors ${isLoggingOut
                    ? 'opacity-60 cursor-not-allowed text-slate-400 bg-slate-100'
                    : 'text-slate-400 hover:text-red-600 hover:bg-red-50'
                  }`}
                title={isLoggingOut ? 'Signing out...' : 'Sign out'}
                aria-label={isLoggingOut ? 'Signing out...' : 'Sign out'}
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onOpenAuth('signin')}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              >
                Sign In
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-xs transition-colors shadow-sm"
              >
                Get Started
              </button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-2 shadow-lg animate-in slide-in-from-top-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-3 transition-colors ${isActive
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            {user ? (
              <button
                onClick={handleSignOut}
                disabled={isLoggingOut}
                className={`w-full py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${isLoggingOut
                    ? 'opacity-60 cursor-not-allowed text-slate-400 bg-slate-100'
                    : 'text-red-600 hover:bg-red-50'
                  }`}
                aria-label={isLoggingOut ? 'Signing out...' : 'Sign out'}
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-red-600" />
                    <span>Signing out...</span>
                  </>
                ) : (
                  <>
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out ({user.email})</span>
                  </>
                )}
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => {
                    onOpenAuth('signin');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 text-sm font-semibold text-slate-800 border border-slate-200 rounded-xl"
                >
                  Sign In
                </button>
                <button
                  onClick={() => {
                    onOpenAuth('signup');
                    setMobileMenuOpen(false);
                  }}
                  className="py-2.5 text-sm font-semibold text-white bg-brand-600 rounded-xl shadow-sm"
                >
                  Get Started
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Error Alert Banner */}
      {logoutError && (
        <div
          role="alert"
          className="bg-red-50 border-t border-b border-red-200 px-4 py-2.5 text-xs text-red-700 flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <span className="font-bold">Logout failed:</span>
            <span>{logoutError}</span>
          </div>
          <button
            onClick={() => setLogoutError(null)}
            className="text-red-700 hover:text-red-900 font-semibold text-xs ml-4 underline"
            aria-label="Dismiss error"
          >
            Dismiss
          </button>
        </div>
      )}
    </header>
  );
};
