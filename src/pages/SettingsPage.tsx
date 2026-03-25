import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { saveGoals, subscribeUserGoals } from '@/lib/firestore';
import type { UserGoals } from '@/types';

export function SettingsPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const logout = useAuthStore((s) => s.logout);
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    document.title = '設定 | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeUserGoals(uid, setGoals);
    return () => unsub();
  }, [uid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid || !goals) return;
    setSaving(true);
    setMsg(null);
    try {
      await saveGoals(uid, goals);
      setMsg('保存しました');
    } catch {
      setMsg('保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  function update<K extends keyof UserGoals>(key: K, value: number) {
    setGoals((g) => (g ? { ...g, [key]: value } : g));
  }

  if (!goals) {
    return (
      <main className="page">
        <p className="muted">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <h1>設定</h1>

      <form onSubmit={onSubmit} className="card">
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>目標値</h2>
        <div className="field">
          <label htmlFor="tw">目標体重 (kg)</label>
          <input
            id="tw"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={goals.targetWeight}
            onChange={(e) => update('targetWeight', Number(e.target.value))}
          />
        </div>
        <div className="field">
          <label htmlFor="gc">1日のカロリー目標 (kcal)</label>
          <input
            id="gc"
            type="number"
            value={goals.calories}
            onChange={(e) => update('calories', Number(e.target.value))}
          />
        </div>
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label>タンパク質 (g)</label>
            <input
              type="number"
              value={goals.protein}
              onChange={(e) => update('protein', Number(e.target.value))}
            />
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label>脂質 (g)</label>
            <input type="number" value={goals.fat} onChange={(e) => update('fat', Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label>炭水化物 (g)</label>
            <input
              type="number"
              value={goals.carbs}
              onChange={(e) => update('carbs', Number(e.target.value))}
            />
          </div>
          <div className="field" style={{ flex: '1 1 120px' }}>
            <label>食物繊維 (g)</label>
            <input
              type="number"
              value={goals.fiber}
              onChange={(e) => update('fiber', Number(e.target.value))}
            />
          </div>
        </div>
        {msg ? <p className="muted">{msg}</p> : null}
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '保存中…' : '目標を保存'}
        </button>
      </form>

      <div className="card">
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>アカウント</h2>
        <button type="button" className="btn btn-danger" onClick={() => logout()}>
          ログアウト
        </button>
      </div>
    </main>
  );
}
