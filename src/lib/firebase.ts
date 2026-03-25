import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { firebaseConfig, isFirebaseConfigured as configured } from '@/env';

let cachedApp: FirebaseApp | null = null;
let cachedAuth: Auth | null = null;
let cachedDb: Firestore | null = null;
let cachedStorage: FirebaseStorage | null = null;

function getApp(): FirebaseApp {
  if (cachedApp) {
    return cachedApp;
  }
  if (getApps().length > 0) {
    cachedApp = getApps()[0]!;
    return cachedApp;
  }
  cachedApp = initializeApp(firebaseConfig());
  return cachedApp;
}

export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }
  cachedAuth = getAuth(getApp());
  return cachedAuth;
}

export function getDb(): Firestore {
  if (cachedDb) {
    return cachedDb;
  }
  cachedDb = getFirestore(getApp());
  return cachedDb;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (cachedStorage) {
    return cachedStorage;
  }
  cachedStorage = getStorage(getApp());
  return cachedStorage;
}

export function isFirebaseConfigured(): boolean {
  return configured();
}
