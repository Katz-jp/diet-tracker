import { create } from 'zustand';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth, isFirebaseConfigured } from '@/lib/firebase';
import { ensureUserDocument } from '@/lib/firestore';

type AuthState = {
  user: User | null;
  loading: boolean;
  error: string | null;
  init: () => void;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  error: null,

  init: () => {
    if (!isFirebaseConfigured()) {
      set({ loading: false, error: 'Firebase の環境変数が未設定です。' });
      return;
    }
    const auth = getFirebaseAuth();
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          await ensureUserDocument(user);
        } catch {
          // ignore
        }
      }
      set({ user, loading: false, error: null });
    });
  },

  signInWithGoogle: async () => {
    set({ error: null });
    const auth = getFirebaseAuth();
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'ログインに失敗しました';
      set({ error: msg });
    }
  },

  logout: async () => {
    await signOut(getFirebaseAuth());
  },
}));
