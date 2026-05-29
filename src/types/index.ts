// ─── Study Methods ───────────────────────────────────────────
export type StudyMethod =
  | 'feynman'
  | 'active_recall'
  | 'spaced_repetition'
  | 'practice_problems'
  | 'mind_mapping'
  | 'rereading'
  | 'other';

export const STUDY_METHODS: Record<StudyMethod, { label: string; description: string; icon: string }> = {
  feynman: {
    label: 'Feynman Technique',
    description: 'Explain concepts in simple terms as if teaching someone',
    icon: 'MessageCircle',
  },
  active_recall: {
    label: 'Active Recall',
    description: 'Test yourself without looking at notes',
    icon: 'Brain',
  },
  spaced_repetition: {
    label: 'Spaced Repetition',
    description: 'Review material at increasing intervals',
    icon: 'CalendarClock',
  },
  practice_problems: {
    label: 'Practice Problems',
    description: 'Solve exercises and past papers',
    icon: 'PenTool',
  },
  mind_mapping: {
    label: 'Mind Mapping',
    description: 'Create visual diagrams connecting ideas',
    icon: 'GitBranch',
  },
  rereading: {
    label: 'Re-reading',
    description: 'Read through notes and textbook again',
    icon: 'BookOpen',
  },
  other: {
    label: 'Other',
    description: 'Custom study method',
    icon: 'MoreHorizontal',
  },
};

// ─── Modules ─────────────────────────────────────────────────
export interface Module {
  id: string;
  name: string;
  code: string;
  color: string;
  credits: number;
  isActive: boolean;
  createdAt: string;
}

// ─── Study Sessions ──────────────────────────────────────────
export interface StudySession {
  id: string;
  moduleId: string;
  studyMethod: StudyMethod;
  startedAt: string;
  endedAt: string | null;
  durationMins: number;
  pomodorosDone: number;
  breaksTaken: number;
  focusRating: number | null; // 1-5
  notes: string;
  createdAt: string;
}

// ─── Marks & Grading ─────────────────────────────────────────
export type MarkType = 'test' | 'exam' | 'assignment' | 'quiz' | 'project' | 'other';

export interface GradeScale {
  id: string;
  name: string;          // e.g. "South African University", "US GPA"
  ranges: GradeRange[];
}

export interface GradeRange {
  label: string;    // e.g. "A+", "Distinction", "First Class"
  symbol: string;   // e.g. "A+", "75+", "1st"
  minPercent: number;
  maxPercent: number;
  color: string;    // display color
}

export const DEFAULT_GRADE_SCALES: GradeScale[] = [
  {
    id: 'sa-university',
    name: 'South African University',
    ranges: [
      { label: 'Distinction', symbol: '75+', minPercent: 75, maxPercent: 100, color: '#10B981' },
      { label: 'Merit', symbol: '70-74', minPercent: 70, maxPercent: 74, color: '#14B8A6' },
      { label: 'First Class', symbol: '60-69', minPercent: 60, maxPercent: 69, color: '#38BDF8' },
      { label: 'Second Class', symbol: '50-59', minPercent: 50, maxPercent: 59, color: '#F59E0B' },
      { label: 'Third Class', symbol: '40-49', minPercent: 40, maxPercent: 49, color: '#F97316' },
      { label: 'Fail', symbol: '<40', minPercent: 0, maxPercent: 39, color: '#F43F5E' },
    ],
  },
  {
    id: 'percentage',
    name: 'Percentage',
    ranges: [
      { label: 'A+', symbol: 'A+', minPercent: 90, maxPercent: 100, color: '#10B981' },
      { label: 'A', symbol: 'A', minPercent: 80, maxPercent: 89, color: '#14B8A6' },
      { label: 'B', symbol: 'B', minPercent: 70, maxPercent: 79, color: '#38BDF8' },
      { label: 'C', symbol: 'C', minPercent: 60, maxPercent: 69, color: '#F59E0B' },
      { label: 'D', symbol: 'D', minPercent: 50, maxPercent: 59, color: '#F97316' },
      { label: 'F', symbol: 'F', minPercent: 0, maxPercent: 49, color: '#F43F5E' },
    ],
  },
  {
    id: 'gpa-4',
    name: 'GPA (4.0 Scale)',
    ranges: [
      { label: '4.0', symbol: '4.0', minPercent: 93, maxPercent: 100, color: '#10B981' },
      { label: '3.7', symbol: '3.7', minPercent: 90, maxPercent: 92, color: '#14B8A6' },
      { label: '3.3', symbol: '3.3', minPercent: 87, maxPercent: 89, color: '#38BDF8' },
      { label: '3.0', symbol: '3.0', minPercent: 83, maxPercent: 86, color: '#38BDF8' },
      { label: '2.7', symbol: '2.7', minPercent: 80, maxPercent: 82, color: '#F59E0B' },
      { label: '2.0', symbol: '2.0', minPercent: 70, maxPercent: 79, color: '#F59E0B' },
      { label: '1.0', symbol: '1.0', minPercent: 60, maxPercent: 69, color: '#F97316' },
      { label: '0.0', symbol: '0.0', minPercent: 0, maxPercent: 59, color: '#F43F5E' },
    ],
  },
];

export interface Mark {
  id: string;
  moduleId: string;
  title: string;
  type: MarkType;
  score: number;
  total: number;
  percentage: number;
  date: string;
  weight: number;
  createdAt: string;
}

// ─── AI / Chat ───────────────────────────────────────────────
export type ChatRole = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: string;
}

export interface AIInsight {
  id: string;
  moduleId: string | null;
  type: 'method_effectiveness' | 'productivity_pattern' | 'recommendation' | 'correlation';
  content: Record<string, unknown>;
  summary: string;
  generatedAt: string;
}

// ─── Timer ───────────────────────────────────────────────────
export type TimerPhase = 'idle' | 'focus' | 'short_break' | 'long_break';

export interface TimerState {
  phase: TimerPhase;
  timeRemaining: number;     // seconds
  isRunning: boolean;
  pomodoroCount: number;     // completed in current set
  totalPomodoros: number;    // all-time in this session
  activeModuleId: string | null;
  activeMethod: StudyMethod | null;
  sessionStartedAt: string | null;
}

// ─── Navigation ──────────────────────────────────────────────
export interface NavItem {
  path: string;
  label: string;
  icon: string;
}

// ─── User Preferences ───────────────────────────────────────
export interface UserPreferences {
  focusDuration: number;       // minutes (default 25)
  shortBreakDuration: number;  // minutes (default 5)
  longBreakDuration: number;   // minutes (default 15)
  pomodorosBeforeLongBreak: number; // default 4
  gradeScaleId: string;
  autoStartBreaks: boolean;
  soundEnabled: boolean;
}

export const DEFAULT_PREFERENCES: UserPreferences = {
  focusDuration: 25,
  shortBreakDuration: 5,
  longBreakDuration: 15,
  pomodorosBeforeLongBreak: 6,
  gradeScaleId: 'percentage',
  autoStartBreaks: true,
  soundEnabled: true,
};
