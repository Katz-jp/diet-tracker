import type { CookingEstimate, RestaurantEstimate } from '@/types';
import { openAiApiKey } from '@/env';

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

function parseJsonObject<T>(content: string): T {
  const trimmed = content.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('JSON を解析できませんでした');
  }
  return JSON.parse(jsonMatch[0]) as T;
}

async function chatJson<T>(system: string, user: string): Promise<T> {
  const key = openAiApiKey();
  const body = {
    model: 'gpt-4o',
    response_format: { type: 'json_object' as const },
    messages: [
      { role: 'system' as const, content: system },
      { role: 'user' as const, content: user },
    ],
  };

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API エラー: ${res.status} ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('応答が空です');
  }

  return parseJsonObject<T>(content);
}

export async function estimateRestaurantMenu(menuQuery: string): Promise<RestaurantEstimate> {
  return chatJson<RestaurantEstimate>(
    'あなたは日本の外食メニューの栄養推定に詳しいアシスタントです。必ず有効なJSONオブジェクトのみを返してください。',
    `以下の外食メニューについて、カロリー・タンパク質・脂質・炭水化物・食物繊維を日本の一般的な提供量で推定してください。
JSON形式で返却してください。

メニュー：${menuQuery}

返却形式：
{
  "name": "メニュー名",
  "calories": 数値(kcal),
  "protein": 数値(g),
  "fat": 数値(g),
  "carbs": 数値(g),
  "fiber": 数値(g),
  "note": "推定根拠や注意事項"
}`
  );
}

export async function estimateCookingFromText(description: string): Promise<CookingEstimate> {
  return chatJson<CookingEstimate>(
    'あなたは日本の家庭料理・自炊の栄養推定に詳しいアシスタントです。必ず有効なJSONオブジェクトのみを返してください。材料が曖昧な場合は一般的な分量で推定し、noteに前提を書いてください。',
    `以下の自炊・材料の説明から、1食分（または説明された分量）の栄養を推定してください。
JSON形式で返却してください。

説明：${description}

返却形式：
{
  "name": "料理名または概要",
  "calories": 数値(kcal),
  "protein": 数値(g),
  "fat": 数値(g),
  "carbs": 数値(g),
  "fiber": 数値(g),
  "note": "推定の前提や注意"
}`
  );
}

/** 材料リストから「料理全体の合計」栄養を推定（レシピ保存の合計値・人数分母に合わせる） */
export interface RecipeIngredientsNutritionEstimate {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  note: string;
}

export async function estimateNutritionFromRecipeIngredients(
  recipeName: string,
  servings: number,
  ingredients: { name: string; amount: string; unit?: 'g' | 'piece' }[]
): Promise<RecipeIngredientsNutritionEstimate> {
  function formatAmount(i: { amount: string; unit?: 'g' | 'piece' }): string {
    const a = i.amount.trim();
    if (!a) return '分量不明';
    if (i.unit === 'piece') return `${a} 個`;
    if (i.unit === 'g') return `${a} g`;
    return a;
  }

  const lines = ingredients
    .filter((i) => i.name.trim() || i.amount.trim())
    .map(
      (i) =>
        `- ${i.name.trim() || '（名称不明）'}: ${formatAmount(i)}`
    )
    .join('\n');

  return chatJson<RecipeIngredientsNutritionEstimate>(
    'あなたは日本の食品の栄養計算に詳しいアシスタントです。必ず有効なJSONオブジェクトのみを返してください。材料の分量が曖昧な場合は日本の一般的な目安で推定し、noteに前提を簡潔に書いてください。',
    `次のレシピについて、材料をすべて使い切る「1回作ったときの料理全体」の栄養の合計を推定してください。
（人数 ${servings} は1人前の基準人数であり、栄養の合計を人数で割るのは利用者側の計算です。あなたが返す数値は必ず「材料リスト全体の合計」にしてください。）

レシピ名：${recipeName || '（未入力）'}

材料：
${lines || '（材料なし）'}

返却形式（数値は小数可、単位は kcal / g）：
{
  "calories": 数値,
  "protein": 数値,
  "fat": 数値,
  "carbs": 数値,
  "fiber": 数値,
  "note": "推定の前提や注意"
}`
  );
}
