import { useState, useMemo, useCallback } from 'react';
import { Plus, Pencil, Archive, BookOpen, X } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import './ModulesPage.css';

/* ─── Constants ──────────────────────────────────────────────── */
const PRESET_COLORS = [
  '#14B8A6', '#38BDF8', '#F59E0B', '#10B981', '#F43F5E',
  '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316',
];

interface ModuleFormData {
  name: string;
  code: string;
  color: string;
  credits: number;
}

const EMPTY_FORM: ModuleFormData = {
  name: '',
  code: '',
  color: PRESET_COLORS[0],
  credits: 1,
};

/* ================================================================
   ModulesPage
   ================================================================ */
export default function ModulesPage() {
  const { modules, sessions, marks, addModule, updateModule, archiveModule } = useAppStore();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ModuleFormData>(EMPTY_FORM);

  /* ─── Derived stats ────────────────────────────────────── */
  const moduleStats = useMemo(() => {
    const map = new Map<string, { hours: number; sessionCount: number; avgMark: number | null }>();
    for (const mod of modules) {
      const modSessions = sessions.filter(s => s.moduleId === mod.id);
      const totalMins = modSessions.reduce((acc, s) => acc + (s.durationMins || 0), 0);
      const modMarks = marks.filter(m => m.moduleId === mod.id);
      let avg: number | null = null;
      if (modMarks.length > 0) {
        const totalWeight = modMarks.reduce((acc, m) => acc + m.weight, 0);
        const weightedSum = modMarks.reduce((acc, m) => acc + m.percentage * m.weight, 0);
        avg = totalWeight > 0 ? weightedSum / totalWeight : null;
      }
      map.set(mod.id, { hours: totalMins / 60, sessionCount: modSessions.length, avgMark: avg });
    }
    return map;
  }, [modules, sessions, marks]);

  /* ─── Modal helpers ────────────────────────────────────── */
  const openAdd = useCallback(() => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((mod: typeof modules[0]) => {
    setEditingId(mod.id);
    setForm({ name: mod.name, code: mod.code, color: mod.color, credits: mod.credits });
    setModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setModalOpen(false);
    setEditingId(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateModule(editingId, { name: form.name.trim(), code: form.code.trim(), color: form.color, credits: form.credits });
    } else {
      addModule({ name: form.name.trim(), code: form.code.trim(), color: form.color, credits: form.credits });
    }
    closeModal();
  }, [form, editingId, addModule, updateModule, closeModal]);

  const handleArchive = useCallback((id: string) => {
    archiveModule(id);
  }, [archiveModule]);

  /* ─── Render ───────────────────────────────────────────── */
  return (
    <div className="page">
      {/* Header */}
      <div className="page__header flex items-center justify-between">
        <div>
          <h1 className="page__title">My Modules</h1>
          <p className="page__subtitle">Manage your courses and subjects</p>
        </div>
        <button className="btn btn-primary" onClick={openAdd}>
          <Plus size={18} />
          Add Module
        </button>
      </div>

      {/* Grid or Empty State */}
      {modules.length === 0 ? (
        <div className="empty-state">
          <BookOpen className="empty-state__icon" size={64} strokeWidth={1.2} />
          <h3 className="empty-state__title">No modules yet</h3>
          <p className="empty-state__text">
            Add your first module to start tracking your study hours and marks.
          </p>
          <button className="btn btn-primary" onClick={openAdd}>
            <Plus size={18} />
            Add Module
          </button>
        </div>
      ) : (
        <div className="modules-grid">
          {modules.map(mod => {
            const stats = moduleStats.get(mod.id);
            return (
              <div
                key={mod.id}
                className="module-card"
                style={{
                  '--module-color': mod.color,
                  '--module-glow': `${mod.color}25`,
                } as React.CSSProperties}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${mod.color}20`;
                  (e.currentTarget as HTMLElement).style.borderColor = `${mod.color}50`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.boxShadow = '';
                  (e.currentTarget as HTMLElement).style.borderColor = '';
                }}
              >
                <div className="module-card__color-bar" style={{ background: mod.color }} />
                <div className="module-card__body">
                  <div className="module-card__top">
                    <div className="module-card__info">
                      <div className="module-card__name">{mod.name}</div>
                      {mod.code && <div className="module-card__code">{mod.code}</div>}
                    </div>
                    <div className="module-card__actions">
                      <button
                        className="module-card__action-btn"
                        onClick={() => openEdit(mod)}
                        title="Edit module"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        className="module-card__action-btn module-card__action-btn--danger"
                        onClick={() => handleArchive(mod.id)}
                        title="Archive module"
                      >
                        <Archive size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="module-card__stats">
                    <div className="module-stat">
                      <span className="module-stat__value">
                        {stats ? stats.hours.toFixed(1) : '0.0'}
                      </span>
                      <span className="module-stat__label">Hours</span>
                    </div>
                    <div className="module-stat">
                      <span className="module-stat__value">
                        {stats ? stats.sessionCount : 0}
                      </span>
                      <span className="module-stat__label">Sessions</span>
                    </div>
                    <div className="module-stat">
                      <span className="module-stat__value">
                        {stats?.avgMark != null ? `${stats.avgMark.toFixed(0)}%` : '—'}
                      </span>
                      <span className="module-stat__label">Avg Mark</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Add / Edit Modal ───────────────────────────────── */}
      {modalOpen && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="modal__header">
              <h2 className="modal__title">{editingId ? 'Edit Module' : 'Add Module'}</h2>
              <button className="btn btn-ghost btn-icon" onClick={closeModal}>
                <X size={18} />
              </button>
            </div>

            <div className="module-form">
              {/* Name */}
              <div className="module-form__group">
                <label htmlFor="mod-name">Module Name *</label>
                <input
                  id="mod-name"
                  type="text"
                  placeholder="e.g. Calculus II"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  autoFocus
                />
              </div>

              {/* Code + Credits */}
              <div className="module-form__row">
                <div className="module-form__group">
                  <label htmlFor="mod-code">Module Code</label>
                  <input
                    id="mod-code"
                    type="text"
                    placeholder="e.g. MAT101"
                    value={form.code}
                    onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
                  />
                </div>
                <div className="module-form__group">
                  <label htmlFor="mod-credits">Credits</label>
                  <input
                    id="mod-credits"
                    type="number"
                    min={1}
                    value={form.credits}
                    onChange={e => setForm(p => ({ ...p, credits: Math.max(1, Number(e.target.value)) }))}
                  />
                </div>
              </div>

              {/* Color Picker */}
              <div className="module-form__group">
                <label>Color</label>
                <div className="color-picker">
                  {PRESET_COLORS.map(c => (
                    <button
                      key={c}
                      type="button"
                      className={`color-picker__swatch${form.color === c ? ' color-picker__swatch--selected' : ''}`}
                      style={{ background: c, color: c }}
                      onClick={() => setForm(p => ({ ...p, color: c }))}
                      aria-label={`Select color ${c}`}
                    />
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="modal__actions">
                <button className="btn btn-secondary" onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={!form.name.trim()}
                >
                  {editingId ? 'Save Changes' : 'Add Module'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
