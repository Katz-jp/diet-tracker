import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { subscribeMealsForDate, subscribeUserGoals } from '@/lib/firestore';
import type { MealLog, UserGoals } from '@/types';

function sumMeals(meals: MealLog[]) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + m.calories,
      protein: acc.protein + m.protein,
      fat: acc.fat + m.fat,
      carbs: acc.carbs + m.carbs,
      fiber: acc.fiber + m.fiber,
    }),
    { calories: 0, protein: 0, fat: 0, carbs: 0, fiber: 0 }
  );
}

function ProgressRow({
  label,
  current,
  goal,
  unit,
}: {
  label: string;
  current: number;
  goal: number;
  unit: string;
}) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;
  return (
    <div style={{ marginBottom: '0.85rem' }}>
      <div className="row" style={{ marginBottom: '0.25rem' }}>
        <span>{label}</span>
        <span>
          {current.toFixed(0)} / {goal.toFixed(0)} {unit}
        </span>
      </div>
      <div className="progress-bar">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function HomePage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [goals, setGoals] = useState<UserGoals | null>(null);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    document.title = 'ホーム | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsubGoals = subscribeUserGoals(uid, setGoals);
    const unsubMeals = subscribeMealsForDate(uid, today, setMeals);
    return () => {
      unsubGoals();
      unsubMeals();
    };
  }, [uid, today]);

  const totals = useMemo(() => sumMeals(meals), [meals]);

  if (!goals) {
    return (
      <main className="page">
        <p className="muted">読み込み中…</p>
      </main>
    );
  }

  return (
    <main className="page">
      <div className="row" style={{ marginBottom: '0.75rem' }}>
        <h1 style={{ margin: 0 }}>今日</h1>
        <span className="pill">{today}</span>
      </div>

      <div className="card">
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>摂取と目標</h2>
        <ProgressRow label="カロリー" current={totals.calories} goal={goals.calories} unit="kcal" />
        <ProgressRow label="タンパク質" current={totals.protein} goal={goals.protein} unit="g" />
        <ProgressRow label="脂質" current={totals.fat} goal={goals.fat} unit="g" />
        <ProgressRow label="炭水化物" current={totals.carbs} goal={goals.carbs} unit="g" />
        <ProgressRow label="食物繊維" current={totals.fiber} goal={goals.fiber} unit="g" />
      </div>

      <div className="card">
        <h2 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>目標体重</h2>
        <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
          {goals.targetWeight.toFixed(1)} kg
        </p>
        <p className="muted" style={{ marginTop: '0.35rem' }}>
          変更は「設定」から
        </p>
      </div>

      <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
        <Link to="/meals/add" className="btn btn-primary" style={{ flex: '1 1 140px' }}>
          食事を追加
        </Link>
        <Link to="/meals" className="btn" style={{ flex: '1 1 140px' }}>
          今日の一覧
        </Link>
      </div>
    </main>
  );
}
