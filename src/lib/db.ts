/**
 * Local data layer — localStorage persistence
 * This module will be swapped for Supabase calls later.
 * Every function mirrors what the Supabase client would do.
 */

import type { Module, StudySession, Mark, ChatMessage, AIInsight, UserPreferences } from '../types';
import { DEFAULT_PREFERENCES } from '../types';

// ─── Helpers ─────────────────────────────────────────────────

function generateId(): string {
  return crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function getStore<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(`studypulse_${key}`);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function setStore<T>(key: string, data: T[]): void {
  localStorage.setItem(`studypulse_${key}`, JSON.stringify(data));
}

function getObject<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`studypulse_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setObject<T>(key: string, data: T): void {
  localStorage.setItem(`studypulse_${key}`, JSON.stringify(data));
}

// ─── Modules ─────────────────────────────────────────────────

export const modulesDb = {
  getAll(): Module[] {
    return getStore<Module>('modules').filter(m => m.isActive);
  },

  getAllIncludeArchived(): Module[] {
    return getStore<Module>('modules');
  },

  getById(id: string): Module | undefined {
    return getStore<Module>('modules').find(m => m.id === id);
  },

  create(data: Omit<Module, 'id' | 'createdAt' | 'isActive'>): Module {
    const modules = getStore<Module>('modules');
    const newModule: Module = {
      ...data,
      id: generateId(),
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    modules.push(newModule);
    setStore('modules', modules);
    return newModule;
  },

  update(id: string, data: Partial<Module>): Module | undefined {
    const modules = getStore<Module>('modules');
    const idx = modules.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    modules[idx] = { ...modules[idx], ...data };
    setStore('modules', modules);
    return modules[idx];
  },

  archive(id: string): void {
    this.update(id, { isActive: false });
  },

  delete(id: string): void {
    const modules = getStore<Module>('modules').filter(m => m.id !== id);
    setStore('modules', modules);
  },
};

// ─── Study Sessions ──────────────────────────────────────────

export const sessionsDb = {
  getAll(): StudySession[] {
    return getStore<StudySession>('sessions');
  },

  getByModule(moduleId: string): StudySession[] {
    return getStore<StudySession>('sessions').filter(s => s.moduleId === moduleId);
  },

  getRecent(limit: number = 10): StudySession[] {
    return getStore<StudySession>('sessions')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  },

  getInDateRange(start: Date, end: Date): StudySession[] {
    return getStore<StudySession>('sessions').filter(s => {
      const d = new Date(s.startedAt);
      return d >= start && d <= end;
    });
  },

  create(data: Omit<StudySession, 'id' | 'createdAt'>): StudySession {
    const sessions = getStore<StudySession>('sessions');
    const newSession: StudySession = {
      ...data,
      id: generateId(),
      createdAt: new Date().toISOString(),
    };
    sessions.push(newSession);
    setStore('sessions', sessions);
    return newSession;
  },

  update(id: string, data: Partial<StudySession>): StudySession | undefined {
    const sessions = getStore<StudySession>('sessions');
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return undefined;
    sessions[idx] = { ...sessions[idx], ...data };
    setStore('sessions', sessions);
    return sessions[idx];
  },

  getTotalHours(): number {
    return getStore<StudySession>('sessions')
      .reduce((acc, s) => acc + (s.durationMins || 0), 0) / 60;
  },

  getTotalHoursByModule(moduleId: string): number {
    return this.getByModule(moduleId)
      .reduce((acc, s) => acc + (s.durationMins || 0), 0) / 60;
  },

  getThisWeekSessions(): StudySession[] {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    return this.getInDateRange(startOfWeek, now);
  },
};

// ─── Marks ───────────────────────────────────────────────────

export const marksDb = {
  getAll(): Mark[] {
    return getStore<Mark>('marks');
  },

  getByModule(moduleId: string): Mark[] {
    return getStore<Mark>('marks')
      .filter(m => m.moduleId === moduleId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  create(data: Omit<Mark, 'id' | 'percentage' | 'createdAt'>): Mark {
    const marks = getStore<Mark>('marks');
    const newMark: Mark = {
      ...data,
      id: generateId(),
      percentage: (data.score / data.total) * 100,
      createdAt: new Date().toISOString(),
    };
    marks.push(newMark);
    setStore('marks', marks);
    return newMark;
  },

  update(id: string, data: Partial<Mark>): Mark | undefined {
    const marks = getStore<Mark>('marks');
    const idx = marks.findIndex(m => m.id === id);
    if (idx === -1) return undefined;
    const updated = { ...marks[idx], ...data };
    if (data.score !== undefined || data.total !== undefined) {
      updated.percentage = (updated.score / updated.total) * 100;
    }
    marks[idx] = updated;
    setStore('marks', marks);
    return marks[idx];
  },

  delete(id: string): void {
    const marks = getStore<Mark>('marks').filter(m => m.id !== id);
    setStore('marks', marks);
  },

  getAverageByModule(moduleId: string): number | null {
    const moduleMark = this.getByModule(moduleId);
    if (moduleMark.length === 0) return null;
    const totalWeight = moduleMark.reduce((acc, m) => acc + m.weight, 0);
    const weightedSum = moduleMark.reduce((acc, m) => acc + m.percentage * m.weight, 0);
    return totalWeight > 0 ? weightedSum / totalWeight : null;
  },

  getOverallAverage(): number | null {
    const all = this.getAll();
    if (all.length === 0) return null;
    return all.reduce((acc, m) => acc + m.percentage, 0) / all.length;
  },
};

// ─── Chat Messages ───────────────────────────────────────────

export const chatDb = {
  getAll(): ChatMessage[] {
    return getStore<ChatMessage>('chat');
  },

  add(role: 'user' | 'assistant', content: string): ChatMessage {
    const messages = getStore<ChatMessage>('chat');
    const msg: ChatMessage = {
      id: generateId(),
      role,
      content,
      createdAt: new Date().toISOString(),
    };
    messages.push(msg);
    setStore('chat', messages);
    return msg;
  },

  clear(): void {
    setStore('chat', []);
  },
};

// ─── AI Insights ─────────────────────────────────────────────

export const insightsDb = {
  getAll(): AIInsight[] {
    return getStore<AIInsight>('insights');
  },

  getByModule(moduleId: string): AIInsight[] {
    return getStore<AIInsight>('insights').filter(i => i.moduleId === moduleId);
  },

  getGlobal(): AIInsight[] {
    return getStore<AIInsight>('insights').filter(i => i.moduleId === null);
  },

  add(insight: Omit<AIInsight, 'id' | 'generatedAt'>): AIInsight {
    const insights = getStore<AIInsight>('insights');
    const newInsight: AIInsight = {
      ...insight,
      id: generateId(),
      generatedAt: new Date().toISOString(),
    };
    insights.push(newInsight);
    setStore('insights', insights);
    return newInsight;
  },

  clear(): void {
    setStore('insights', []);
  },
};

// ─── User Preferences ───────────────────────────────────────

export const preferencesDb = {
  get(): UserPreferences {
    return getObject<UserPreferences>('preferences', DEFAULT_PREFERENCES);
  },

  update(data: Partial<UserPreferences>): UserPreferences {
    const current = this.get();
    const updated = { ...current, ...data };
    setObject('preferences', updated);
    return updated;
  },

  reset(): void {
    setObject('preferences', DEFAULT_PREFERENCES);
  },
};

// ─── Auth (mock, ready for Supabase swap) ────────────────────

export interface MockUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export const authDb = {
  getCurrentUser(): MockUser | null {
    return getObject<MockUser | null>('current_user', null);
  },

  signUp(email: string, password: string, name: string): MockUser {
    const users = getStore<MockUser & { password: string }>('users');
    const existing = users.find(u => u.email === email);
    if (existing) throw new Error('User already exists');

    const user: MockUser & { password: string } = {
      id: generateId(),
      email,
      name,
      password,
      createdAt: new Date().toISOString(),
    };
    users.push(user);
    setStore('users', users);

    const { password: _, ...safeUser } = user;
    setObject('current_user', safeUser);
    return safeUser;
  },

  signIn(email: string, password: string): MockUser {
    const users = getStore<MockUser & { password: string }>('users');
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Invalid email or password');

    const { password: _, ...safeUser } = user;
    setObject('current_user', safeUser);
    return safeUser;
  },

  signOut(): void {
    localStorage.removeItem('studypulse_current_user');
  },

  updateProfile(data: Partial<MockUser>): MockUser | null {
    const user = this.getCurrentUser();
    if (!user) return null;
    const updated = { ...user, ...data };
    setObject('current_user', updated);
    return updated;
  },
};
