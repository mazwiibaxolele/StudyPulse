import { useState, useRef, Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Timer,
  BookMarked,
  GraduationCap,
  Bot,
  LogOut,
  Camera,
  X,
} from 'lucide-react';
import { useAppStore } from '../../stores/appStore';
import './AppLayout.css';

// ─── Navigation definition ──────────────────────────────────

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/timer', label: 'Timer', icon: Timer },
  { path: '/modules', label: 'Modules', icon: BookMarked },
  { path: '/marks', label: 'Marks', icon: GraduationCap },
  { path: '/coach', label: 'AI Coach', icon: Bot },
] as const;

// ─── Helpers ─────────────────────────────────────────────────

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ─── Loading spinner ─────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="layout__loading">
      <div className="layout__spinner" />
    </div>
  );
}

// ─── Profile Modal ───────────────────────────────────────────

function ProfileModal({ onClose }: { onClose: () => void }) {
  const { user, updateUserProfile } = useAppStore();
  const [name, setName] = useState(user?.name || '');
  const [photoPreview, setPhotoPreview] = useState(user?.photoURL || '');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to base64 data URL for Firebase photoURL
    // Firebase photoURL supports any URL, and data URLs work for small images
    const reader = new FileReader();
    reader.onload = () => {
      // Resize image to keep it small
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 128;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d')!;
        
        // Crop to square from center
        const minDim = Math.min(img.width, img.height);
        const sx = (img.width - minDim) / 2;
        const sy = (img.height - minDim) / 2;
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setPhotoPreview(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await updateUserProfile({
        displayName: name.trim() || undefined,
        photoURL: photoPreview || undefined,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h3 className="modal__title">Edit Profile</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="profile-modal__content">
          {/* Avatar Upload */}
          <div className="profile-modal__avatar-section">
            <div className="profile-modal__avatar" onClick={() => fileInputRef.current?.click()}>
              {photoPreview ? (
                <img src={photoPreview} alt="Profile" className="profile-modal__avatar-img" />
              ) : (
                <span className="profile-modal__avatar-initials">{getInitials(name || user?.name)}</span>
              )}
              <div className="profile-modal__avatar-overlay">
                <Camera size={20} />
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <p className="profile-modal__avatar-hint">Click to upload a photo</p>
          </div>

          {/* Name */}
          <div className="auth-field">
            <label htmlFor="profile-name">Display Name</label>
            <input
              id="profile-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          {/* Email (read-only) */}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" value={user?.email || ''} disabled style={{ opacity: 0.5 }} />
          </div>

          {/* Actions */}
          <div className="modal__actions" style={{ marginTop: 'var(--space-4)' }}>
            <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────

export default function AppLayout() {
  const { user, signOut } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);

  const initials = getInitials(user?.name);

  return (
    <div className="layout">
      {/* ── Desktop Sidebar ───────────────────────────────── */}
      <aside className="sidebar">
        {/* Brand */}
        <NavLink to="/dashboard" className="sidebar__brand">
          <div className="sidebar__logo-icon">
            <Activity size={20} />
          </div>
          <div className="sidebar__logo-text">
            Study<span>Pulse</span>
          </div>
        </NavLink>

        {/* Nav Items */}
        <nav className="sidebar__nav">
          {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                `sidebar__nav-item${isActive ? ' sidebar__nav-item--active' : ''}`
              }
            >
              <Icon size={20} className="sidebar__nav-icon" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User Profile */}
        <div className="sidebar__profile">
          <div
            className="sidebar__avatar"
            onClick={() => setProfileOpen(true)}
            title="Edit profile"
            style={{ cursor: 'pointer' }}
          >
            {user?.photoURL ? (
              <img src={user.photoURL} alt="" className="sidebar__avatar-img" />
            ) : (
              initials
            )}
          </div>
          <div className="sidebar__user-info" onClick={() => setProfileOpen(true)} style={{ cursor: 'pointer' }}>
            <div className="sidebar__user-name">{user?.name ?? 'User'}</div>
            <div className="sidebar__user-email">{user?.email ?? ''}</div>
          </div>
          <button
            className="sidebar__signout"
            onClick={signOut}
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>

      {/* ── Mobile Top Bar ────────────────────────────────── */}
      <header className="topbar">
        <NavLink to="/dashboard" className="topbar__brand">
          <div className="topbar__icon">
            <Activity size={16} />
          </div>
          <div className="topbar__name">
            Study<span>Pulse</span>
          </div>
        </NavLink>
        <div
          className="topbar__avatar"
          onClick={() => setProfileOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          {user?.photoURL ? (
            <img src={user.photoURL} alt="" className="topbar__avatar-img" />
          ) : (
            initials
          )}
        </div>
      </header>

      {/* ── Page Content ──────────────────────────────────── */}
      <main className="layout__content">
        <Suspense fallback={<LoadingSpinner />}>
          <Outlet />
        </Suspense>
      </main>

      {/* ── Mobile Bottom Nav ─────────────────────────────── */}
      <nav className="bottom-nav">
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `bottom-nav__item${isActive ? ' bottom-nav__item--active' : ''}`
            }
          >
            <Icon size={22} className="bottom-nav__icon" />
            <span className="bottom-nav__label">{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* ── Profile Modal ─────────────────────────────────── */}
      {profileOpen && <ProfileModal onClose={() => setProfileOpen(false)} />}
    </div>
  );
}
