import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { isFirebaseConfigured } from '@/lib/firebase';

export function LoginPage() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const error = useAuthStore((s) => s.error);
  const signInWithGoogle = useAuthStore((s) => s.signInWithGoogle);
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';

  useEffect(() => {
    document.title = 'ログイン | Diet Tracker';
  }, []);

  if (!isFirebaseConfigured()) {
    return (
      <main className="page" style={{ paddingTop: '2rem' }}>
        <div className="error-banner">
          Firebase の設定（.env の VITE_* または EXPO_PUBLIC_*）を確認してください。
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="page" style={{ textAlign: 'center', paddingTop: '3rem' }}>
        <p className="muted">読み込み中…</p>
      </main>
    );
  }

  if (user) {
    return <Navigate to={from} replace />;
  }

  return (
    <main className="page" style={{ paddingTop: '2.5rem', maxWidth: 400 }}>
      <h1 style={{ textAlign: 'center', marginBottom: '0.5rem' }}>Diet Tracker</h1>
      <p className="muted" style={{ textAlign: 'center', marginBottom: '2rem' }}>
        Google でログインして、食事と体重を記録しましょう。
      </p>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="card" style={{ textAlign: 'center' }}>
        <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={signInWithGoogle}>
          Google でログイン
        </button>
      </div>
      <p className="muted" style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem' }}>
        PWA としてホーム画面に追加すると、アプリのように使えます。
      </p>
    </main>
  );
}
