import { create } from 'zustand';

import type { Module, Mark, StudySession, UserPreferences } from '../types';
import { DEFAULT_PREFERENCES } from '../types';
import {
  modulesDb,
  marksDb,
  sessionsDb,
  preferencesDb,
} from '../lib/db';

interface AppStore {
  // State
  modules: Module[];
  marks: Mark[];
  sessions: StudySession[];
  preferences: UserPreferences;
  user: any | null; // Supabase user
  isAuthenticated: boolean;
  isLoaded: boolean;

  // Data loading
  init: () => void;
  loadAll: () => Promise<void>;

  // Modules
  addModule: (data: Omit<Module, 'id' | 'createdAt' | 'isActive'>) => Promise<Module>;
  updateModule: (id: string, data: Partial<Module>) => Promise<void>;
  archiveModule: (id: string) => Promise<void>;

  // Marks
  addMark: (data: Omit<Mark, 'id' | 'createdAt'>) => Promise<Mark>;
  deleteMark: (id: string) => Promise<void>;

  // Sessions
  refreshSessions: () => Promise<void>;

  // Auth
  setUser: (user: any | null) => void;
  signOut: () => Promise<void>;

  // Preferences
  updatePreferences: (data: Partial<UserPreferences>) => Promise<void>;
}

export const useAppStore = create<AppStore>()((set) => ({
  modules: [],
  marks: [],
  sessions: [],
  preferences: DEFAULT_PREFERENCES,
  user: null,
  isAuthenticated: false,
  isLoaded: false,

  setUser: (user) => set({ user, isAuthenticated: !!user }),

  init: () => {
    import('../lib/firebase').then(({ auth }) => {
      auth.onAuthStateChanged(async (user) => {
        if (user) {
          set({ user: { id: user.uid, email: user.email || undefined } as any, isAuthenticated: true });
          try {
            const [modules, sessions, marks, preferences] = await Promise.all([
              modulesDb.getAll(),
              sessionsDb.getAll(),
              marksDb.getAll(),
              preferencesDb.get(),
            ]);
            set({ modules, sessions, marks, preferences: preferences || DEFAULT_PREFERENCES });
          } catch (error) {
            console.error('Failed to fetch data:', error);
          }
        } else {
          set({ user: null, isAuthenticated: false, modules: [], sessions: [], marks: [], preferences: DEFAULT_PREFERENCES });
        }
        set({ isLoaded: true });
      });
    });
  },

  loadAll: async () => {
    // Replaced by auth.onAuthStateChanged listener, we just return
    return;
  },

  addModule: async (data) => {
    const newModule = await modulesDb.create(data);
    set((state) => ({ modules: [...state.modules, newModule] }));
    return newModule;
  },

  updateModule: async (id, data) => {
    // Optimistic
    set((state) => ({
      modules: state.modules.map((m) => (m.id === id ? { ...m, ...data } : m)),
    }));
    await modulesDb.update(id, data);
  },

  archiveModule: async (id) => {
    set((state) => ({
      modules: state.modules.filter((m) => m.id !== id),
    }));
    await modulesDb.archive(id);
  },

  addMark: async (data) => {
    const newMark = await marksDb.create(data);
    set((state) => ({ marks: [...state.marks, newMark] }));
    return newMark;
  },

  deleteMark: async (id) => {
    set((state) => ({
      marks: state.marks.filter((m) => m.id !== id),
    }));
    await marksDb.delete(id);
  },

  refreshSessions: async () => {
    const sessions = await sessionsDb.getAll();
    set({ sessions });
  },

  signOut: async () => {
    const { auth } = await import('../lib/firebase');
    await auth.signOut();
    set({
      user: null,
      isAuthenticated: false,
      modules: [],
      marks: [],
      sessions: [],
      preferences: DEFAULT_PREFERENCES,
    });
  },

  updatePreferences: async (data) => {
    set((state) => ({ preferences: { ...state.preferences, ...data } }));
    await preferencesDb.update(data);
  },
}));
