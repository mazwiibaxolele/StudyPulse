import { create } from 'zustand';
import { supabase } from '../lib/supabase';
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
  loadAll: () => Promise<void>;

  // Modules
  addModule: (data: Omit<Module, 'id' | 'createdAt' | 'isActive'>) => Promise<Module>;
  updateModule: (id: string, data: Partial<Module>) => Promise<void>;
  archiveModule: (id: string) => Promise<void>;

  // Marks
  addMark: (data: Omit<Mark, 'id' | 'percentage' | 'createdAt'>) => Promise<Mark>;
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

  loadAll: async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user ?? null;
      set({ user, isAuthenticated: !!user });

      if (user) {
        const [modules, marks, sessions, preferences] = await Promise.all([
          modulesDb.getAll(),
          marksDb.getAll(),
          sessionsDb.getAll(),
          preferencesDb.get(),
        ]);
        set({ modules, marks, sessions, preferences, isLoaded: true });
      } else {
        set({ isLoaded: true });
      }
    } catch (e) {
      console.error('Failed to load data:', e);
      set({ isLoaded: true });
    }
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
    await supabase.auth.signOut();
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
