import { useEffect, lazy, Suspense } from 'react';
import { supabase } from './lib/supabase';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/appStore';
import AppLayout from './components/layout/AppLayout';

// ─── Lazy-loaded pages ───────────────────────────────────────
const AuthPage = lazy(() => import('./pages/AuthPage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const TimerPage = lazy(() => import('./pages/TimerPage'));
const ModulesPage = lazy(() => import('./pages/ModulesPage'));
const MarksPage = lazy(() => import('./pages/MarksPage'));
const CoachPage = lazy(() => import('./pages/CoachPage'));

// ─── Loading spinner ─────────────────────────────────────────

function PageLoader() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '60vh',
    }}>
      <div style={{
        width: 40,
        height: 40,
        border: '3px solid var(--border-default)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
    </div>
  );
}

// ─── Protected route wrapper ─────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  if (!isAuthenticated) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// ─── App ─────────────────────────────────────────────────────

export default function App() {
  const { loadAll, isAuthenticated } = useAppStore();

  useEffect(() => {
    loadAll();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        loadAll();
      }
    });
    return () => subscription.unsubscribe();
  }, [loadAll]);

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Auth route */}
        <Route
          path="/auth"
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AuthPage />
          }
        />

        {/* Protected app routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/timer" element={<TimerPage />} />
          <Route path="/modules" element={<ModulesPage />} />
          <Route path="/marks" element={<MarksPage />} />
          <Route path="/coach" element={<CoachPage />} />
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to={isAuthenticated ? '/dashboard' : '/auth'} replace />} />
      </Routes>
    </Suspense>
  );
}
