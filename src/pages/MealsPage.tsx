import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { addRecipe, deleteMealLog, subscribeMealsForDate } from '@/lib/firestore';
import type { MealLog, MealTiming } from '@/types';

const timingLabel: Record<MealTiming, string> = {
  breakfast: '朝',
  lunch: '昼',
  dinner: '夜',
  snack: '間食',
};

const typeLabel = {
  restaurant: '外食',
  cooking: '自炊',
  recipe: 'レシピ',
} as const;

export function MealsPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [meals, setMeals] = useState<MealLog[]>([]);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [savingRecipe, setSavingRecipe] = useState<string | null>(null);

  useEffect(() => {
    document.title = '食事記録 | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeMealsForDate(uid, date, setMeals);
    return () => unsub();
  }, [uid, date]);

  const totals = useMemo(() => {
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
  }, [meals]);

  async function onDelete(id: string) {
    if (!uid) return;
    if (!confirm('この食事を削除しますか？')) return;
    setDeleting(id);
    try {
      await deleteMealLog(uid, id);
    } finally {
      setDeleting(null);
    }
  }

  async function onSaveAsRecipe(m: MealLog) {
    if (!uid) return;
    if (!m.name.trim()) return;
    const slot = m.type === 'restaurant' ? 'いつもの外食' : 'いつもの自炊';
    if (!confirm(`「${m.name}」を${slot}に登録しますか？\n（この食事分の栄養値を1人前基準で保存します）`)) {
      return;
    }
    setSavingRecipe(m.id);
    try {
      const noteFromIngredients =
        m.ingredients.length > 0
          ? m.ingredients.map((i) => `${i.name} ${i.grams}g`).join('、')
          : undefined;
      const kind = m.type === 'restaurant' ? 'restaurant' : 'cooking';
      await addRecipe(uid, {
        kind,
        name: m.name.trim(),
        servings: 1,
        calories: m.calories,
        protein: m.protein,
        fat: m.fat,
        carbs: m.carbs,
        fiber: m.fiber,
        note: noteFromIngredients,
      });
    } catch (e) {
      alert(e instanceof Error ? e.message : 'レシピの登録に失敗しました');
    } finally {
      setSavingRecipe(null);
    }
  }

  return (
    <main className="page">
      <div className="row" style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>食事記録</h1>
        <Link to="/meals/add" className="btn btn-primary">
          追加
        </Link>
      </div>

      <div className="field">
        <label htmlFor="meal-date">日付</label>
        <input
          id="meal-date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div className="card">
        <div className="row" style={{ marginBottom: '0.5rem' }}>
          <span className="muted">合計</span>
        </div>
        <p style={{ margin: 0, fontSize: '0.95rem' }}>
          {totals.calories.toFixed(0)} kcal ／ P {totals.protein.toFixed(0)} F {totals.fat.toFixed(0)} C{' '}
          {totals.carbs.toFixed(0)} ／ 繊維 {totals.fiber.toFixed(0)} g
        </p>
      </div>

      {meals.length === 0 ? (
        <p className="muted">この日の記録はありません。</p>
      ) : (
        meals.map((m) => (
          <div key={m.id} className="card">
            <div className="row" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.35rem' }}>
              <div style={{ flex: '1 1 auto', minWidth: 0 }}>
                <div style={{ fontWeight: 700 }}>{m.name}</div>
                <div className="muted" style={{ marginTop: '0.25rem' }}>
                  {timingLabel[m.timing]} ・ {typeLabel[m.type]}
                </div>
              </div>
              <div className="row" style={{ gap: '0.35rem', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  disabled={savingRecipe === m.id || deleting === m.id}
                  onClick={() => void onSaveAsRecipe(m)}
                >
                  {savingRecipe === m.id ? '登録中…' : 'レシピに登録'}
                </button>
                <button
                  type="button"
                  className="btn btn-danger btn-ghost"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  disabled={deleting === m.id || savingRecipe === m.id}
                  onClick={() => onDelete(m.id)}
                >
                  削除
                </button>
              </div>
            </div>
            <p style={{ margin: '0.65rem 0 0', fontSize: '0.9rem' }}>
              {m.calories.toFixed(0)} kcal ／ P {m.protein.toFixed(0)} F {m.fat.toFixed(0)} C {m.carbs.toFixed(0)}{' '}
              ／ 繊維 {m.fiber.toFixed(0)} g
            </p>
          </div>
        ))
      )}
    </main>
  );
}
