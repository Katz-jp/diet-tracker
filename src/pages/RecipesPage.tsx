import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ServingsStepper } from '@/components/ServingsStepper';
import { addRecipe, deleteRecipe, subscribeRecipes } from '@/lib/firestore';
import { snapServingsToQuarter } from '@/lib/servingsInput';
import type { Recipe, RecipeKind } from '@/types';

export function RecipesPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [formKind, setFormKind] = useState<RecipeKind>('cooking');
  const [name, setName] = useState('');
  const [servings, setServings] = useState(1);
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [fat, setFat] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'いつものレシピ | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeRecipes(uid, setRecipes);
    return () => unsub();
  }, [uid]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setError(null);
    if (!name.trim()) {
      setError('レシピ名を入力してください。');
      return;
    }
    setSaving(true);
    try {
      await addRecipe(uid, {
        kind: formKind,
        name: name.trim(),
        servings: snapServingsToQuarter(servings),
        calories: Number(calories) || 0,
        protein: Number(protein) || 0,
        fat: Number(fat) || 0,
        carbs: Number(carbs) || 0,
        fiber: Number(fiber) || 0,
        note: note.trim() || undefined,
      });
      setName('');
      setServings(1);
      setCalories(0);
      setProtein(0);
      setFat(0);
      setCarbs(0);
      setFiber(0);
      setNote('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    if (!uid) return;
    if (!confirm('このレシピを削除しますか？')) return;
    setDeleting(id);
    try {
      await deleteRecipe(uid, id);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <main className="page">
      <h1>いつものレシピ</h1>
      <p className="muted" style={{ marginTop: '-0.5rem' }}>
        「自炊」「外食」に分けて保存できます。食事を追加の「いつもの自炊／いつもの外食」からそれぞれ選べます。数値は「全体の合計」で入力し、人数を分母にします。
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      <form onSubmit={onSubmit} className="card">
        <h2 style={{ color: 'var(--text)', marginBottom: '0.75rem' }}>新規登録</h2>
        <div className="field">
          <span>保存先</span>
          <div className="tabs" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
            <button
              type="button"
              className={`tab ${formKind === 'cooking' ? 'active' : ''}`}
              onClick={() => setFormKind('cooking')}
            >
              いつもの自炊
            </button>
            <button
              type="button"
              className={`tab ${formKind === 'restaurant' ? 'active' : ''}`}
              onClick={() => setFormKind('restaurant')}
            >
              いつもの外食
            </button>
          </div>
          <p className="muted" style={{ margin: '0.35rem 0 0', fontSize: '0.85rem' }}>
            {formKind === 'cooking'
              ? '自炊で作る定番料理向けです。'
              : '外食でよく頼むメニュー向けです。'}
          </p>
        </div>
        <div className="field">
          <label htmlFor="rn">レシピ名</label>
          <input id="rn" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <ServingsStepper
          id="rs"
          label="人数（1食分の基準）"
          value={servings}
          onChange={setServings}
          hint="0.25 刻み（−／＋で変更）"
        />
        <div className="field">
          <label htmlFor="rc">カロリー (kcal) 合計</label>
          <input
            id="rc"
            type="number"
            value={calories || ''}
            onChange={(e) => setCalories(Number(e.target.value))}
          />
        </div>
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label>P (g)</label>
            <input type="number" value={protein || ''} onChange={(e) => setProtein(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label>F (g)</label>
            <input type="number" value={fat || ''} onChange={(e) => setFat(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label>C (g)</label>
            <input type="number" value={carbs || ''} onChange={(e) => setCarbs(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label>繊維 (g)</label>
            <input type="number" value={fiber || ''} onChange={(e) => setFiber(Number(e.target.value))} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="note">メモ（任意）</label>
          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '保存中…' : 'レシピを保存'}
        </button>
      </form>

      <h2 style={{ marginTop: '1.5rem' }}>保存済み（いつもの自炊）</h2>
      {recipes.filter((r) => r.kind === 'cooking').length === 0 ? (
        <p className="muted">まだありません。</p>
      ) : (
        recipes
          .filter((r) => r.kind === 'cooking')
          .map((r) => (
            <div key={r.id} className="card">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div className="muted" style={{ marginTop: '0.25rem' }}>
                    {r.servings}人前基準 ／ {r.calories.toFixed(0)} kcal ／ P {r.protein.toFixed(0)} F{' '}
                    {r.fat.toFixed(0)} C {r.carbs.toFixed(0)} ／ 繊維 {r.fiber.toFixed(0)} g
                  </div>
                  {r.note ? <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{r.note}</p> : null}
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-ghost"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  disabled={deleting === r.id}
                  onClick={() => onDelete(r.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))
      )}

      <h2 style={{ marginTop: '1.5rem' }}>保存済み（いつもの外食）</h2>
      {recipes.filter((r) => r.kind === 'restaurant').length === 0 ? (
        <p className="muted">まだありません。</p>
      ) : (
        recipes
          .filter((r) => r.kind === 'restaurant')
          .map((r) => (
            <div key={r.id} className="card">
              <div className="row" style={{ alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{r.name}</div>
                  <div className="muted" style={{ marginTop: '0.25rem' }}>
                    {r.servings}人前基準 ／ {r.calories.toFixed(0)} kcal ／ P {r.protein.toFixed(0)} F{' '}
                    {r.fat.toFixed(0)} C {r.carbs.toFixed(0)} ／ 繊維 {r.fiber.toFixed(0)} g
                  </div>
                  {r.note ? <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{r.note}</p> : null}
                </div>
                <button
                  type="button"
                  className="btn btn-danger btn-ghost"
                  style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                  disabled={deleting === r.id}
                  onClick={() => onDelete(r.id)}
                >
                  削除
                </button>
              </div>
            </div>
          ))
      )}
    </main>
  );
}
