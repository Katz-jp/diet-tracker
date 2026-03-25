import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useAuthStore } from '@/store/authStore';
import { ServingsStepper } from '@/components/ServingsStepper';
import { addMealLog, subscribeRecipes } from '@/lib/firestore';
import { snapServingsToQuarter } from '@/lib/servingsInput';
import { estimateCookingFromText, estimateRestaurantMenu } from '@/lib/openai';
import type { MealTiming, MealType, Recipe } from '@/types';

type Mode = 'restaurant' | 'cooking' | 'recipeCooking' | 'recipeRestaurant';

const timings: { value: MealTiming; label: string }[] = [
  { value: 'breakfast', label: '朝' },
  { value: 'lunch', label: '昼' },
  { value: 'dinner', label: '夜' },
  { value: 'snack', label: '間食' },
];

const emptyNutrition = {
  name: '',
  calories: 0,
  protein: 0,
  fat: 0,
  carbs: 0,
  fiber: 0,
};

export function AddMealPage() {
  const uid = useAuthStore((s) => s.user?.uid);
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>('restaurant');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [timing, setTiming] = useState<MealTiming>('lunch');
  const [submitting, setSubmitting] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [restaurantQuery, setRestaurantQuery] = useState('');
  const [cookingMode, setCookingMode] = useState<'ai' | 'manual'>('ai');
  const [cookingText, setCookingText] = useState('');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [recipeId, setRecipeId] = useState('');
  const [recipeServings, setRecipeServings] = useState(1);

  const [nut, setNut] = useState(emptyNutrition);

  useEffect(() => {
    document.title = '食事を追加 | Diet Tracker';
  }, []);

  useEffect(() => {
    if (!uid) return;
    const unsub = subscribeRecipes(uid, setRecipes);
    return () => unsub();
  }, [uid]);

  const recipesForMode = useMemo(() => {
    if (mode === 'recipeCooking') return recipes.filter((r) => r.kind === 'cooking');
    if (mode === 'recipeRestaurant') return recipes.filter((r) => r.kind === 'restaurant');
    return [];
  }, [recipes, mode]);

  useEffect(() => {
    if (mode !== 'recipeCooking' && mode !== 'recipeRestaurant') return;
    if (recipeId && !recipesForMode.some((r) => r.id === recipeId)) {
      setRecipeId('');
    }
  }, [mode, recipesForMode, recipeId]);

  const selectedRecipe = useMemo(
    () => recipesForMode.find((r) => r.id === recipeId) ?? null,
    [recipesForMode, recipeId]
  );

  useEffect(() => {
    setRecipeServings(1);
  }, [recipeId]);

  useEffect(() => {
    if (!selectedRecipe) {
      setNut(emptyNutrition);
      return;
    }
    const per = selectedRecipe.servings > 0 ? 1 / selectedRecipe.servings : 1;
    const scale = per * snapServingsToQuarter(recipeServings);
    setNut({
      name: selectedRecipe.name,
      calories: selectedRecipe.calories * scale,
      protein: selectedRecipe.protein * scale,
      fat: selectedRecipe.fat * scale,
      carbs: selectedRecipe.carbs * scale,
      fiber: selectedRecipe.fiber * scale,
    });
  }, [selectedRecipe, recipeServings]);

  async function runRestaurantAi() {
    setError(null);
    if (!restaurantQuery.trim()) {
      setError('メニュー名や店名・品名を入力してください。');
      return;
    }
    setAiLoading(true);
    try {
      const r = await estimateRestaurantMenu(restaurantQuery.trim());
      setNut({
        name: r.name,
        calories: r.calories,
        protein: r.protein,
        fat: r.fat,
        carbs: r.carbs,
        fiber: r.fiber,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '推定に失敗しました');
    } finally {
      setAiLoading(false);
    }
  }

  async function runCookingAi() {
    setError(null);
    if (!cookingText.trim()) {
      setError('材料や作り方のメモを入力してください。');
      return;
    }
    setAiLoading(true);
    try {
      const r = await estimateCookingFromText(cookingText.trim());
      setNut({
        name: r.name,
        calories: r.calories,
        protein: r.protein,
        fat: r.fat,
        carbs: r.carbs,
        fiber: r.fiber,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : '推定に失敗しました');
    } finally {
      setAiLoading(false);
    }
  }

  function mealTypeForMode(): MealType {
    if (mode === 'restaurant') return 'restaurant';
    if (mode === 'cooking') return 'cooking';
    return 'recipe';
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!uid) return;
    setError(null);
    if (!nut.name.trim()) {
      setError('メニュー名を入力してください。');
      return;
    }
    setSubmitting(true);
    try {
      await addMealLog(uid, {
        date,
        timing,
        name: nut.name.trim(),
        type: mealTypeForMode(),
        calories: Number(nut.calories) || 0,
        protein: Number(nut.protein) || 0,
        fat: Number(nut.fat) || 0,
        carbs: Number(nut.carbs) || 0,
        fiber: Number(nut.fiber) || 0,
        ingredients: [],
      });
      navigate('/meals');
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="page">
      <div className="row" style={{ marginBottom: '1rem' }}>
        <h1 style={{ margin: 0 }}>食事を追加</h1>
        <Link to="/meals" className="btn btn-ghost">
          戻る
        </Link>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <form onSubmit={onSubmit}>
        <div className="field">
          <label htmlFor="add-date">日付</label>
          <input id="add-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>

        <div className="field">
          <span>時間帯</span>
          <div className="tabs" style={{ marginTop: '0.35rem' }}>
            {timings.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`tab ${timing === t.value ? 'active' : ''}`}
                onClick={() => setTiming(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="tabs">
          <button
            type="button"
            className={`tab ${mode === 'restaurant' ? 'active' : ''}`}
            onClick={() => setMode('restaurant')}
          >
            外食検索
          </button>
          <button
            type="button"
            className={`tab ${mode === 'cooking' ? 'active' : ''}`}
            onClick={() => setMode('cooking')}
          >
            自炊
          </button>
          <button
            type="button"
            className={`tab ${mode === 'recipeCooking' ? 'active' : ''}`}
            onClick={() => setMode('recipeCooking')}
            title="自炊で保存したレシピから選びます"
          >
            いつもの自炊
          </button>
          <button
            type="button"
            className={`tab ${mode === 'recipeRestaurant' ? 'active' : ''}`}
            onClick={() => setMode('recipeRestaurant')}
            title="外食メニューとして保存したものから選びます"
          >
            いつもの外食
          </button>
        </div>

        {mode === 'restaurant' ? (
          <div className="card">
            <div className="field">
              <label htmlFor="rq">店名・メニュー（AIが推定）</label>
              <textarea
                id="rq"
                value={restaurantQuery}
                onChange={(e) => setRestaurantQuery(e.target.value)}
                placeholder="例：サイゼリヤ ミラノ風ドリア 1人前"
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              disabled={aiLoading}
              onClick={runRestaurantAi}
            >
              {aiLoading ? '推定中…' : 'AIで栄養を推定'}
            </button>
          </div>
        ) : null}

        {mode === 'cooking' ? (
          <div className="card">
            <div className="tabs" style={{ marginBottom: '0.75rem' }}>
              <button
                type="button"
                className={`tab ${cookingMode === 'ai' ? 'active' : ''}`}
                onClick={() => setCookingMode('ai')}
              >
                AI（材料メモ）
              </button>
              <button
                type="button"
                className={`tab ${cookingMode === 'manual' ? 'active' : ''}`}
                onClick={() => setCookingMode('manual')}
              >
                手入力
              </button>
            </div>
            {cookingMode === 'ai' ? (
              <>
                <div className="field">
                  <label htmlFor="ct">材料・分量のメモ</label>
                  <textarea
                    id="ct"
                    value={cookingText}
                    onChange={(e) => setCookingText(e.target.value)}
                    placeholder="例：米150g、卵2個、醤油小さじ1、鶏むね200gを炒めた"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={aiLoading}
                  onClick={runCookingAi}
                >
                  {aiLoading ? '推定中…' : 'AIで栄養を推定'}
                </button>
              </>
            ) : (
              <p className="muted" style={{ marginTop: 0 }}>
                下の「栄養値」に直接入力してください。
              </p>
            )}
          </div>
        ) : null}

        {mode === 'recipeCooking' || mode === 'recipeRestaurant' ? (
          <div className="card">
            {recipesForMode.length === 0 ? (
              <p className="muted">
                {mode === 'recipeCooking'
                  ? '「いつもの自炊」用の保存がありません。「レシピ」画面で「自炊」として登録するか、食事記録から自炊分を登録してください。'
                  : '「いつもの外食」用の保存がありません。「レシピ」画面で「外食」として登録するか、食事記録から外食分を登録してください。'}
              </p>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="rec">
                    {mode === 'recipeCooking' ? 'いつもの自炊' : 'いつもの外食'}
                  </label>
                  <select
                    id="rec"
                    value={recipeId}
                    onChange={(e) => {
                      setRecipeId(e.target.value);
                    }}
                  >
                    <option value="">選択してください</option>
                    {recipesForMode.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}（{r.servings}人前基準）
                      </option>
                    ))}
                  </select>
                </div>
                <ServingsStepper
                  id="meal-rs"
                  label="食べた人数（倍率）"
                  value={recipeServings}
                  onChange={setRecipeServings}
                  hint="0.25 刻み（−／＋で変更）"
                />
              </>
            )}
          </div>
        ) : null}

        <div className="card">
          <h2 style={{ color: 'var(--text)', marginBottom: '0.65rem' }}>栄養値（編集可）</h2>
          <div className="field">
            <label htmlFor="mn">メニュー名</label>
            <input id="mn" value={nut.name} onChange={(e) => setNut((n) => ({ ...n, name: e.target.value }))} />
          </div>
          <div className="field">
            <label htmlFor="kcal">カロリー (kcal)</label>
            <input
              id="kcal"
              type="number"
              inputMode="decimal"
              value={nut.calories || ''}
              onChange={(e) => setNut((n) => ({ ...n, calories: Number(e.target.value) }))}
            />
          </div>
          <div className="row" style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label>タンパク質 (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={nut.protein || ''}
                onChange={(e) => setNut((n) => ({ ...n, protein: Number(e.target.value) }))}
              />
            </div>
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label>脂質 (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={nut.fat || ''}
                onChange={(e) => setNut((n) => ({ ...n, fat: Number(e.target.value) }))}
              />
            </div>
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label>炭水化物 (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={nut.carbs || ''}
                onChange={(e) => setNut((n) => ({ ...n, carbs: Number(e.target.value) }))}
              />
            </div>
            <div className="field" style={{ flex: '1 1 120px' }}>
              <label>食物繊維 (g)</label>
              <input
                type="number"
                inputMode="decimal"
                value={nut.fiber || ''}
                onChange={(e) => setNut((n) => ({ ...n, fiber: Number(e.target.value) }))}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
          {submitting ? '保存中…' : '記録する'}
        </button>
      </form>
    </main>
  );
}
