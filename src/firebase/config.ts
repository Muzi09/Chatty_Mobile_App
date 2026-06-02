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

import { Platform } from 'react-native';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, initializeAuth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { getFunctions, Functions } from 'firebase/functions';
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

  const missing: string[] = [];
  if (!cfg.apiKey) missing.push('EXPO_PUBLIC_FIREBASE_API_KEY');
  if (!cfg.projectId) missing.push('EXPO_PUBLIC_FIREBASE_PROJECT_ID');
  if (!cfg.appId) missing.push('EXPO_PUBLIC_FIREBASE_APP_ID');
  if (!cfg.authDomain) missing.push('EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (missing.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[firebase] Missing config: ${missing.join(', ')}. ` +
        'Set EXPO_PUBLIC_FIREBASE_* env vars (and restart Expo with `expo start -c`) ' +
        'or add `extra.firebase` to app.config.js.',
    );
  } else {
    // eslint-disable-next-line no-console
    console.log(
      `[firebase] config loaded for project ${cfg.projectId} (${Platform.OS})`,
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

  // Persistence strategy:
  //   - native (iOS / Android): RN AsyncStorage, so sessions survive
  //     app restarts
  //   - web:                   browser localStorage via Firebase's
  //     default indexedDB / localStorage persistence
  //
  // `getReactNativePersistence` only exists in the firebase/auth RN
  // entry point. On web it's undefined; on native it's a function.
  // We import AsyncStorage lazily so the web bundle doesn't even
  // attempt to load it.
  if (Platform.OS === 'web') {
    _auth = getAuth(getFirebaseApp());
    return _auth;
  }

  try {
    // Lazy require so web doesn't try to bundle RN-only modules.
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
    const authModule = require('firebase/auth') as { getReactNativePersistence?: (s: unknown) => unknown };
    const getRNP = authModule.getReactNativePersistence;
    if (typeof getRNP === 'function') {
      _auth = initializeAuth(getFirebaseApp(), {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        persistence: (getRNP as any)(AsyncStorage),
      });
    } else {
      _auth = getAuth(getFirebaseApp());
    }
  } catch (e) {
    // initializeAuth throws if called twice in hot-reload. Fall back to
    // the default (in-memory persistence, but better than crashing).
    // eslint-disable-next-line no-console
    console.warn('[firebase] initializeAuth failed, falling back to getAuth:', e);
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
