// ============================================================================
// userService — user profile reads/writes, search, presence.
// ----------------------------------------------------------------------------
// This is the layer screens call. It does not touch the SDK directly.
// ============================================================================

import { doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../firebase/config';
import { userRepository } from '../repositories/userRepository';
import { usernameRepository } from '../repositories/usernameRepository';
import { storageRepository } from '../repositories/storageRepository';
import { AppError, toAppError } from '../utils/errors';
import { COLLECTIONS, ErrorCode } from '../constants/firebase';
import { UserProfile, UserSummary } from '../types';
import { isValidUsername, normalizeUsername } from '../utils/username';

function deriveName(firstName: string, lastName: string): string {
  return `${firstName.trim()} ${lastName.trim()}`.trim();
}

export const userService = {
  async get(uid: string): Promise<UserProfile | null> {
    return userRepository.get(uid);
  },

  async getMany(uid: string): Promise<UserProfile> {
    const u = await userRepository.get(uid);
    if (!u) throw new AppError(ErrorCode.UserNotFound);
    return u;
  },

  async search(query: string): Promise<UserProfile[]> {
    return userRepository.searchByName(query);
  },

  async listAll(): Promise<UserProfile[]> {
    return userRepository.listAll();
  },

  async updateProfile(
    uid: string,
    patch: Partial<Pick<UserProfile, 'name' | 'status' | 'photoURL'>>,
  ): Promise<void> {
    await userRepository.update(uid, patch);
  },

  /**
   * Set the user's name fields + claim the unique username in a single
   * transaction. If the username is taken, throws AppError(PermissionDenied).
   * Pass `previousUsernameLower` to release the old reservation in the
   * same transaction (e.g. on a profile edit screen).
   */
  async setNames(args: {
    uid: string;
    firstName: string;
    lastName: string;
    username: string;
    previousUsernameLower?: string;
  }): Promise<void> {
    const first = args.firstName.trim();
    const last = args.lastName.trim();
    const username = args.username.trim();

    if (!first) throw new AppError(ErrorCode.PermissionDenied, 'First name is required');
    if (!last) throw new AppError(ErrorCode.PermissionDenied, 'Last name is required');
    if (!isValidUsername(username)) {
      throw new AppError(
        ErrorCode.PermissionDenied,
        'Username must be 3-20 chars, letters/numbers/underscore only',
      );
    }
    const lower = normalizeUsername(username);
    const prev = args.previousUsernameLower
      ? normalizeUsername(args.previousUsernameLower)
      : null;
    const fullName = deriveName(first, last);

    const userRef = doc(getDb(), COLLECTIONS.USERS, args.uid);
    const usernameRef = doc(getDb(), COLLECTIONS.USERNAMES, lower);

    try {
      await runTransaction(getDb(), async (tx) => {
        // 1) Reserve username (idempotent for same uid).
        const unameSnap = await tx.get(usernameRef);
        if (unameSnap.exists()) {
          const ownerUid = unameSnap.data()?.uid as string | undefined;
          if (ownerUid && ownerUid !== args.uid) {
            throw new AppError(
              ErrorCode.PermissionDenied,
              'That username is already taken',
            );
          }
        } else {
          tx.set(usernameRef, {
            uid: args.uid,
            username,
            createdAt: serverTimestamp(),
          });
        }

        // 2) Release previous username reservation if it changed.
        if (prev && prev !== lower) {
          const prevRef = doc(getDb(), COLLECTIONS.USERNAMES, prev);
          const prevSnap = await tx.get(prevRef);
          if (prevSnap.exists() && prevSnap.data()?.uid === args.uid) {
            tx.delete(prevRef);
          }
        }

        // 3) Update the user doc.
        tx.update(userRef, {
          firstName: first,
          lastName: last,
          name: fullName,
          username,
          usernameLower: lower,
          displayNameLower: fullName.toLowerCase(),
        });
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Used by account-deletion flows. Releases a username reservation. */
  async releaseUsername(uid: string, lowerUsername: string): Promise<void> {
    return usernameRepository.release(uid, lowerUsername);
  },

  async uploadAvatar(uid: string, file: Blob, contentType: string): Promise<string> {
    const url = await storageRepository.uploadAvatar(uid, file, contentType);
    await userRepository.update(uid, { photoURL: url });
    return url;
  },

  async setPushToken(uid: string, token: string): Promise<void> {
    await userRepository.update(uid, { pushToken: token });
  },

  watch(uid: string, cb: (u: UserProfile | null) => void): () => void {
    return userRepository.watch(uid, cb);
  },

  watchMany(uids: string[], cb: (u: Record<string, UserSummary>) => void): () => void {
    return userRepository.watchMany(uids, cb);
  },
};
