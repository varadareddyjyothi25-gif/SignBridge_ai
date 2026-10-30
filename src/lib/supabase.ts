import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  !supabaseUrl.includes('your-project-ref') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Real client or graceful placeholder
export const supabase: SupabaseClient = createClient(
  isSupabaseConfigured ? supabaseUrl : 'https://signbridge-mock.supabase.co',
  isSupabaseConfigured ? supabaseAnonKey : 'mock-anon-key'
);

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  preferredHand: 'right' | 'left' | 'both';
  recordHistory: boolean;
  createdAt: string;
}

export interface RecognitionHistoryItem {
  id: string;
  userId: string;
  signLabel: string;
  confidenceScore: number;
  handUsed: 'right' | 'left';
  recognizedAt: string;
}

export interface SavedSignItem {
  id: string;
  userId: string;
  signId: string;
  notes?: string;
  savedAt: string;
}

// Local mock storage for offline / unconfigured environments so user can test immediately
const LOCAL_STORAGE_KEYS = {
  USER_SESSION: 'signbridge_user_session',
  PROFILES: 'signbridge_profiles',
  HISTORY: 'signbridge_history',
  SAVED_SIGNS: 'signbridge_saved_signs',
  LEARNING_COMPLETED: 'signbridge_completed_learning'
};

export class SignBridgeDataService {
  // Check if active Supabase connection or local fallback
  static isLiveBackend(): boolean {
    return isSupabaseConfigured;
  }

  // --- Recognition History ---
  static async getHistory(userId: string): Promise < RecognitionHistoryItem[] > {
    if(isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('recognition_history')
          .select('*')
          .eq('user_id', userId)
          .order('recognized_at', { ascending: false })
          .limit(50);
        if (error) throw error;
        return (data || []).map(row => ({
          id: row.id,
          userId: row.user_id,
          signLabel: row.sign_label,
          confidenceScore: Number(row.confidence_score),
          handUsed: row.hand_used || 'right',
          recognizedAt: row.recognized_at
        }));
      } catch (err) {
        console.warn('Supabase history fetch failed, falling back to local storage:', err);
      }
    }

    // Local fallback
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
      if(!stored) return [];
      const all: RecognitionHistoryItem[] = JSON.parse(stored);
      return all.filter(item => item.userId === userId);
    } catch {
      return [];
    }
  }

  static async addHistory(
    userId: string,
    signLabel: string,
    confidenceScore: number,
    handUsed: 'right' | 'left' = 'right'
  ): Promise < RecognitionHistoryItem | null > {
    const newItem: RecognitionHistoryItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      userId,
      signLabel,
      confidenceScore,
      handUsed,
      recognizedAt: new Date().toISOString()
    };

    if(isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('recognition_history')
          .insert({
            user_id: userId,
            sign_label: signLabel,
            confidence_score: confidenceScore,
            hand_used: handUsed
          })
          .select()
          .single();
        if (!error && data) {
          return {
            id: data.id,
            userId: data.user_id,
            signLabel: data.sign_label,
            confidenceScore: Number(data.confidence_score),
            handUsed: data.hand_used,
            recognizedAt: data.recognized_at
          };
        }
      } catch (err) {
        console.warn('Supabase history insert error:', err);
      }
    }

    // Local fallback
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
      const list: RecognitionHistoryItem[] = stored ? JSON.parse(stored) : [];
      list.unshift(newItem);
      localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(list.slice(0, 100)));
      return newItem;
    } catch {
      return newItem;
    }
  }

  static async clearHistory(userId: string): Promise < boolean > {
    if(isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('recognition_history')
          .delete()
          .eq('user_id', userId);
        if (error) throw error;
      } catch (err) {
        console.warn('Supabase clear history failed:', err);
      }
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.HISTORY);
      if(stored) {
        const list: RecognitionHistoryItem[] = JSON.parse(stored);
        const filtered = list.filter(item => item.userId !== userId);
        localStorage.setItem(LOCAL_STORAGE_KEYS.HISTORY, JSON.stringify(filtered));
      }
      return true;
    } catch {
      return false;
    }
  }

  // --- Saved Signs ---
  static async getSavedSigns(userId: string): Promise < SavedSignItem[] > {
    if(isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('saved_signs')
          .select('*')
          .eq('user_id', userId);
        if (error) throw error;
        return (data || []).map(row => ({
          id: row.id,
          userId: row.user_id,
          signId: row.sign_id,
          notes: row.notes,
          savedAt: row.saved_at
        }));
      } catch (err) {
        console.warn('Supabase saved signs fetch error:', err);
      }
    }

    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SAVED_SIGNS);
      if(!stored) return [];
      const list: SavedSignItem[] = JSON.parse(stored);
      return list.filter(item => item.userId === userId);
    } catch {
      return [];
    }
  }

  static async toggleSavedSign(userId: string, signId: string): Promise < boolean > {
    const existing = await this.getSavedSigns(userId);
    const found = existing.find(item => item.signId === signId);

    if(found) {
      // Remove
      if (isSupabaseConfigured) {
        try {
          await supabase.from('saved_signs').delete().eq('id', found.id);
        } catch (e) {
          console.warn('Supabase delete bookmark error:', e);
        }
      }
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SAVED_SIGNS);
      if (stored) {
        const list: SavedSignItem[] = JSON.parse(stored);
        localStorage.setItem(
          LOCAL_STORAGE_KEYS.SAVED_SIGNS,
          JSON.stringify(list.filter(item => !(item.userId === userId && item.signId === signId)))
        );
      }
      return false; // No longer saved
    } else {
      // Add
      const newItem: SavedSignItem = {
        id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
        userId,
        signId,
        savedAt: new Date().toISOString()
      };
      if(isSupabaseConfigured) {
        try {
          await supabase.from('saved_signs').insert({
            user_id: userId,
            sign_id: signId
          });
        } catch (e) {
          console.warn('Supabase insert bookmark error:', e);
        }
      }
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.SAVED_SIGNS);
      const list: SavedSignItem[] = stored ? JSON.parse(stored) : [];
      list.push(newItem);
      localStorage.setItem(LOCAL_STORAGE_KEYS.SAVED_SIGNS, JSON.stringify(list));
      return true; // Now saved
    }
  }

  // --- Completed Learning Activities ---
  static getCompletedLearningCount(userId: string): number {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LEARNING_COMPLETED);
      if (!stored) return 0;
      const map: { [userId: string]: string[] } = JSON.parse(stored);
      return map[userId]?.length || 0;
    } catch {
      return 0;
    }
  }

  static markLearningCompleted(userId: string, signId: string): void {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.LEARNING_COMPLETED);
      const map: { [userId: string]: string[] } = stored ? JSON.parse(stored) : {};
  if (!map[userId]) map[userId] = [];
  if (!map[userId].includes(signId)) {
    map[userId].push(signId);
    localStorage.setItem(LOCAL_STORAGE_KEYS.LEARNING_COMPLETED, JSON.stringify(map));
  }
    } catch (e) {
      console.warn('Could not record learning progress:', e);
    }
  }
}

export { SignBridgeDataService as SparshaDataService, SignBridgeDataService as SignBridgeAIDataService };
