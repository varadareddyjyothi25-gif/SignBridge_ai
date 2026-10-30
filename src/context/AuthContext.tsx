import React, { createContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, type UserProfile } from '../lib/supabase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isDemoMode: boolean;
  signIn: (email: string, password?: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string; requiresVerification?: boolean }>;
  signOut: () => Promise<{ error?: string }>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_USER_KEY = 'signbridge_auth_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoMode, setIsDemoMode] = useState(!isSupabaseConfigured);

  // Initialize session
  useEffect(() => {
    let mounted = true;

    async function checkSession() {
      if (isSupabaseConfigured) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) throw error;

          if (session?.user && mounted) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
              fullName: session.user.user_metadata?.full_name || 'SignBridge AI User',
              preferredHand: 'right',
              recordHistory: true,
              createdAt: session.user.created_at || new Date().toISOString()
            });
            setIsDemoMode(false);
          }
        } catch (err) {
          console.warn('Supabase getSession error, checking local store:', err);
        }
      }

      if (mounted) {
        try {
          const localStored = localStorage.getItem(LOCAL_USER_KEY);
          if (localStored) {
            setUser((curr) => curr || JSON.parse(localStored));
          }
        } catch (e) {
          console.error(e);
        }
        setLoading(false);
      }
    }

    checkSession();

    // Listen to Supabase auth state changes if configured
    let subscription: { unsubscribe: () => void } | null = null;
    if (isSupabaseConfigured) {
      const { data } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem(LOCAL_USER_KEY);
          setUser(null);
        } else if (session?.user) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
            fullName: session.user.user_metadata?.full_name || 'SignBridge AI User',
            preferredHand: 'right',
            recordHistory: true,
            createdAt: session.user.created_at || new Date().toISOString()
          });
          setIsDemoMode(false);
        } else {
          // If logged out from Supabase, clear state if not demo
          if (!localStorage.getItem(LOCAL_USER_KEY)) {
            setUser(null);
          }
        }
      });
      subscription = data.subscription;
    }

    return () => {
      mounted = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password?: string): Promise<{ error?: string }> => {
    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }

    if (isSupabaseConfigured && password) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        if (data.user) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: data.user.user_metadata?.full_name || 'SignBridge AI User',
            preferredHand: 'right',
            recordHistory: true,
            createdAt: data.user.created_at || new Date().toISOString()
          };
          setUser(profile);
          setIsDemoMode(false);
          return {};
        }
      } catch (err: any) {
        return { error: err.message || 'Supabase authentication failed.' };
      }
    }

    // Local / Offline demo mode login
    const demoProfile: UserProfile = {
      id: 'demo-user-101',
      email: email.trim().toLowerCase(),
      fullName: email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      preferredHand: 'right',
      recordHistory: true,
      createdAt: new Date().toISOString()
    };
    setUser(demoProfile);
    setIsDemoMode(true);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(demoProfile));
    return {};
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string
  ): Promise<{ error?: string; requiresVerification?: boolean }> => {
    if (!email || !email.includes('@')) {
      return { error: 'Please enter a valid email address.' };
    }
    if (!password || password.length < 8) {
      return { error: 'Password must be at least 8 characters long.' };
    }
    if (!fullName || fullName.trim().length < 2) {
      return { error: 'Please provide your full name.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName.trim() }
          }
        });
        if (error) return { error: error.message };
        if (data.user && !data.session) {
          return { requiresVerification: true };
        }
        if (data.user && data.session) {
          const profile: UserProfile = {
            id: data.user.id,
            email: data.user.email || email,
            fullName: fullName.trim(),
            preferredHand: 'right',
            recordHistory: true,
            createdAt: new Date().toISOString()
          };
          setUser(profile);
          setIsDemoMode(false);
          return {};
        }
      } catch (err: any) {
        return { error: err.message || 'Registration failed.' };
      }
    }

    // Offline / local registration
    const newProfile: UserProfile = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'local-' + Date.now(),
      email: email.trim().toLowerCase(),
      fullName: fullName.trim(),
      preferredHand: 'right',
      recordHistory: true,
      createdAt: new Date().toISOString()
    };
    setUser(newProfile);
    setIsDemoMode(true);
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(newProfile));
    return {};
  };

  const signOut = async (): Promise<{ error?: string }> => {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.warn('Supabase signOut error:', error);
          return { error: error.message };
        }
      } catch (e: any) {
        console.warn('Supabase signOut error:', e);
        return { error: e?.message || 'Logout failed' };
      }
    }
    localStorage.removeItem(LOCAL_USER_KEY);
    setUser(null);
    return {};
  };

  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    if (!email || !email.includes('@')) {
      return { error: 'Please provide a valid email address.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/#reset-password'
        });
        if (error) return { error: error.message };
        return { message: 'Password reset link has been sent to your email.' };
      } catch (err: any) {
        return { error: err.message || 'Password reset request failed.' };
      }
    }

    return {
      message: 'Demo mode: Password reset email simulated. (In production, a secure reset link is dispatched via Supabase).'
    };
  };

  const updateProfile = async (updates: Partial<UserProfile>): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    const updated = { ...user, ...updates };
    setUser(updated);

    if (isSupabaseConfigured) {
      try {
        await supabase.from('profiles').update({
          full_name: updated.fullName,
          preferred_hand: updated.preferredHand,
          record_history: updated.recordHistory
        }).eq('id', user.id);
      } catch (e) {
        console.warn('Supabase profile update failed:', e);
      }
    }

    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(updated));
    return {};
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isDemoMode,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { useAuth } from './useAuth';
