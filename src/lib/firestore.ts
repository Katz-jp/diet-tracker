import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { getDb } from '@/lib/firebase';
import { deleteBodyPhotoFolder, uploadBodyPhoto } from '@/lib/storage';
import type {
  BodyPhotoSet,
  MealIngredient,
  MealLog,
  MealTiming,
  MealType,
  Recipe,
  RecipeKind,
  SizeLog,
  UserGoals,
  UserProfile,
} from '@/types';

const defaultGoals: UserGoals = {
  targetWeight: 65,
  calories: 2000,
  protein: 120,
  fat: 60,
  carbs: 250,
  fiber: 25,
};

function tsToDate(v: unknown): Date {
  if (v instanceof Timestamp) {
    return v.toDate();
  }
  if (v instanceof Date) {
    return v;
  }
  return new Date();
}

export async function ensureUserDocument(user: User): Promise<void> {
  const db = getDb();
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    return;
  }
  await setDoc(ref, {
    profile: {
      displayName: user.displayName ?? '',
      email: user.email ?? '',
      createdAt: serverTimestamp(),
    },
    goals: defaultGoals,
  });
}

export function subscribeUserGoals(uid: string, onGoals: (goals: UserGoals) => void): Unsubscribe {
  const db = getDb();
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    const data = snap.data();
    const g = data?.goals as UserGoals | undefined;
    onGoals(g ?? defaultGoals);
  });
}

export function subscribeUserProfile(
  uid: string,
  onProfile: (profile: UserProfile | null) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    const data = snap.data();
    const p = data?.profile as
      | { displayName?: string; email?: string; createdAt?: Timestamp }
      | undefined;
    if (!p) {
      onProfile(null);
      return;
    }
    onProfile({
      displayName: p.displayName ?? '',
      email: p.email ?? '',
      createdAt: tsToDate(p.createdAt),
    });
  });
}

export async function saveGoals(uid: string, goals: UserGoals): Promise<void> {
  const db = getDb();
  await setDoc(doc(db, 'users', uid), { goals }, { merge: true });
}

export function subscribeMealsForDate(
  uid: string,
  dateStr: string,
  onMeals: (meals: MealLog[]) => void
): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, 'users', uid, 'mealLogs'), where('date', '==', dateStr));
  return onSnapshot(q, (snap) => {
    const list: MealLog[] = snap.docs.map((d) => {
      const m = d.data();
      const ingredients = (m.ingredients as MealIngredient[] | undefined) ?? [];
      return {
        id: d.id,
        date: m.date as string,
        timing: m.timing as MealLog['timing'],
        name: m.name as string,
        type: m.type as MealType,
        calories: Number(m.calories ?? 0),
        protein: Number(m.protein ?? 0),
        fat: Number(m.fat ?? 0),
        carbs: Number(m.carbs ?? 0),
        fiber: Number(m.fiber ?? 0),
        ingredients,
        createdAt: tsToDate(m.createdAt),
      };
    });
    list.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    onMeals(list);
  });
}

export function subscribeMealsInRange(
  uid: string,
  startDate: string,
  endDate: string,
  onMeals: (meals: MealLog[]) => void
): Unsubscribe {
  const db = getDb();
  const q = query(
    collection(db, 'users', uid, 'mealLogs'),
    where('date', '>=', startDate),
    where('date', '<=', endDate)
  );
  return onSnapshot(q, (snap) => {
    const list: MealLog[] = snap.docs.map((d) => {
      const m = d.data();
      const ingredients = (m.ingredients as MealIngredient[] | undefined) ?? [];
      return {
        id: d.id,
        date: m.date as string,
        timing: m.timing as MealLog['timing'],
        name: m.name as string,
        type: m.type as MealType,
        calories: Number(m.calories ?? 0),
        protein: Number(m.protein ?? 0),
        fat: Number(m.fat ?? 0),
        carbs: Number(m.carbs ?? 0),
        fiber: Number(m.fiber ?? 0),
        ingredients,
        createdAt: tsToDate(m.createdAt),
      };
    });
    list.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.getTime() - b.createdAt.getTime());
    onMeals(list);
  });
}

export async function addMealLog(
  uid: string,
  payload: {
    date: string;
    timing: MealTiming;
    name: string;
    type: MealType;
    calories: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
    ingredients?: MealIngredient[];
  }
): Promise<void> {
  const db = getDb();
  await addDoc(collection(db, 'users', uid, 'mealLogs'), {
    ...payload,
    ingredients: payload.ingredients ?? [],
    createdAt: serverTimestamp(),
  });
}

export async function deleteMealLog(uid: string, mealId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', uid, 'mealLogs', mealId));
}

export function subscribeWeightLogs(
  uid: string,
  onLogs: (logs: { id: string; date: string; weight: number; createdAt: Date }[]) => void
): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, 'users', uid, 'weightLogs'));
  return onSnapshot(q, (snap) => {
    const list = snap.docs.map((d) => {
      const m = d.data();
      return {
        id: d.id,
        date: m.date as string,
        weight: Number(m.weight ?? 0),
        createdAt: tsToDate(m.createdAt),
      };
    });
    list.sort((a, b) => b.date.localeCompare(a.date));
    onLogs(list);
  });
}

export async function addWeightLog(uid: string, date: string, weight: number): Promise<void> {
  await addDoc(collection(getDb(), 'users', uid, 'weightLogs'), {
    date,
    weight,
    createdAt: serverTimestamp(),
  });
}

export async function deleteWeightLog(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', uid, 'weightLogs', id));
}

export function subscribeSizeLogs(uid: string, onLogs: (logs: SizeLog[]) => void): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, 'users', uid, 'sizeLogs'));
  return onSnapshot(q, (snap) => {
    const list: SizeLog[] = snap.docs.map((d) => {
      const m = d.data();
      const bustRaw = m.bust ?? m.chest;
      return {
        id: d.id,
        date: m.date as string,
        waist: m.waist != null ? Number(m.waist) : undefined,
        lowerAbdomen: m.lowerAbdomen != null ? Number(m.lowerAbdomen) : undefined,
        hip: m.hip != null ? Number(m.hip) : undefined,
        bust: bustRaw != null ? Number(bustRaw) : undefined,
        notes: m.notes as string | undefined,
        createdAt: tsToDate(m.createdAt),
      };
    });
    list.sort((a, b) => b.date.localeCompare(a.date));
    onLogs(list);
  });
}

export async function addSizeLog(
  uid: string,
  payload: {
    date: string;
    waist?: number;
    lowerAbdomen?: number;
    hip?: number;
    bust?: number;
    notes?: string;
  }
): Promise<void> {
  const data: Record<string, unknown> = {
    date: payload.date,
    createdAt: serverTimestamp(),
  };
  for (const key of ['waist', 'lowerAbdomen', 'hip', 'bust'] as const) {
    const v = payload[key];
    if (v !== undefined && !Number.isNaN(v)) {
      data[key] = v;
    }
  }
  if (payload.notes !== undefined && payload.notes !== '') {
    data.notes = payload.notes;
  }
  const hasNumber = ['waist', 'lowerAbdomen', 'hip', 'bust'].some((k) => data[k] !== undefined);
  if (!hasNumber && data.notes === undefined) {
    throw new Error('少なくとも1つのサイズ（cm）かメモを入力してください。');
  }
  await addDoc(collection(getDb(), 'users', uid, 'sizeLogs'), data);
}

export async function deleteSizeLog(uid: string, id: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', uid, 'sizeLogs', id));
}

export function subscribeRecipes(uid: string, onRecipes: (recipes: Recipe[]) => void): Unsubscribe {
  const db = getDb();
  const q = query(collection(db, 'users', uid, 'recipes'));
  return onSnapshot(q, (snap) => {
    const list: Recipe[] = snap.docs.map((d) => {
      const m = d.data();
      const kindRaw = m.kind as string | undefined;
      const kind: RecipeKind = kindRaw === 'restaurant' ? 'restaurant' : 'cooking';
      const rawIng = m.ingredients;
      let ingredients: Recipe['ingredients'];
      if (Array.isArray(rawIng)) {
        const parsed = rawIng
          .map((row) => {
            if (!row || typeof row !== 'object') return null;
            const o = row as Record<string, unknown>;
            const name = typeof o.name === 'string' ? o.name : '';
            const amount = typeof o.amount === 'string' ? o.amount : '';
            const u = o.unit;
            const unit =
              u === 'piece' || u === 'g' ? (u as 'g' | 'piece') : undefined;
            if (!name.trim() && !amount.trim()) return null;
            return { name, amount, ...(unit !== undefined ? { unit } : {}) };
          })
          .filter((x): x is { name: string; amount: string } => x !== null);
        ingredients = parsed.length > 0 ? parsed : undefined;
      }

      return {
        id: d.id,
        kind,
        name: m.name as string,
        servings: Number(m.servings ?? 1),
        calories: Number(m.calories ?? 0),
        protein: Number(m.protein ?? 0),
        fat: Number(m.fat ?? 0),
        carbs: Number(m.carbs ?? 0),
        fiber: Number(m.fiber ?? 0),
        note: m.note as string | undefined,
        ingredients,
        createdAt: tsToDate(m.createdAt),
      };
    });
    list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    onRecipes(list);
  });
}

export async function addRecipe(
  uid: string,
  payload: Omit<Recipe, 'id' | 'createdAt'>
): Promise<void> {
  const { note, ingredients, ...rest } = payload;
  await addDoc(collection(getDb(), 'users', uid, 'recipes'), {
    ...rest,
    ...(note !== undefined && note !== '' ? { note } : {}),
    ...(ingredients !== undefined && ingredients.length > 0 ? { ingredients } : {}),
    createdAt: serverTimestamp(),
  });
}

export async function updateRecipe(
  uid: string,
  recipeId: string,
  payload: Omit<Recipe, 'id' | 'createdAt'>
): Promise<void> {
  const { note, ingredients, ...rest } = payload;
  await setDoc(doc(getDb(), 'users', uid, 'recipes', recipeId), {
    ...rest,
    ...(note !== undefined && note !== '' ? { note } : {}),
    ...(ingredients !== undefined && ingredients.length > 0 ? { ingredients } : {}),
  }, { merge: false });
}

export async function deleteRecipe(uid: string, recipeId: string): Promise<void> {
  await deleteDoc(doc(getDb(), 'users', uid, 'recipes', recipeId));
}

export function subscribeBodyPhotoSets(
  uid: string,
  onSets: (sets: BodyPhotoSet[]) => void
): Unsubscribe {
  const db = getDb();
  return onSnapshot(collection(db, 'users', uid, 'bodyPhotoSets'), (snap) => {
    const list: BodyPhotoSet[] = snap.docs.map((d) => {
      const m = d.data();
      return {
        id: d.id,
        date: m.date as string,
        frontUrl: m.frontUrl as string,
        sideUrl: m.sideUrl as string,
        backUrl: m.backUrl as string,
        updatedAt: tsToDate(m.updatedAt),
      };
    });
    list.sort((a, b) => b.date.localeCompare(a.date));
    onSets(list);
  });
}

export async function saveBodyPhotoSet(
  uid: string,
  date: string,
  files: { front?: File; side?: File; back?: File },
  existing: BodyPhotoSet | null
): Promise<void> {
  let frontUrl = existing?.frontUrl ?? '';
  let sideUrl = existing?.sideUrl ?? '';
  let backUrl = existing?.backUrl ?? '';
  if (files.front) {
    frontUrl = await uploadBodyPhoto(uid, date, 'front', files.front);
  }
  if (files.side) {
    sideUrl = await uploadBodyPhoto(uid, date, 'side', files.side);
  }
  if (files.back) {
    backUrl = await uploadBodyPhoto(uid, date, 'back', files.back);
  }
  if (!frontUrl || !sideUrl || !backUrl) {
    throw new Error('正面・横・後ろの3枚すべて必要です（未登録の角度は写真を選んでください）。');
  }
  const db = getDb();
  await setDoc(doc(db, 'users', uid, 'bodyPhotoSets', date), {
    date,
    frontUrl,
    sideUrl,
    backUrl,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBodyPhotoSet(uid: string, date: string): Promise<void> {
  await deleteBodyPhotoFolder(uid, date);
  await deleteDoc(doc(getDb(), 'users', uid, 'bodyPhotoSets', date));
}
