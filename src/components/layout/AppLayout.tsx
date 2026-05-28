import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Timer,
  BookMarked,
  GraduationCap,
  Bot,
  LogOut,
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

function getInitials(name: string): string {
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

// ─── Component ───────────────────────────────────────────────

export default function AppLayout() {
  const { user, signOut } = useAppStore();

  const initials = user?.name ? getInitials(user.name) : '?';

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
          <div className="sidebar__avatar">{initials}</div>
          <div className="sidebar__user-info">
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
        <div className="topbar__avatar">{initials}</div>
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
    </div>
  );
}
