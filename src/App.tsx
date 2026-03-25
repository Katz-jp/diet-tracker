import { useEffect } from 'react';
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { AppLayout } from '@/components/AppLayout';
import { LoginPage } from '@/pages/LoginPage';
import { HomePage } from '@/pages/HomePage';
import { MealsPage } from '@/pages/MealsPage';
import { AddMealPage } from '@/pages/AddMealPage';
import { RecipesPage } from '@/pages/RecipesPage';
import { BodyPage } from '@/pages/BodyPage';
import { GraphPage } from '@/pages/GraphPage';
import { SettingsPage } from '@/pages/SettingsPage';

function ProtectedRoute() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const location = useLocation();

  if (loading) {
    return (
      <div className="app-shell" style={{ padding: '2rem', textAlign: 'center' }}>
        <p className="muted">読み込み中…</p>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export default function App() {
  const init = useAuthStore((s) => s.init);

  useEffect(() => {
    init();
  }, [init]);

  useEffect(() => {
    import('virtual:pwa-register').then(({ registerSW }) => {
      registerSW({ immediate: true });
    });
  }, []);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/meals" element={<MealsPage />} />
        <Route path="/meals/add" element={<AddMealPage />} />
        <Route path="/recipes" element={<RecipesPage />} />
        <Route path="/body" element={<BodyPage />} />
        <Route path="/graphs" element={<GraphPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
