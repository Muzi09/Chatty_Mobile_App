// ============================================================================
// userRepository — Firestore → UserProfile.
// ----------------------------------------------------------------------------
// All reads/writes of /users/{uid} go through here. Services should not
// import from 'firebase/firestore' directly; that keeps the surface
// area mockable.
// ============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  orderBy,
  startAt,
  endAt,
  limit,
  onSnapshot,
  serverTimestamp,
  Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '../firebase/config';
import { COLLECTIONS } from '../constants/firebase';
import { toDate } from '../utils/timestamp';
import { toAppError, AppError } from '../utils/errors';
import { ErrorCode } from '../constants/firebase';
import { UserProfile, UserSummary } from '../types';

function ref(uid?: string) {
  return uid
    ? doc(getDb(), COLLECTIONS.USERS, uid)
    : doc(getDb(), COLLECTIONS.USERS, '__none__');
}

function mapUserDoc(snap: import('firebase/firestore').DocumentSnapshot): UserProfile {
  const d = snap.data();
  if (!d) throw new AppError(ErrorCode.UserNotFound);
  return {
    uid: snap.id,
    name: d.name ?? '',
    email: d.email ?? '',
    photoURL: d.photoURL ?? '',
    status: d.status ?? '',
    isOnline: !!d.isOnline,
    lastSeen: toDate(d.lastSeen),
    createdAt: toDate(d.createdAt),
    displayNameLower: d.displayNameLower,
    pushToken: d.pushToken,
  };
}

function mapUserSummary(snap: import('firebase/firestore').DocumentSnapshot): UserSummary {
  const d = snap.data() ?? {};
  return {
    uid: snap.id,
    name: d.name ?? '',
    photoURL: d.photoURL ?? '',
    isOnline: !!d.isOnline,
    lastSeen: toDate(d.lastSeen),
  };
}

export const userRepository = {
  async get(uid: string): Promise<UserProfile | null> {
    try {
      const snap = await getDoc(ref(uid));
      return snap.exists() ? mapUserDoc(snap) : null;
    } catch (e) {
      throw toAppError(e, ErrorCode.UserNotFound);
    }
  },

  async create(profile: Omit<UserProfile, 'lastSeen' | 'createdAt'>): Promise<void> {
    try {
      await setDoc(ref(profile.uid), {
        ...profile,
        displayNameLower: profile.name.trim().toLowerCase(),
        lastSeen: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  async update(uid: string, patch: Partial<UserProfile>): Promise<void> {
    try {
      const update: Record<string, unknown> = { ...patch };
      if (typeof patch.name === 'string') {
        update.displayNameLower = patch.name.trim().toLowerCase();
      }
      await updateDoc(ref(uid), update);
    } catch (e) {
      throw toAppError(e);
    }
  },

  async setOnline(uid: string, isOnline: boolean): Promise<void> {
    try {
      await updateDoc(ref(uid), {
        isOnline,
        lastSeen: serverTimestamp(),
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  async listAll(max = 200): Promise<UserProfile[]> {
    try {
      const q = query(collection(getDb(), COLLECTIONS.USERS), orderBy('name'), limit(max));
      const snap = await getDocs(q);
      return snap.docs.map(mapUserDoc);
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Prefix search on lowercased name. Cheap because of the
   *  `displayNameLower` denormalized field. */
  async searchByName(prefix: string, max = 25): Promise<UserProfile[]> {
    const lower = prefix.trim().toLowerCase();
    if (!lower) return [];
    try {
      const q = query(
        collection(getDb(), COLLECTIONS.USERS),
        orderBy('displayNameLower'),
        startAt(lower),
        endAt(lower + ''),
        limit(max),
      );
      const snap = await getDocs(q);
      return snap.docs.map(mapUserDoc);
    } catch (e) {
      throw toAppError(e);
    }
  },

  /**
   * Subscribe to a user's profile. The callback fires on every change.
   * Returns the unsubscribe function. Hooks are responsible for
   * subscribing in useEffect and unsubscribing on cleanup.
   */
  watch(uid: string, cb: (u: UserProfile | null) => void): Unsubscribe {
    return onSnapshot(
      ref(uid),
      (snap) => cb(snap.exists() ? mapUserDoc(snap) : null),
      (err) => {
        // Errors here are not fatal; just log and emit null.
        // eslint-disable-next-line no-console
        console.warn('[userRepository.watch]', err);
        cb(null);
      },
    );
  },

  /** Bulk watch — used by chat list to render presence indicators. */
  watchMany(uids: string[], cb: (users: Record<string, UserSummary>) => void): Unsubscribe {
    if (uids.length === 0) {
      cb({});
      return () => {};
    }
    // Firestore `in` queries support up to 30 values. For more, chunk.
    const chunks: string[][] = [];
    for (let i = 0; i < uids.length; i += 30) chunks.push(uids.slice(i, i + 30));

    const unsubs: Unsubscribe[] = [];
    const acc: Record<string, UserSummary> = {};
    const emit = () => cb({ ...acc });

    for (const chunk of chunks) {
      const q = query(collection(getDb(), COLLECTIONS.USERS), where('__name__', 'in', chunk));
      const unsub = onSnapshot(
        q,
        (snap) => {
          for (const d of snap.docs) {
            if (!d.exists()) {
              delete acc[d.id];
            } else {
              acc[d.id] = mapUserSummary(d);
            }
          }
          emit();
        },
        (err) => {
          // eslint-disable-next-line no-console
          console.warn('[userRepository.watchMany]', err);
        },
      );
      unsubs.push(unsub);
    }
    return () => unsubs.forEach((u) => u());
  },
};
