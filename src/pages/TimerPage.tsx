import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Star,
  MessageCircle,
  Brain,
  CalendarClock,
  PenTool,
  GitBranch,
  BookOpen,
  MoreHorizontal,
  Check,
  X,
} from 'lucide-react';
import { useTimerStore } from '../stores/timerStore';
import { useAppStore } from '../stores/appStore';
import type { StudyMethod } from '../types';
import { STUDY_METHODS } from '../types';
import './TimerPage.css';

// ─── Icon map ────────────────────────────────────────────────

const METHOD_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  MessageCircle,
  Brain,
  CalendarClock,
  PenTool,
  GitBranch,
  BookOpen,
  MoreHorizontal,
};

// ─── Component ───────────────────────────────────────────────

function playChime() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.5);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch(e) {
    console.error('Audio play failed', e);
  }
}

export default function TimerPage() {
  const timer = useTimerStore();
  const { modules, refreshSessions } = useAppStore();

  // Setup state
  const [selectedModuleId, setSelectedModuleId] = useState<string>(modules[0]?.id ?? '');
  const [selectedMethod, setSelectedMethod] = useState<StudyMethod>('active_recall');

  // Completion modal state
  const [focusRating, setFocusRating] = useState(0);
  const [sessionNotes, setSessionNotes] = useState('');

  // Tick interval
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (timer.isRunning) {
      intervalRef.current = setInterval(() => {
        timer.tick();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.isRunning]);

  // Update module selection when modules load
  useEffect(() => {
    if (!selectedModuleId && modules.length > 0) {
      setSelectedModuleId(modules[0].id);
    }
  }, [modules, selectedModuleId]);

  // Phase transition sounds & notifications
  const prevPhaseRef = useRef(timer.phase);
  useEffect(() => {
    if (prevPhaseRef.current !== timer.phase && timer.phase !== 'idle' && prevPhaseRef.current !== 'idle') {
      playChime();
      
      if ('Notification' in window && Notification.permission === 'granted') {
        const title = timer.phase === 'focus' ? 'Time to focus!' : 'Break time!';
        const body = timer.phase === 'focus' 
          ? 'Your break is over, let us get back to studying.' 
          : 'Take a short break and relax.';
        new Notification(title, { body, icon: '/favicon.svg' });
      }
    }
    prevPhaseRef.current = timer.phase;
  }, [timer.phase]);

  // ─── Derived values ────────────────────────────────────────

  const progress = timer.totalDuration > 0
    ? ((timer.totalDuration - timer.timeRemaining) / timer.totalDuration) * 100
    : 0;

  const minutes = Math.floor(timer.timeRemaining / 60);
  const seconds = timer.timeRemaining % 60;
  const timeDisplay = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const phaseLabel = {
    idle: 'Ready',
    focus: 'Focus',
    short_break: 'Short Break',
    long_break: 'Long Break',
  }[timer.phase];

  const phaseColor = {
    idle: 'var(--text-muted)',
    focus: 'var(--color-primary)',
    short_break: 'var(--color-secondary)',
    long_break: 'var(--color-accent)',
  }[timer.phase];

  const activeModule = modules.find(m => m.id === timer.activeModuleId);

  // Sync document title
  useEffect(() => {
    if (timer.phase !== 'idle' && timer.isRunning) {
      document.title = `${timeDisplay} - ${phaseLabel} | StudyPulse`;
    } else {
      document.title = 'StudyPulse';
    }
    return () => { document.title = 'StudyPulse'; };
  }, [timeDisplay, timer.phase, timer.isRunning, phaseLabel]);

  // SVG ring calculations
  const ringSize = 280;
  const strokeWidth = 6;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;

  // ─── Handlers ──────────────────────────────────────────────

  function handleStart() {
    if (!selectedModuleId) return;
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    timer.startTimer(selectedModuleId, selectedMethod);
  }

  function handleComplete() {
    timer.completeSession(focusRating, sessionNotes);
    refreshSessions();
    setFocusRating(0);
    setSessionNotes('');
  }

  function handleDismissModal() {
    timer.completeSession(0, '');
    refreshSessions();
    setFocusRating(0);
    setSessionNotes('');
  }

  // ─── Pomodoro dots ─────────────────────────────────────────

  const maxPomodoros = 4;
  const dots = Array.from({ length: maxPomodoros }, (_, i) => i < timer.pomodoroCount);

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="page animate-fadeIn">
      <div className="timer-page">

        {/* ── Timer Display ─────────────────────────────────── */}
        <div className="timer-display">
          <div className="timer-ring-container">
            <svg
              className="timer-ring"
              width={ringSize}
              height={ringSize}
              viewBox={`0 0 ${ringSize} ${ringSize}`}
            >
              {/* Background ring */}
              <circle
                className="timer-ring__bg"
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                strokeWidth={strokeWidth}
              />
              {/* Progress ring */}
              {timer.phase !== 'idle' && (
                <circle
                  className={`timer-ring__fill ${timer.isRunning ? 'timer-ring__fill--active' : ''}`}
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  strokeWidth={strokeWidth}
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  style={{ stroke: phaseColor }}
                />
              )}
            </svg>

            {/* Time text overlay */}
            <div className="timer-time">
              <div className="timer-time__display" style={{ color: timer.phase === 'idle' ? 'var(--text-muted)' : phaseColor }}>
                {timer.phase === 'idle' ? '25:00' : timeDisplay}
              </div>
              <div className="timer-time__label" style={{ color: phaseColor }}>
                {phaseLabel}
              </div>
            </div>

            {/* Pulse glow when running */}
            {timer.isRunning && (
              <div className="timer-glow" style={{ borderColor: phaseColor }} />
            )}
          </div>

          {/* Module badge */}
          {activeModule && timer.phase !== 'idle' && (
            <div className="timer-module-badge animate-fadeIn">
              <span
                className="color-dot"
                style={{ backgroundColor: activeModule.color }}
              />
              {activeModule.name}
            </div>
          )}

          {/* Pomodoro dots */}
          {timer.phase !== 'idle' && (
            <div className="timer-dots">
              {dots.map((filled, i) => (
                <div
                  key={i}
                  className={`timer-dot ${filled ? 'timer-dot--filled' : ''}`}
                  style={filled ? { backgroundColor: 'var(--color-primary)' } : {}}
                />
              ))}
              <span className="timer-dots__label">
                {timer.pomodoroCount}/{maxPomodoros} pomodoros
              </span>
            </div>
          )}
        </div>

        {/* ── Controls ──────────────────────────────────────── */}
        <div className="timer-controls">
          {timer.phase === 'idle' ? (
            <button
              className="btn btn-primary btn-lg timer-start-btn"
              onClick={handleStart}
              disabled={!selectedModuleId || modules.length === 0}
            >
              <Play size={20} />
              Start Focus
            </button>
          ) : (
            <div className="timer-controls__row">
              {timer.isRunning ? (
                <button className="btn btn-secondary btn-lg" onClick={timer.pauseTimer}>
                  <Pause size={20} />
                  Pause
                </button>
              ) : (
                <button className="btn btn-primary btn-lg" onClick={timer.resumeTimer}>
                  <Play size={20} />
                  Resume
                </button>
              )}
              <button className="btn btn-secondary btn-icon btn-lg" onClick={timer.skipPhase} title="Skip phase">
                <SkipForward size={20} />
              </button>
              <button className="btn btn-ghost btn-icon btn-lg" onClick={timer.resetTimer} title="Reset">
                <RotateCcw size={20} />
              </button>
            </div>
          )}
        </div>

        {/* ── Setup Panel (only when idle) ──────────────────── */}
        {timer.phase === 'idle' && (
          <div className="timer-setup animate-slideUp">
            {/* Module selector */}
            <div className="timer-setup__section">
              <label className="timer-setup__label">Module</label>
              {modules.length === 0 ? (
                <p className="timer-setup__hint">
                  Add a module first on the Modules page.
                </p>
              ) : (
                <select
                  value={selectedModuleId}
                  onChange={(e) => setSelectedModuleId(e.target.value)}
                  className="timer-setup__select"
                >
                  {modules.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.code ? `(${m.code})` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Study method selector */}
            <div className="timer-setup__section">
              <label className="timer-setup__label">Study Method</label>
              <div className="method-grid">
                {(Object.keys(STUDY_METHODS) as StudyMethod[]).map((key) => {
                  const method = STUDY_METHODS[key];
                  const Icon = METHOD_ICONS[method.icon] || MoreHorizontal;
                  const isSelected = selectedMethod === key;
                  return (
                    <button
                      key={key}
                      className={`method-card ${isSelected ? 'method-card--selected' : ''}`}
                      onClick={() => setSelectedMethod(key)}
                    >
                      <Icon size={20} />
                      <span className="method-card__label">{method.label}</span>
                      {isSelected && (
                        <div className="method-card__check">
                          <Check size={12} />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Completion Modal ──────────────────────────────────── */}
      {timer.showCompletionModal && (
        <div className="modal-backdrop" onClick={handleDismissModal}>
          <div className="modal animate-scaleIn" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Session Complete!</h2>
              <button className="btn btn-ghost btn-icon" onClick={handleDismissModal}>
                <X size={20} />
              </button>
            </div>

            <div className="completion-stats">
              <div className="completion-stat">
                <span className="completion-stat__value">{timer.totalPomodoros}</span>
                <span className="completion-stat__label">Pomodoros</span>
              </div>
              <div className="completion-stat">
                <span className="completion-stat__value">{timer.breaksTaken}</span>
                <span className="completion-stat__label">Breaks</span>
              </div>
            </div>

            {/* Focus Rating */}
            <div className="completion-section">
              <label className="timer-setup__label">How focused were you?</label>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    className={`star-btn ${star <= focusRating ? 'star-btn--active' : ''}`}
                    onClick={() => setFocusRating(star)}
                  >
                    <Star size={28} fill={star <= focusRating ? 'var(--color-accent)' : 'none'} />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="completion-section">
              <label className="timer-setup__label">Session notes (optional)</label>
              <textarea
                value={sessionNotes}
                onChange={(e) => setSessionNotes(e.target.value)}
                placeholder="What did you cover? Any breakthroughs?"
                rows={3}
              />
            </div>

            <button className="btn btn-primary btn-lg btn-full" onClick={handleComplete}>
              Save Session
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
