/**
 * App Store — General application state management
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Module, Mark, StudySession, UserPreferences } from '../types';
import { DEFAULT_PREFERENCES } from '../types';
import {
  modulesDb,
  marksDb,
  sessionsDb,
  preferencesDb,
  authDb,
  type MockUser,
} from '../lib/db';

// ─── Types ───────────────────────────────────────────────────

interface AppStore {
  // State
  modules: Module[];
  marks: Mark[];
  sessions: StudySession[];
  preferences: UserPreferences;
  user: MockUser | null;
  isAuthenticated: boolean;
  isLoaded: boolean;

  // Data loading
  loadAll: () => void;

  // Modules
  addModule: (data: Omit<Module, 'id' | 'createdAt' | 'isActive'>) => Module;
  updateModule: (id: string, data: Partial<Module>) => void;
  archiveModule: (id: string) => void;

  // Marks
  addMark: (data: Omit<Mark, 'id' | 'percentage' | 'createdAt'>) => Mark;
  updateMark: (id: string, data: Partial<Mark>) => void;
  deleteMark: (id: string) => void;

  // Sessions
  refreshSessions: () => void;

  // Auth
  signIn: (email: string, password: string) => MockUser;
  signUp: (email: string, password: string, name: string) => MockUser;
  signOut: () => void;

  // Preferences
  updatePreferences: (data: Partial<UserPreferences>) => void;
}

// ─── Store ───────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      // Initial state
      modules: [],
      marks: [],
      sessions: [],
      preferences: DEFAULT_PREFERENCES,
      user: null,
      isAuthenticated: false,
      isLoaded: false,

      loadAll: () => {
        const modules = modulesDb.getAll();
        const marks = marksDb.getAll();
        const sessions = sessionsDb.getAll();
        const preferences = preferencesDb.get();
        const user = authDb.getCurrentUser();

        set({
          modules,
          marks,
          sessions,
          preferences,
          user,
          isAuthenticated: user !== null,
          isLoaded: true,
        });
      },

      // ─── Modules ─────────────────────────────────────────

      addModule: (data) => {
        const newModule = modulesDb.create(data);
        set((state) => ({ modules: [...state.modules, newModule] }));
        return newModule;
      },

      updateModule: (id, data) => {
        modulesDb.update(id, data);
        set((state) => ({
          modules: state.modules.map((m) =>
            m.id === id ? { ...m, ...data } : m
          ),
        }));
      },

      archiveModule: (id) => {
        modulesDb.archive(id);
        set((state) => ({
          modules: state.modules.filter((m) => m.id !== id),
        }));
      },

      // ─── Marks ───────────────────────────────────────────

      addMark: (data) => {
        const newMark = marksDb.create(data);
        set((state) => ({ marks: [...state.marks, newMark] }));
        return newMark;
      },

      updateMark: (id, data) => {
        marksDb.update(id, data);
        set((state) => ({
          marks: state.marks.map((m) => {
            if (m.id !== id) return m;
            const updated = { ...m, ...data };
            if (data.score !== undefined || data.total !== undefined) {
              updated.percentage = (updated.score / updated.total) * 100;
            }
            return updated;
          }),
        }));
      },

      deleteMark: (id) => {
        marksDb.delete(id);
        set((state) => ({
          marks: state.marks.filter((m) => m.id !== id),
        }));
      },

      // ─── Sessions ────────────────────────────────────────

      refreshSessions: () => {
        set({ sessions: sessionsDb.getAll() });
      },

      // ─── Auth ────────────────────────────────────────────

      signIn: (email, password) => {
        const user = authDb.signIn(email, password);
        set({ user, isAuthenticated: true });
        return user;
      },

      signUp: (email, password, name) => {
        const user = authDb.signUp(email, password, name);
        set({ user, isAuthenticated: true });
        return user;
      },

      signOut: () => {
        authDb.signOut();
        set({ user: null, isAuthenticated: false });
      },

      // ─── Preferences ────────────────────────────────────

      updatePreferences: (data) => {
        const updated = preferencesDb.update(data);
        set({ preferences: updated });
      },
    }),
    {
      name: 'studypulse-app',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
