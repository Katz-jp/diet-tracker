/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY?: string;
  readonly EXPO_PUBLIC_FIREBASE_API_KEY?: string;
  readonly VITE_OPENAI_API_KEY?: string;
  readonly EXPO_PUBLIC_OPENAI_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
