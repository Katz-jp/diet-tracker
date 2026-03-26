export type MealTiming = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export type MealType = 'restaurant' | 'cooking' | 'recipe';

export interface UserProfile {
  displayName: string;
  email: string;
  createdAt: Date;
}

export interface UserGoals {
  targetWeight: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface MealIngredient {
  name: string;
  grams: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
}

export interface MealLog {
  id: string;
  date: string;
  timing: MealTiming;
  name: string;
  type: MealType;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  ingredients: MealIngredient[];
  createdAt: Date;
}

export interface WeightLog {
  id: string;
  date: string;
  weight: number;
  createdAt: Date;
}

/** グラフ画面で記録する体型写真（正面・横・後ろ） */
export interface BodyPhotoSet {
  id: string;
  date: string;
  frontUrl: string;
  sideUrl: string;
  backUrl: string;
  updatedAt: Date;
}

export interface SizeLog {
  id: string;
  date: string;
  waist?: number;
  /** 下腹（cm） */
  lowerAbdomen?: number;
  hip?: number;
  /** バスト（cm） */
  bust?: number;
  notes?: string;
  createdAt: Date;
}

/** 保存レシピの分類（食事追加の「いつもの自炊／いつもの外食」に対応） */
export type RecipeKind = 'cooking' | 'restaurant';

/** 材料の分量の単位（g または 個） */
export type RecipeIngredientUnit = 'g' | 'piece';

/** レシピ登録の材料1行 */
export interface RecipeIngredientLine {
  name: string;
  /** 数値部分（例: 200、2） */
  amount: string;
  /** 未設定のレシピは従来どおり amount に「250g」などを含む場合がある */
  unit?: RecipeIngredientUnit;
}

export interface Recipe {
  id: string;
  kind: RecipeKind;
  name: string;
  servings: number;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  note?: string;
  /** いつもの自炊で入力した材料（任意） */
  ingredients?: RecipeIngredientLine[];
  createdAt: Date;
}

export interface RestaurantEstimate {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  note: string;
}

export interface CookingEstimate {
  name: string;
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number;
  note: string;
  ingredients?: MealIngredient[];
}
