const E = import.meta.env;

export function firebaseConfig() {
  return {
    apiKey: E.VITE_FIREBASE_API_KEY ?? E.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: E.VITE_FIREBASE_AUTH_DOMAIN ?? E.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: E.VITE_FIREBASE_PROJECT_ID ?? E.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: E.VITE_FIREBASE_STORAGE_BUCKET ?? E.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId:
      E.VITE_FIREBASE_MESSAGING_SENDER_ID ?? E.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: E.VITE_FIREBASE_APP_ID ?? E.EXPO_PUBLIC_FIREBASE_APP_ID,
  };
}

export function openAiApiKey(): string {
  const key = E.VITE_OPENAI_API_KEY ?? E.EXPO_PUBLIC_OPENAI_API_KEY;
  if (!key) {
    throw new Error('OpenAI API キーが .env に設定されていません（VITE_OPENAI_API_KEY または EXPO_PUBLIC_OPENAI_API_KEY）');
  }
  return key;
}

export function isFirebaseConfigured(): boolean {
  const c = firebaseConfig();
  return Boolean(c.apiKey && c.projectId);
}
