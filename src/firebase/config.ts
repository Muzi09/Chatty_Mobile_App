// ============================================================================
// Firebase initialization.
// ----------------------------------------------------------------------------
// Uses the JS modular SDK (v9+) so this works in Expo dev builds without a
// native rebuild. The trade-off: no Analytics auto-collection, no native
// Crashlytics. If you need those, switch to @react-native-firebase/* and
// add the google-services file — but you'll need a dev build.
//
// Config is read from Expo's extra field so you can ship one codebase to
// staging and prod by switching `app.config.js` envs.
// ============================================================================

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

function readConfig(): FirebaseConfig {
  // Prefer the Expo extra field so different build profiles can swap
  // configs (e.g. staging vs prod) via app.config.js / .env files.
  const extra = (Constants.expoConfig?.extra as Record<string, unknown> | undefined)?.firebase as
    | Partial<FirebaseConfig>
    | undefined;

  const cfg: FirebaseConfig = {
    apiKey: extra?.apiKey ?? process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: extra?.authDomain ?? process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: extra?.projectId ?? process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    storageBucket:
      extra?.storageBucket ?? process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
    messagingSenderId:
      extra?.messagingSenderId ?? process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: extra?.appId ?? process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  };

  if (!cfg.apiKey || !cfg.projectId) {
    // Surface a loud error at first load rather than a confusing failure
    // deep inside the auth flow. Devs hit this when they forget to set
    // the env vars.
    // eslint-disable-next-line no-console
    console.warn(
      '[firebase] Missing config. Set EXPO_PUBLIC_FIREBASE_* env vars or add `extra.firebase` to app.config.js.',
    );
  }

  return cfg;
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _storage: FirebaseStorage | null = null;
let _functions: Functions | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (_app) return _app;
  _app = getApps().length ? getApp() : initializeApp(readConfig());
  return _app;
}

export function getFirebaseAuth(): Auth {
  if (_auth) return _auth;
  // initializeAuth with AsyncStorage persistence — this is the difference
  // between "session survives app restart" and "user gets logged out
  // every time". `getAuth()` alone uses in-memory persistence on RN.
  try {
    _auth = initializeAuth(getFirebaseApp(), {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    // initializeAuth throws if called twice in hot-reload. Fall back to
    // the default (still has RN in-memory persistence, but better than
    // crashing the app).
    _auth = getAuth(getFirebaseApp());
  }
  return _auth;
}

export function getDb(): Firestore {
  if (_db) return _db;
  _db = getFirestore(getFirebaseApp());
  return _db;
}

export function getStorageInstance(): FirebaseStorage {
  if (_storage) return _storage;
  _storage = getStorage(getFirebaseApp());
  return _storage;
}

export function getFunctionsInstance(): Functions {
  if (_functions) return _functions;
  _functions = getFunctions(getFirebaseApp());
  return _functions;
}
