/**
 * Timer Store — Pomodoro state management with persist middleware
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TimerPhase, StudyMethod } from '../types';
import { DEFAULT_PREFERENCES } from '../types';
import { sessionsDb } from '../lib/db';
import { useAppStore } from './appStore';

// ─── Types ───────────────────────────────────────────────────

interface TimerStore {
  // State
  phase: TimerPhase;
  timeRemaining: number;
  totalDuration: number;
  isRunning: boolean;
  pomodoroCount: number;
  totalPomodoros: number;
  activeModuleId: string | null;
  activeMethod: StudyMethod | null;
  sessionStartedAt: string | null;
  breaksTaken: number;
  showCompletionModal: boolean;

  // Actions
  startTimer: (moduleId: string, method: StudyMethod) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  tick: () => void;
  skipPhase: () => void;
  resetTimer: () => void;
  completeSession: (focusRating: number, notes: string) => void;
  setShowCompletionModal: (show: boolean) => void;
}

// ─── Helpers ─────────────────────────────────────────────────

function getPhaseDuration(phase: TimerPhase): number {
  const prefs = useAppStore.getState().preferences;
  switch (phase) {
    case 'focus':
      return (prefs.focusDuration ?? DEFAULT_PREFERENCES.focusDuration) * 60;
    case 'short_break':
      return (prefs.shortBreakDuration ?? DEFAULT_PREFERENCES.shortBreakDuration) * 60;
    case 'long_break':
      return (prefs.longBreakDuration ?? DEFAULT_PREFERENCES.longBreakDuration) * 60;
    default:
      return 0;
  }
}

function getMaxPomodoros(): number {
  const prefs = useAppStore.getState().preferences;
  return prefs.pomodorosBeforeLongBreak;
}

// ─── Store ───────────────────────────────────────────────────

export const useTimerStore = create<TimerStore>()(
  persist(
    (set, get) => ({
      // Initial state
      phase: 'idle',
      timeRemaining: 0,
      totalDuration: 0,
      isRunning: false,
      pomodoroCount: 0,
      totalPomodoros: 0,
      activeModuleId: null,
      activeMethod: null,
      sessionStartedAt: null,
      breaksTaken: 0,
      showCompletionModal: false,
      targetTime: null, // added for background sync

      startTimer: (moduleId: string, method: StudyMethod) => {
        const duration = getPhaseDuration('focus');
        set({
          phase: 'focus',
          timeRemaining: duration,
          totalDuration: duration,
          isRunning: true,
          pomodoroCount: 0,
          totalPomodoros: 0,
          activeModuleId: moduleId,
          activeMethod: method,
          sessionStartedAt: new Date().toISOString(),
          breaksTaken: 0,
          showCompletionModal: false,
          targetTime: Date.now() + duration * 1000,
        });
      },

      pauseTimer: () => {
        set({ isRunning: false, targetTime: null });
      },

      resumeTimer: () => {
        const state = get();
        set({
          isRunning: true,
          targetTime: Date.now() + state.timeRemaining * 1000,
        });
      },

      tick: () => {
        const state = get();
        if (!state.isRunning || state.phase === 'idle' || !state.targetTime) return;

        const newTime = Math.ceil((state.targetTime - Date.now()) / 1000);

        if (newTime > 0) {
          set({ timeRemaining: newTime });
          return;
        }

        // Timer hit zero — transition phases
        const maxPomodoros = getMaxPomodoros();
        const prefs = useAppStore.getState().preferences;

        if (state.phase === 'focus') {
          const newPomodoroCount = state.pomodoroCount + 1;
          const newTotalPomodoros = state.totalPomodoros + 1;

          if (newPomodoroCount >= maxPomodoros) {
            // Time for a long break
            const duration = getPhaseDuration('long_break');
            set({
              phase: 'long_break',
              timeRemaining: duration,
              totalDuration: duration,
              pomodoroCount: newPomodoroCount,
              totalPomodoros: newTotalPomodoros,
              breaksTaken: state.breaksTaken + 1,
              isRunning: prefs.autoStartBreaks,
              targetTime: prefs.autoStartBreaks ? Date.now() + duration * 1000 : null,
            });
          } else {
            // Short break
            const duration = getPhaseDuration('short_break');
            set({
              phase: 'short_break',
              timeRemaining: duration,
              totalDuration: duration,
              pomodoroCount: newPomodoroCount,
              totalPomodoros: newTotalPomodoros,
              breaksTaken: state.breaksTaken + 1,
              isRunning: prefs.autoStartBreaks,
              targetTime: prefs.autoStartBreaks ? Date.now() + duration * 1000 : null,
            });
          }
        } else if (state.phase === 'short_break') {
          // After short break → next focus
          const duration = getPhaseDuration('focus');
          set({
            phase: 'focus',
            timeRemaining: duration,
            totalDuration: duration,
            isRunning: prefs.autoStartBreaks,
            targetTime: prefs.autoStartBreaks ? Date.now() + duration * 1000 : null,
          });
        } else if (state.phase === 'long_break') {
          // After long break → show completion modal
          set({
            isRunning: false,
            timeRemaining: 0,
            showCompletionModal: true,
            targetTime: null,
          });
        }
      },

      skipPhase: () => {
        const state = get();
        const prefs = useAppStore.getState().preferences;

        if (state.phase === 'focus') {
          const newPomodoroCount = state.pomodoroCount + 1;
          const newTotalPomodoros = state.totalPomodoros + 1;
          const maxPomodoros = getMaxPomodoros();

          if (newPomodoroCount >= maxPomodoros) {
            const duration = getPhaseDuration('long_break');
            set({
              phase: 'long_break',
              timeRemaining: duration,
              totalDuration: duration,
              pomodoroCount: newPomodoroCount,
              totalPomodoros: newTotalPomodoros,
              breaksTaken: state.breaksTaken + 1,
              isRunning: prefs.autoStartBreaks,
              targetTime: prefs.autoStartBreaks ? Date.now() + duration * 1000 : null,
            });
          } else {
            const duration = getPhaseDuration('short_break');
            set({
              phase: 'short_break',
              timeRemaining: duration,
              totalDuration: duration,
              pomodoroCount: newPomodoroCount,
              totalPomodoros: newTotalPomodoros,
              breaksTaken: state.breaksTaken + 1,
              isRunning: prefs.autoStartBreaks,
              targetTime: prefs.autoStartBreaks ? Date.now() + duration * 1000 : null,
            });
          }
        } else if (state.phase === 'short_break') {
          const duration = getPhaseDuration('focus');
          set({
            phase: 'focus',
            timeRemaining: duration,
            totalDuration: duration,
            isRunning: prefs.autoStartBreaks,
            targetTime: prefs.autoStartBreaks ? Date.now() + duration * 1000 : null,
          });
        } else if (state.phase === 'long_break') {
          set({
            isRunning: false,
            timeRemaining: 0,
            showCompletionModal: true,
            targetTime: null,
          });
        }
      },

      resetTimer: () => {
        set({
          phase: 'idle',
          timeRemaining: 0,
          totalDuration: 0,
          isRunning: false,
          pomodoroCount: 0,
          totalPomodoros: 0,
          activeModuleId: null,
          activeMethod: null,
          sessionStartedAt: null,
          breaksTaken: 0,
          showCompletionModal: false,
          targetTime: null,
        });
      },

      completeSession: async (focusRating: number, notes: string) => {
        const state = get();
        if (!state.activeModuleId || !state.activeMethod || !state.sessionStartedAt) return;

        const now = new Date().toISOString();
        const startTime = new Date(state.sessionStartedAt).getTime();
        const durationMins = Math.round((Date.now() - startTime) / 60000);

        try {
          await sessionsDb.create({
            moduleId: state.activeModuleId,
            studyMethod: state.activeMethod,
            startedAt: state.sessionStartedAt,
            endedAt: now,
            durationMins,
            pomodorosDone: state.totalPomodoros,
            breaksTaken: state.breaksTaken,
            focusRating,
            notes,
          });
          useAppStore.getState().refreshSessions();
        } catch (e) {
          console.error("Failed to log session:", e);
        }

        // Reset everything
        set({
          phase: 'idle',
          timeRemaining: 0,
          totalDuration: 0,
          isRunning: false,
          pomodoroCount: 0,
          totalPomodoros: 0,
          activeModuleId: null,
          activeMethod: null,
          sessionStartedAt: null,
          breaksTaken: 0,
          showCompletionModal: false,
          targetTime: null,
        });
      },

      setShowCompletionModal: (show: boolean) => {
        set({ showCompletionModal: show });
      },
    }),
    {
      name: 'studypulse-timer',
      // Don't persist isRunning — timer should be paused on refresh
      partialize: (state) => ({
        phase: state.phase,
        timeRemaining: state.timeRemaining,
        totalDuration: state.totalDuration,
        isRunning: false, // Always pause on refresh
        pomodoroCount: state.pomodoroCount,
        totalPomodoros: state.totalPomodoros,
        activeModuleId: state.activeModuleId,
        activeMethod: state.activeMethod,
        sessionStartedAt: state.sessionStartedAt,
        breaksTaken: state.breaksTaken,
        showCompletionModal: state.showCompletionModal,
      }),
    }
  )
);
