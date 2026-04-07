import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { ServingsStepper } from '@/components/ServingsStepper';
import { addRecipe, deleteRecipe, updateRecipe, subscribeRecipes } from '@/lib/firestore';
import { snapServingsToQuarter } from '@/lib/servingsInput';
import { estimateNutritionFromRecipeIngredients } from '@/lib/openai';
import type { Recipe, RecipeIngredientLine, RecipeIngredientUnit, RecipeKind } from '@/types';

type IngredientRow = { id: string; name: string; amount: string; unit: RecipeIngredientUnit };

function newIngredientRow(): IngredientRow {
  return { id: crypto.randomUUID(), name: '', amount: '', unit: 'g' };
}

function formatIngredientAmountForList(ing: RecipeIngredientLine): string {
  if (!ing.amount.trim()) return '';
  if (ing.unit === 'piece') return `${ing.amount} 個`;
  if (ing.unit === 'g') return `${ing.amount} g`;
  return ing.amount;
}

export function RecipesPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [formKind, setFormKind] = useState<RecipeKind>('cooking');
  const [name, setName] = useState('');
  const [servings, setServings] = useState(1);
  const [ingredientRows, setIngredientRows] = useState<IngredientRow[]>(() => [newIngredientRow()]);
  const [aiLoading, setAiLoading] = useState(false);
  const [calories, setCalories] = useState(0);
  const [protein, setProtein] = useState(0);
  const [fat, setFat] = useState(0);
  const [carbs, setCarbs] = useState(0);
  const [fiber, setFiber] = useState(0);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.title = 'いつものレシピ | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeRecipes(uid, setRecipes);
    return () => unsub();
  }, [uid]);

  function normalizedIngredients(): RecipeIngredientLine[] {
    return ingredientRows
      .map((r) => ({
        name: r.name.trim(),
        amount: r.amount.trim(),
        unit: r.unit,
      }))
      .filter((r) => r.name !== '' || r.amount !== '');
  }

  function resetForm() {
    setEditingId(null);
    setName('');
    setServings(1);
    setIngredientRows([newIngredientRow()]);
    setCalories(0);
    setProtein(0);
    setFat(0);
    setCarbs(0);
    setFiber(0);
    setNote('');
    setError(null);
  }

  function startEdit(r: Recipe) {
    setEditingId(r.id);
    setFormKind(r.kind);
    setName(r.name);
    setServings(r.servings);
    if (r.ingredients && r.ingredients.length > 0) {
      setIngredientRows(
        r.ingredients.map((ing) => ({
          id: crypto.randomUUID(),
          name: ing.name,
          amount: ing.amount,
          unit: ing.unit ?? 'g',
        }))
      );
    } else {
      setIngredientRows([newIngredientRow()]);
    }
    // 保存値は全体合計なので、1人前に戻す
    const div = r.kind === 'cooking' ? r.servings : 1;
    const round1 = (x: number) => Math.round((x / div) * 10) / 10;
    setCalories(round1(r.calories));
    setProtein(round1(r.protein));
    setFat(round1(r.fat));
    setCarbs(round1(r.carbs));
    setFiber(round1(r.fiber));
    setNote(r.note ?? '');
    setError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /** 自炊のみ：人数を変えても「料理全体の栄養の合計」が変わらないよう、1人前を按分する */
  function onCookingServingsChange(next: number) {
    const newSnap = snapServingsToQuarter(next);
    const oldSnap = snapServingsToQuarter(servings);
    if (newSnap === oldSnap) return;
    const pv = (n: number) => Number(n) || 0;
    const round1 = (x: number) => Math.round(x * 10) / 10;
    const totalCal = pv(calories) * oldSnap;
    const totalP = pv(protein) * oldSnap;
    const totalF = pv(fat) * oldSnap;
    const totalC = pv(carbs) * oldSnap;
    const totalFi = pv(fiber) * oldSnap;
    setCalories(round1(totalCal / newSnap));
    setProtein(round1(totalP / newSnap));
    setFat(round1(totalF / newSnap));
    setCarbs(round1(totalC / newSnap));
    setFiber(round1(totalFi / newSnap));
    setServings(newSnap);
  }

  async function runRecipeAi() {
    setError(null);
    const lines = normalizedIngredients();
    if (lines.length === 0 || !lines.some((l) => l.name)) {
      setError('材料名を1行以上入力してください。');
      return;
    }
    setAiLoading(true);
    try {
      const portions = snapServingsToQuarter(servings);
      const r = await estimateNutritionFromRecipeIngredients(
        name.trim(),
        portions,
        lines
      );
      const div = portions > 0 ? portions : 0.25;
      const round1 = (x: number) => Math.round((x / div) * 10) / 10;
      setCalories(round1(r.calories));
      setProtein(round1(r.protein));
      setFat(round1(r.fat));
      setCarbs(round1(r.carbs));
      setFiber(round1(r.fiber));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AIの計算に失敗しました');
    } finally {
      setAiLoading(false);
    }
  }

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
      const ing = formKind === 'cooking' ? normalizedIngredients() : [];
      const portions = snapServingsToQuarter(servings);
      const per = (n: number) => Number(n) || 0;
      const scaleCooking = formKind === 'cooking' ? portions : 1;
      const payload = {
        kind: formKind,
        name: name.trim(),
        servings: portions,
        calories: per(calories) * scaleCooking,
        protein: per(protein) * scaleCooking,
        fat: per(fat) * scaleCooking,
        carbs: per(carbs) * scaleCooking,
        fiber: per(fiber) * scaleCooking,
        note: note.trim() || undefined,
        ...(ing.length > 0 ? { ingredients: ing } : {}),
      };
      if (editingId) {
        await updateRecipe(uid, editingId, payload);
      } else {
        await addRecipe(uid, payload);
      }
      resetForm();
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
        「自炊」「外食」に分けて保存できます。食事を追加の「いつもの自炊／いつもの外食」からそれぞれ選べます。外食は栄養を「全体の合計」で入力し、人数を分母にします。自炊で材料から入れる場合は、下の栄養欄は1人前分で、保存時に人数分を掛けて全体の合計として保存します。
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      <form onSubmit={onSubmit} className="card">
        <div className="row" style={{ marginBottom: '0.75rem', alignItems: 'center' }}>
          <h2 style={{ color: 'var(--text)', margin: 0 }}>
            {editingId ? 'レシピを編集' : '新規登録'}
          </h2>
          {editingId ? (
            <button type="button" className="btn btn-ghost" onClick={resetForm}>
              キャンセル
            </button>
          ) : null}
        </div>
        <div className="field">
          <span>保存先</span>
          <div className="tabs" style={{ marginTop: '0.35rem', marginBottom: 0 }}>
            <button
              type="button"
              className={`tab ${formKind === 'cooking' ? 'active' : ''}`}
              onClick={() => {
                setFormKind('cooking');
              }}
            >
              いつもの自炊
            </button>
            <button
              type="button"
              className={`tab ${formKind === 'restaurant' ? 'active' : ''}`}
              onClick={() => {
                setFormKind('restaurant');
                setIngredientRows([newIngredientRow()]);
              }}
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
        {formKind === 'cooking' ? (
          <div className="field">
            <span>材料</span>
            <p className="muted" style={{ margin: '0.35rem 0 0.5rem', fontSize: '0.85rem' }}>
              材料名と分量の数値を入力し、単位は「g」か「個」から選びます。次に人数を選び、「AIで栄養を計算」で材料全体の合計を推定し、人数で割った1人前の値が下の欄に入ります。
            </p>
            {ingredientRows.map((row, index) => (
              <div
                key={row.id}
                className="row"
                style={{ gap: '0.5rem', alignItems: 'flex-end', flexWrap: 'wrap', marginBottom: '0.5rem' }}
              >
                <div className="field" style={{ flex: '1 1 140px', marginBottom: 0 }}>
                  <label htmlFor={`ing-n-${row.id}`}>材料名</label>
                  <input
                    id={`ing-n-${row.id}`}
                    value={row.name}
                    onChange={(e) => {
                      const v = e.target.value;
                      setIngredientRows((rows) =>
                        rows.map((r) => (r.id === row.id ? { ...r, name: v } : r))
                      );
                    }}
                    placeholder="例：鶏むね肉"
                  />
                </div>
                <div className="field" style={{ flex: '1 1 88px', marginBottom: 0 }}>
                  <label htmlFor={`ing-a-${row.id}`}>分量</label>
                  <input
                    id={`ing-a-${row.id}`}
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      setIngredientRows((rows) =>
                        rows.map((r) => (r.id === row.id ? { ...r, amount: v } : r))
                      );
                    }}
                    placeholder={row.unit === 'piece' ? '例：2' : '例：250'}
                  />
                </div>
                <div className="field" style={{ flex: '0 0 5.5rem', marginBottom: 0 }}>
                  <label htmlFor={`ing-u-${row.id}`}>単位</label>
                  <select
                    id={`ing-u-${row.id}`}
                    value={row.unit}
                    onChange={(e) => {
                      const unit = e.target.value as RecipeIngredientUnit;
                      setIngredientRows((rows) =>
                        rows.map((r) => (r.id === row.id ? { ...r, unit } : r))
                      );
                    }}
                  >
                    <option value="g">g</option>
                    <option value="piece">個</option>
                  </select>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ padding: '0.45rem 0.65rem' }}
                  disabled={ingredientRows.length <= 1}
                  onClick={() =>
                    setIngredientRows((rows) => rows.filter((r) => r.id !== row.id))
                  }
                  aria-label={`材料${index + 1}行を削除`}
                >
                  削除
                </button>
              </div>
            ))}
            <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.35rem' }}>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setIngredientRows((rows) => [...rows, newIngredientRow()])}
              >
                行を追加
              </button>
            </div>
            <ServingsStepper
              id="rs-cook"
              label="人数（1食分の基準）"
              value={servings}
              onChange={onCookingServingsChange}
              hint="材料のあとに選びます。人数を変えると、1人前の数値は全体の合計が同じになるよう自動で按分されます（例：1→2なら半分）。AIはこの人数で材料合計を割って1人前を入れます。0.25 刻み（−／＋で変更）"
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ marginTop: '0.35rem' }}
              disabled={aiLoading}
              onClick={() => void runRecipeAi()}
            >
              {aiLoading ? '計算中…' : 'AIで栄養を計算'}
            </button>
          </div>
        ) : null}
        {formKind === 'restaurant' ? (
          <ServingsStepper
            id="rs"
            label="人数（1食分の基準）"
            value={servings}
            onChange={setServings}
            hint="0.25 刻み（−／＋で変更）"
          />
        ) : null}
        <div className="field">
          <label htmlFor="rc">
            {formKind === 'cooking' ? 'カロリー (kcal) 1人前' : 'カロリー (kcal) 合計'}
          </label>
          <input
            id="rc"
            type="number"
            value={calories || ''}
            onChange={(e) => setCalories(Number(e.target.value))}
          />
        </div>
        {formKind === 'cooking' ? (
          <p className="muted" style={{ margin: '-0.35rem 0 0.5rem', fontSize: '0.85rem' }}>
            P・F・C・繊維も1人前分です。保存すると「× 人数」で全体の合計として記録されます。
          </p>
        ) : null}
        <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label>P (g){formKind === 'cooking' ? ' 1人前' : ''}</label>
            <input type="number" value={protein || ''} onChange={(e) => setProtein(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label>F (g){formKind === 'cooking' ? ' 1人前' : ''}</label>
            <input type="number" value={fat || ''} onChange={(e) => setFat(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label>C (g){formKind === 'cooking' ? ' 1人前' : ''}</label>
            <input type="number" value={carbs || ''} onChange={(e) => setCarbs(Number(e.target.value))} />
          </div>
          <div className="field" style={{ flex: '1 1 100px' }}>
            <label>繊維 (g){formKind === 'cooking' ? ' 1人前' : ''}</label>
            <input type="number" value={fiber || ''} onChange={(e) => setFiber(Number(e.target.value))} />
          </div>
        </div>
        <div className="field">
          <label htmlFor="note">メモ（任意）</label>
          <textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? '保存中…' : editingId ? '更新する' : 'レシピを保存'}
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
                  {r.ingredients && r.ingredients.length > 0 ? (
                    <ul
                      style={{
                        margin: '0.5rem 0 0',
                        paddingLeft: '1.1rem',
                        fontSize: '0.9rem',
                        color: 'var(--muted)',
                      }}
                    >
                      {r.ingredients.map((ing, i) => (
                        <li key={`${r.id}-ing-${i}`}>
                          {ing.name}
                          {ing.amount.trim()
                            ? ` … ${formatIngredientAmountForList(ing)}`
                            : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {r.note ? <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem' }}>{r.note}</p> : null}
                </div>
                <div className="row" style={{ gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    onClick={() => startEdit(r)}
                  >
                    編集
                  </button>
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
                <div className="row" style={{ gap: '0.4rem' }}>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                    onClick={() => startEdit(r)}
                  >
                    編集
                  </button>
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
            </div>
          ))
      )}
    </main>
  );
}
