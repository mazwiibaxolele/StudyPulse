import { useMemo, Fragment } from 'react';
import {
  LayoutDashboard,
  Clock,
  Target,
  TrendingUp,
  Flame,
  BookOpen,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
} from 'recharts';
import { useAppStore } from '../stores/appStore';
import { STUDY_METHODS, DEFAULT_GRADE_SCALES } from '../types';
import type { StudyMethod } from '../types';
import './DashboardPage.css';

// ─── Custom Tooltip ──────────────────────────────────────────

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip__label">{label}</div>
      {payload.map((item, i) => (
        <div key={i} className="chart-tooltip__row">
          <span className="chart-tooltip__dot" style={{ backgroundColor: item.color }} />
          <span>{item.name}: <strong>{typeof item.value === 'number' ? item.value.toFixed(1) : item.value}</strong></span>
        </div>
      ))}
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────

export default function DashboardPage() {
  const { modules, sessions, marks, preferences } = useAppStore();

  // ─── Computed Stats ────────────────────────────────────────

  const stats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const weekSessions = sessions.filter(s => new Date(s.startedAt) >= startOfWeek);
    const weekHours = weekSessions.reduce((acc, s) => acc + (s.durationMins || 0), 0) / 60;
    const totalSessions = weekSessions.length;
    const totalPomodoros = weekSessions.reduce((acc, s) => acc + (s.pomodorosDone || 0), 0);

    // Average mark (Weighted)
    let avgMark: number | null = null;
    if (marks.length > 0) {
      const totalWeight = marks.reduce((acc, m) => acc + (m.weight || 1), 0);
      const weightedSum = marks.reduce((acc, m) => acc + (m.percentage * (m.weight || 1)), 0);
      avgMark = totalWeight > 0 ? weightedSum / totalWeight : null;
    }

    // Streak (consecutive days with sessions)
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let d = 0; d < 365; d++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - d);
      const hasSession = sessions.some(s => {
        const sd = new Date(s.startedAt);
        return sd.getFullYear() === checkDate.getFullYear() &&
               sd.getMonth() === checkDate.getMonth() &&
               sd.getDate() === checkDate.getDate();
      });
      if (hasSession) streak++;
      else if (d > 0) break; // Allow today to not have a session yet
    }

    return { weekHours, totalSessions, totalPomodoros, avgMark, streak };
  }, [sessions, marks]);

  // ─── Hours by Module ───────────────────────────────────────

  const hoursByModule = useMemo(() => {
    return modules.map(mod => {
      const modSessions = sessions.filter(s => s.moduleId === mod.id);
      const hours = modSessions.reduce((acc, s) => acc + (s.durationMins || 0), 0) / 60;
      return { name: mod.name, hours: Math.round(hours * 10) / 10, color: mod.color };
    }).filter(m => m.hours > 0).sort((a, b) => b.hours - a.hours);
  }, [modules, sessions]);

  // ─── Marks Trend ───────────────────────────────────────────

  const marksTrend = useMemo(() => {
    if (marks.length === 0) return [];
    const sorted = [...marks].sort((a, b) => {
      const dDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return dDiff !== 0 ? dDiff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    const trendMap = new Map<string, any>();
    
    sorted.forEach(m => {
      const dateStr = new Date(m.date).toLocaleDateString('en', { month: 'short', day: 'numeric' });
      const mod = modules.find(mod => mod.id === m.moduleId);
      const modCode = mod?.code ?? 'Unknown';

      if (!trendMap.has(dateStr)) {
        trendMap.set(dateStr, { date: dateStr });
      }

      const entry = trendMap.get(dateStr);
      // Average marks on the same day for the same module
      if (entry[modCode] !== undefined) {
        entry[modCode] = (entry[modCode] + m.percentage) / 2;
      } else {
        entry[modCode] = m.percentage;
      }
    });

    return Array.from(trendMap.values()).map(entry => {
      // Round all percentages to 1 decimal place
      const rounded: any = { ...entry };
      for (const key in rounded) {
        if (key !== 'date' && typeof rounded[key] === 'number') {
          rounded[key] = Math.round(rounded[key] * 10) / 10;
        }
      }
      return rounded;
    });
  }, [marks, modules]);

  // ─── Method Effectiveness ──────────────────────────────────

  const methodRadar = useMemo(() => {
    const methods = Object.keys(STUDY_METHODS) as StudyMethod[];
    return methods.map(method => {
      const methodSessions = sessions.filter(s => s.studyMethod === method);
      const moduleIds = [...new Set(methodSessions.map(s => s.moduleId))];
      let avgMark = 0;
      let count = 0;
      moduleIds.forEach(modId => {
        const modMarks = marks.filter(m => m.moduleId === modId);
        if (modMarks.length > 0) {
          avgMark += modMarks.reduce((a, m) => a + m.percentage, 0) / modMarks.length;
          count++;
        }
      });
      const hours = methodSessions.reduce((a, s) => a + (s.durationMins || 0), 0) / 60;
      return {
        method: STUDY_METHODS[method].label.split(' ')[0], // Short label
        fullLabel: STUDY_METHODS[method].label,
        hours: Math.round(hours * 10) / 10,
        avgMark: count > 0 ? Math.round(avgMark / count) : 0,
      };
    }).filter(m => m.hours > 0);
  }, [sessions, marks]);

  // ─── Productivity Heatmap ──────────────────────────────────

  const heatmapData = useMemo(() => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const hours = Array.from({ length: 24 }, (_, i) => i);
    const grid: { day: string; hour: number; minutes: number }[] = [];

    days.forEach((day, dayIdx) => {
      hours.forEach(hour => {
        const mins = sessions
          .filter(s => {
            const d = new Date(s.startedAt);
            return d.getDay() === dayIdx && d.getHours() === hour;
          })
          .reduce((acc, s) => acc + (s.durationMins || 0), 0);
        grid.push({ day, hour, minutes: mins });
      });
    });

    return grid;
  }, [sessions]);

  const maxHeatmapMinutes = Math.max(...heatmapData.map(d => d.minutes), 1);

  // ─── Grade helper ──────────────────────────────────────────

  const gradeScale = DEFAULT_GRADE_SCALES.find(s => s.id === preferences.gradeScaleId)
    ?? DEFAULT_GRADE_SCALES[0];

  function getGradeColor(pct: number): string {
    const roundedPct = Math.round(pct);
    const range = gradeScale.ranges.find(r => roundedPct >= r.minPercent && roundedPct <= r.maxPercent);
    return range?.color ?? 'var(--text-muted)';
  }

  // ─── Has Data ──────────────────────────────────────────────

  const hasData = sessions.length > 0 || marks.length > 0;

  // ─── Render ────────────────────────────────────────────────

  return (
    <div className="page animate-fadeIn">
      <div className="page__header">
        <h1 className="page__title flex items-center gap-3">
          <LayoutDashboard size={28} />
          Dashboard
        </h1>
        <p className="page__subtitle">Your study overview at a glance</p>
      </div>

      {/* ── Stat Cards ──────────────────────────────────────── */}
      <div className="dashboard-stats">
        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
            <Clock size={20} />
          </div>
          <div className="stat-card__value">{stats.weekHours.toFixed(1)}<span className="stat-card__unit">h</span></div>
          <div className="stat-card__label">This week</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'var(--color-secondary-light)', color: 'var(--color-secondary)' }}>
            <Target size={20} />
          </div>
          <div className="stat-card__value">{stats.totalPomodoros}</div>
          <div className="stat-card__label">Pomodoros</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'var(--color-accent-light)', color: 'var(--color-accent)' }}>
            <TrendingUp size={20} />
          </div>
          <div className="stat-card__value">
            {stats.avgMark !== null ? (
              <span style={{ color: getGradeColor(stats.avgMark) }}>
                {stats.avgMark.toFixed(1)}%
              </span>
            ) : '—'}
          </div>
          <div className="stat-card__label">Avg mark</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon" style={{ background: 'var(--color-success-light)', color: 'var(--color-success)' }}>
            <Flame size={20} />
          </div>
          <div className="stat-card__value">{stats.streak}</div>
          <div className="stat-card__label">Day streak</div>
        </div>
      </div>

      {!hasData ? (
        /* ── Empty State ──────────────────────────────────────── */
        <div className="empty-state">
          <BookOpen size={64} className="empty-state__icon" />
          <h3 className="empty-state__title">No data yet</h3>
          <p className="empty-state__text">
            Start a study session or add some marks to see your analytics here.
          </p>
        </div>
      ) : (
        /* ── Charts Grid ──────────────────────────────────────── */
        <div className="dashboard-charts">

          {/* Marks Trend */}
          {marksTrend.length > 0 && (
            <div className="chart-card chart-card--wide">
              <h3 className="chart-card__title">Marks Trend</h3>
              <div className="chart-card__body">
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={marksTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" />
                    <XAxis dataKey="date" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-default)" />
                    <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-default)" />
                    <Tooltip content={<CustomTooltip />} />
                    {modules.filter(mod => marks.some(m => m.moduleId === mod.id)).map(mod => (
                      <Line
                        key={mod.id}
                        type="monotone"
                        dataKey={mod.code}
                        name={mod.code}
                        stroke={mod.color}
                        strokeWidth={2.5}
                        connectNulls={true}
                        dot={{ fill: mod.color, strokeWidth: 0, r: 4 }}
                        activeDot={{ r: 6, fill: mod.color }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Hours by Module */}
          {hoursByModule.length > 0 && (
            <div className="chart-card">
              <h3 className="chart-card__title">Hours by Module</h3>
              <div className="chart-card__body">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={hoursByModule} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-default)" horizontal={false} />
                    <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 12 }} stroke="var(--border-default)" />
                    <YAxis dataKey="name" type="category" tick={{ fill: 'var(--text-secondary)', fontSize: 12 }} stroke="var(--border-default)" width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="hours" name="Hours" radius={[0, 4, 4, 0]} maxBarSize={28}>
                      {hoursByModule.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Method Effectiveness */}
          {methodRadar.length > 2 && (
            <div className="chart-card">
              <h3 className="chart-card__title">Method Effectiveness</h3>
              <div className="chart-card__body">
                <ResponsiveContainer width="100%" height={280}>
                  <RadarChart data={methodRadar} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="var(--border-default)" />
                    <PolarAngleAxis dataKey="method" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: 'var(--text-muted)', fontSize: 10 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Radar name="Avg Mark" dataKey="avgMark" stroke="var(--color-primary)" fill="var(--color-primary)" fillOpacity={0.2} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Productivity Heatmap */}
          {sessions.length > 0 && (
            <div className="chart-card chart-card--wide">
              <h3 className="chart-card__title">Productivity Heatmap</h3>
              <p className="chart-card__subtitle">When you study most (minutes per hour slot)</p>
              <div className="heatmap-container">
                <div className="heatmap">
                  {/* Hour labels */}
                  <div className="heatmap__corner" />
                  {Array.from({ length: 24 }, (_, h) => (
                    <div key={h} className="heatmap__hour-label">
                      {h % 3 === 0 ? `${h}:00` : ''}
                    </div>
                  ))}

                  {/* Day rows */}
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                    <Fragment key={day}>
                      <div className="heatmap__day-label">{day}</div>
                      {Array.from({ length: 24 }, (_, h) => {
                        const cell = heatmapData.find(d => d.day === day && d.hour === h);
                        const intensity = cell ? cell.minutes / maxHeatmapMinutes : 0;
                        return (
                          <div
                            key={`${day}-${h}`}
                            className="heatmap__cell"
                            style={{
                              backgroundColor: intensity > 0
                                ? `rgba(20, 184, 166, ${0.1 + intensity * 0.8})`
                                : 'var(--bg-surface)',
                            }}
                            title={`${day} ${h}:00 — ${cell?.minutes ?? 0} min`}
                          />
                        );
                      })}
                    </Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
