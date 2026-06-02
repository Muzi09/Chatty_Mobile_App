// ============================================================================
// usernameRepository — uniqueness reservation for usernames.
// ----------------------------------------------------------------------------
// We store one doc per claimed username at /usernames/{lowerUsername}.
// The doc id IS the lowercased username (so lookups are O(1)), and the
// body just holds the uid that owns it.
// ============================================================================

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { getDb } from '../firebase/config';
import { COLLECTIONS } from '../constants/firebase';
import { toAppError, AppError } from '../utils/errors';
import { ErrorCode } from '../constants/firebase';
import { normalizeUsername } from '../utils/username';

function usernameRef(lower: string) {
  return doc(getDb(), COLLECTIONS.USERNAMES, lower);
}

export const usernameRepository = {
  /** O(1) lookup of a username doc. Returns the owning uid, or null. */
  async lookup(lowerUsername: string): Promise<string | null> {
    try {
      const snap = await getDoc(usernameRef(normalizeUsername(lowerUsername)));
      if (!snap.exists()) return null;
      return (snap.data()?.uid as string | undefined) ?? null;
    } catch (e) {
      throw toAppError(e);
    }
  },

  /**
   * Claim a username for `uid`. If the username is already taken by
   * a different uid, throws an AppError with `PermissionDenied` so the
   * UI can show "username taken". If it's already owned by the same uid,
   * this is a no-op (idempotent).
   *
   * Pass `previousUsernameLower` if the user is changing usernames — we
   * release the old reservation in the same transaction.
   */
  async claim(args: {
    uid: string;
    username: string;
    previousUsernameLower?: string;
  }): Promise<void> {
    const lower = normalizeUsername(args.username);
    const prev = args.previousUsernameLower
      ? normalizeUsername(args.previousUsernameLower)
      : null;

    try {
      await runTransaction(getDb(), async (tx) => {
        const targetRef = usernameRef(lower);
        const targetSnap = await tx.get(targetRef);
        if (targetSnap.exists()) {
          const ownerUid = targetSnap.data()?.uid as string | undefined;
          if (ownerUid && ownerUid !== args.uid) {
            throw new AppError(
              ErrorCode.PermissionDenied,
              'That username is already taken',
            );
          }
          // Already owned by this uid — no-op.
        } else {
          tx.set(targetRef, {
            uid: args.uid,
            username: args.username,
            createdAt: serverTimestamp(),
          });
        }
        if (prev && prev !== lower) {
          // Release the old reservation. The old doc may have been
          // removed in some flows; treat missing as fine.
          const prevRef = usernameRef(prev);
          const prevSnap = await tx.get(prevRef);
          if (prevSnap.exists() && prevSnap.data()?.uid === args.uid) {
            tx.delete(prevRef);
          }
        }
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Release a username reservation. Idempotent. */
  async release(uid: string, lowerUsername: string): Promise<void> {
    const lower = normalizeUsername(lowerUsername);
    try {
      const ref = usernameRef(lower);
      const snap = await getDoc(ref);
      if (snap.exists() && snap.data()?.uid === uid) {
        await deleteDoc(ref);
      }
    } catch (e) {
      throw toAppError(e);
    }
  },
};

// Helper for tests / one-shot use.
export async function setUsernameDocRaw(uid: string, username: string): Promise<void> {
  await setDoc(usernameRef(normalizeUsername(username)), {
    uid,
    username,
    createdAt: serverTimestamp(),
  });
}
