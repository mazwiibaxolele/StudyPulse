import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Award, X } from 'lucide-react';
import { format } from 'date-fns';
import { useAppStore } from '../stores/appStore';
import { DEFAULT_GRADE_SCALES, type Mark, type MarkType } from '../types';
import './MarksPage.css';

/* ─── Constants ──────────────────────────────────────────────── */
const MARK_TYPES: MarkType[] = ['test', 'exam', 'assignment', 'quiz', 'project', 'other'];

interface MarkFormData {
  moduleId: string;
  title: string;
  type: MarkType;
  score: string;
  total: string;
  date: string;
  weight: string;
}

const emptyForm = (defaultModuleId: string): MarkFormData => ({
  moduleId: defaultModuleId,
  title: '',
  type: 'test',
  score: '',
  total: '100',
  date: new Date().toISOString().slice(0, 10),
  weight: '1',
});

/* ─── Helpers ────────────────────────────────────────────────── */
function getGradeInfo(pct: number, scaleId: string) {
  const scale = DEFAULT_GRADE_SCALES.find(s => s.id === scaleId) ?? DEFAULT_GRADE_SCALES[0];
  for (const range of scale.ranges) {
    if (pct >= range.minPercent && pct <= range.maxPercent) {
      return range;
    }
  }
  return scale.ranges[scale.ranges.length - 1];
}

function pctColor(pct: number): string {
  if (pct >= 75) return '#10B981';
  if (pct >= 60) return '#14B8A6';
  if (pct >= 50) return '#F59E0B';
  if (pct >= 40) return '#F97316';
  return '#F43F5E';
}

/* ================================================================
   MarksPage
   ================================================================ */
export default function MarksPage() {
  const { modules, marks, addMark, deleteMark, preferences } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [filterModuleId, setFilterModuleId] = useState<string | null>(null);
  const [form, setForm] = useState<MarkFormData>(emptyForm(modules[0]?.id ?? ''));

  const gradeScale = useMemo(
    () => DEFAULT_GRADE_SCALES.find(s => s.id === preferences.gradeScaleId) ?? DEFAULT_GRADE_SCALES[0],
    [preferences.gradeScaleId],
  );

  /* ─── Derived data ─────────────────────────────────────── */
  const sortedMarks = useMemo(() => {
    let filtered = [...marks];
    if (filterModuleId) filtered = filtered.filter(m => m.moduleId === filterModuleId);
    return filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [marks, filterModuleId]);

  const groupedMarks = useMemo(() => {
    const groups = new Map<string, Mark[]>();
    for (const mark of sortedMarks) {
      const existing = groups.get(mark.moduleId) ?? [];
      existing.push(mark);
      groups.set(mark.moduleId, existing);
    }
    return groups;
  }, [sortedMarks]);

  const overallAvg = useMemo(() => {
    if (marks.length === 0) return null;
    return marks.reduce((acc, m) => acc + m.percentage, 0) / marks.length;
  }, [marks]);

  /* ─── Live preview ─────────────────────────────────────── */
  const livePercent = useMemo(() => {
    const s = parseFloat(form.score);
    const t = parseFloat(form.total);
    if (isNaN(s) || isNaN(t) || t <= 0) return null;
    return Math.min((s / t) * 100, 100);
  }, [form.score, form.total]);

  /* ─── Modal helpers ────────────────────────────────────── */
  const openAdd = useCallback(() => {
    setForm(emptyForm(filterModuleId ?? modules[0]?.id ?? ''));
    setModalOpen(true);
  }, [filterModuleId, modules]);

  const closeModal = useCallback(() => setModalOpen(false), []);

  const handleSave = useCallback(() => {
    const score = parseFloat(form.score);
    const total = parseFloat(form.total);
    const weight = parseFloat(form.weight);
    if (!form.title.trim() || !form.moduleId || isNaN(score) || isNaN(total) || total <= 0) return;
    addMark({
      moduleId: form.moduleId,
      title: form.title.trim(),
      type: form.type,
      score,
      total,
      percentage: livePercent!,
      date: form.date,
      weight: isNaN(weight) || weight <= 0 ? 1 : weight,
    });
    closeModal();
  }, [form, addMark, closeModal]);

  const handleDelete = useCallback((id: string) => {
    deleteMark(id);
  }, [deleteMark]);

  /* ─── Render ───────────────────────────────────────────── */
  return (
    <div className="page">
      {/* Header */}
      <div className="page__header flex items-center justify-between">
        <div>
          <h1 className="page__title">My Marks</h1>
          <p className="page__subtitle">Track your academic performance</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd} disabled={modules.length === 0}>
          <Plus size={18} />
          Add Mark
        </button>
      </div>

      {/* Grade Scale Legend */}
      <div className="grade-scale">
        <div className="grade-scale__title">{gradeScale.name}</div>
        <div className="grade-scale__items">
          {gradeScale.ranges.map(r => (
            <span key={r.label} className="grade-scale__item" style={{ background: `${r.color}18`, color: r.color }}>
              <span className="grade-scale__item-dot" style={{ background: r.color }} />
              {r.label} ({r.symbol})
            </span>
          ))}
        </div>
      </div>

      {/* Overall Average */}
      {overallAvg != null && (
        <div className="marks-overall">
          <span className="marks-overall__value" style={{ color: pctColor(overallAvg) }}>
            {overallAvg.toFixed(1)}%
          </span>
          <div className="marks-overall__meta">
            <span className="marks-overall__label">Overall Average</span>
            <span
              className="marks-overall__badge"
              style={{
                background: `${getGradeInfo(overallAvg, preferences.gradeScaleId).color}18`,
                color: getGradeInfo(overallAvg, preferences.gradeScaleId).color,
              }}
            >
              <Award size={14} />
              {getGradeInfo(overallAvg, preferences.gradeScaleId).label}
            </span>
          </div>
        </div>
      )}

      {/* Module Filter Tabs */}
      {modules.length > 0 && (
        <div className="marks-filter">
          <button
            className={`marks-filter__tab${filterModuleId === null ? ' marks-filter__tab--active' : ''}`}
            onClick={() => setFilterModuleId(null)}
          >
            All
          </button>
          {modules.map(mod => (
            <button
              key={mod.id}
              className={`marks-filter__tab${filterModuleId === mod.id ? ' marks-filter__tab--active' : ''}`}
              onClick={() => setFilterModuleId(mod.id)}
            >
              <span className="marks-filter__dot" style={{ background: mod.color }} />
              {mod.name}
            </button>
          ))}
        </div>
      )}

      {/* Marks List */}
      {sortedMarks.length === 0 ? (
        <div className="empty-state">
          <Award className="empty-state__icon" size={64} strokeWidth={1.2} />
          <h3 className="empty-state__title">No marks yet</h3>
          <p className="empty-state__text">
            {modules.length === 0
              ? 'Add a module first, then start tracking your marks.'
              : 'Add your first mark to start tracking your performance.'}
          </p>
          {modules.length > 0 && (
            <button className="btn btn-primary" onClick={openAdd}>
              <Plus size={18} />
              Add Mark
            </button>
          )}
        </div>
      ) : (
        Array.from(groupedMarks.entries()).map(([moduleId, groupMarks]) => {
          const mod = modules.find(m => m.id === moduleId);
          if (!mod) return null;
          return (
            <div key={moduleId} className="marks-group">
              <div className="marks-group__header">
                <span className="marks-group__dot" style={{ background: mod.color }} />
                <span className="marks-group__name">{mod.name}</span>
                <span className="marks-group__count">
                  {groupMarks.length} mark{groupMarks.length !== 1 ? 's' : ''}
                </span>
              </div>
              {groupMarks.map(mark => (
                <div key={mark.id} className="mark-row">
                  <div className="mark-row__info">
                    <div className="mark-row__title">{mark.title}</div>
                    <div className="mark-row__date">{format(new Date(mark.date), 'dd MMM yyyy')}</div>
                  </div>
                  <span className={`mark-row__type-badge type-badge--${mark.type}`}>
                    {mark.type}
                  </span>
                  <span className="mark-row__score">
                    {mark.score}/{mark.total}
                  </span>
                  <span className="mark-row__pct" style={{ color: pctColor(mark.percentage) }}>
                    {mark.percentage.toFixed(0)}%
                  </span>
                  <button
                    className="mark-row__delete"
                    onClick={() => handleDelete(mark.id)}
                    title="Delete mark"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          );
        })
      )}

      {/* ─── Add Mark Modal ─────────────────────────────────── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">Add Mark</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className="mark-form">
              {/* Module */}
              <div className="mark-form__group">
                <label htmlFor="mark-module">Module</label>
                <select
                  id="mark-module"
                  value={form.moduleId}
                  onChange={e => setForm(p => ({ ...p, moduleId: e.target.value }))}
                >
                  <option value="" disabled>Select module…</option>
                  {modules.map(m => (
                    <option key={m.id} value={m.id}>{m.name}{m.code ? ` (${m.code})` : ''}</option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div className="mark-form__group">
                <label htmlFor="mark-title">Title</label>
                <input
                  id="mark-title"
                  type="text"
                  placeholder="e.g. Midterm Exam"
                  value={form.title}
                  onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Type */}
              <div className="mark-form__group">
                <label htmlFor="mark-type">Type</label>
                <select
                  id="mark-type"
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value as MarkType }))}
                >
                  {MARK_TYPES.map(t => (
                    <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Score / Total / Weight */}
              <div className="mark-form__row mark-form__row--three">
                <div className="mark-form__group">
                  <label htmlFor="mark-score">Score</label>
                  <input
                    id="mark-score"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0"
                    value={form.score}
                    onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
                  />
                </div>
                <div className="mark-form__group">
                  <label htmlFor="mark-total">Out of</label>
                  <input
                    id="mark-total"
                    type="number"
                    min={1}
                    step="any"
                    placeholder="100"
                    value={form.total}
                    onChange={e => setForm(p => ({ ...p, total: e.target.value }))}
                  />
                </div>
                <div className="mark-form__group">
                  <label htmlFor="mark-weight">Weight</label>
                  <input
                    id="mark-weight"
                    type="number"
                    min={0}
                    step="any"
                    placeholder="1"
                    value={form.weight}
                    onChange={e => setForm(p => ({ ...p, weight: e.target.value }))}
                  />
                </div>
              </div>

              {/* Live Preview */}
              <div className="mark-form__preview">
                <span
                  className="mark-form__preview-value"
                  style={{ color: livePercent != null ? pctColor(livePercent) : 'var(--text-muted)' }}
                >
                  {livePercent != null ? `${livePercent.toFixed(1)}%` : '—'}
                </span>
                <span className="mark-form__preview-label">
                  {livePercent != null
                    ? getGradeInfo(livePercent, preferences.gradeScaleId).label
                    : 'Enter score'}
                </span>
              </div>

              {/* Date */}
              <div className="mark-form__group">
                <label htmlFor="mark-date">Date</label>
                <input
                  id="mark-date"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                />
              </div>

              {/* Actions */}
              <div className="modal__actions">
                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={!form.title.trim() || !form.moduleId || livePercent === null}
                >
                  Save Mark
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
