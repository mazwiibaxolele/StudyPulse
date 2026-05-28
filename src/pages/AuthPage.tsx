import { useState, type FormEvent } from 'react';
import { Activity, AlertCircle } from 'lucide-react';
import { useAppStore } from '../stores/appStore';
import './AuthPage.css';

type AuthMode = 'signin' | 'signup';

export default function AuthPage() {
  const { signIn, signUp } = useAppStore();

  const [mode, setMode] = useState<AuthMode>('signin');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ─── Validation ─────────────────────────────────────────

  function validate(): string | null {
    if (!email.trim()) return 'Email is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      return 'Please enter a valid email address.';
    if (password.length < 6)
      return 'Password must be at least 6 characters.';

    if (mode === 'signup') {
      if (!name.trim()) return 'Name is required.';
      if (password !== confirmPassword) return 'Passwords do not match.';
    }

    return null;
  }

  // ─── Submit ─────────────────────────────────────────────

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      if (mode === 'signin') {
        signIn(email.trim(), password);
      } else {
        signUp(email.trim(), password, name.trim());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  // ─── Switch mode ────────────────────────────────────────

  function switchMode(newMode: AuthMode) {
    setMode(newMode);
    setError('');
  }

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Header */}
        <div className="auth-header">
          <div className="auth-header__brand">
            <div className="auth-header__icon">
              <Activity size={24} />
            </div>
            <h1 className="auth-header__title">
              Study<span>Pulse</span>
            </h1>
          </div>
          <p className="auth-header__tagline">
            Track your study. Understand your progress.
          </p>
        </div>

        {/* Tabs */}
        <div className="auth-tabs">
          <button
            className={`auth-tab${mode === 'signin' ? ' auth-tab--active' : ''}`}
            onClick={() => switchMode('signin')}
            type="button"
          >
            Sign In
          </button>
          <button
            className={`auth-tab${mode === 'signup' ? ' auth-tab--active' : ''}`}
            onClick={() => switchMode('signup')}
            type="button"
          >
            Sign Up
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="auth-error">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Form */}
        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-name">Full Name</label>
              <input
                id="auth-name"
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
              />
            </div>
          )}

          <div className="auth-field">
            <label htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="auth-password">Password</label>
            <input
              id="auth-password"
              type="password"
              placeholder="At least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            />
          </div>

          {mode === 'signup' && (
            <div className="auth-field">
              <label htmlFor="auth-confirm">Confirm Password</label>
              <input
                id="auth-confirm"
                type="password"
                placeholder="Re-enter your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? 'Please wait…'
              : mode === 'signin'
                ? 'Sign In'
                : 'Create Account'}
          </button>
        </form>

        {/* Divider */}
        <div className="auth-divider">
          <div className="auth-divider__line" />
          <span className="auth-divider__text">or</span>
          <div className="auth-divider__line" />
        </div>

        {/* Google */}
        <button type="button" className="auth-google">
          <span className="auth-google__icon">G</span>
          Continue with Google
        </button>
      </div>
    </div>
  );
}
