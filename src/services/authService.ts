// ============================================================================
// authService — Firebase Authentication, with profile side effects.
// ----------------------------------------------------------------------------
// All five flows you asked for:
//   - email/password signup   (creates /users/{uid} profile)
//   - email/password login
//   - logout                  (sets isOnline=false, tears down presence)
//   - forgot password
//   - session persistence     (handled in firebase/config.ts)
// ============================================================================

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  sendPasswordResetEmail,
  onAuthStateChanged,
  updateProfile as fbUpdateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import { getFirebaseAuth } from '../firebase/config';
import { userRepository } from '../repositories/userRepository';
import { toAppError } from '../utils/errors';
import { ErrorCode } from '../constants/firebase';
import { AppError } from '../utils/errors';
import { UserProfile } from '../types';

export const authService = {
  /** Sign up + create profile in one flow. Returns the new uid. */
  async signUp(args: {
    email: string;
    password: string;
    name: string;
  }): Promise<string> {
    if (args.password.length < 8) {
      throw new AppError(ErrorCode.PermissionDenied, 'Password must be ≥ 8 characters');
    }
    try {
      const cred = await createUserWithEmailAndPassword(
        getFirebaseAuth(),
        args.email,
        args.password,
      );
      // Best-effort: set the display name on the auth profile too.
      try {
        await fbUpdateProfile(cred.user, { displayName: args.name });
      } catch {
        // Non-fatal — the Firestore profile is what we render from.
      }
      // Create the Firestore profile.
      await userRepository.create({
        uid: cred.user.uid,
        name: args.name,
        email: args.email,
        photoURL: '',
        status: 'Hey there! I am using Chatty.',
        isOnline: true,
        pushToken: undefined,
      });
      return cred.user.uid;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async signIn(args: { email: string; password: string }): Promise<string> {
    try {
      const cred = await signInWithEmailAndPassword(
        getFirebaseAuth(),
        args.email,
        args.password,
      );
      await userRepository.setOnline(cred.user.uid, true);
      return cred.user.uid;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async signOut(): Promise<void> {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (uid) {
      // Best-effort presence update. If offline, this just fails — the
      // Firestore offline cache will replay it.
      try {
        await userRepository.setOnline(uid, false);
      } catch {
        // ignore
      }
    }
    await fbSignOut(getFirebaseAuth());
  },

  async forgotPassword(email: string): Promise<void> {
    try {
      await sendPasswordResetEmail(getFirebaseAuth(), email);
    } catch (e) {
      throw toAppError(e);
    }
  },

  /**
   * Subscribe to auth state changes. Fires immediately with the
   * current user (which is null on first load).
   */
  onAuthStateChanged(cb: (u: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(getFirebaseAuth(), cb);
  },

  /** Convenience for the current uid. Throws if not signed in. */
  requireUid(): string {
    const uid = getFirebaseAuth().currentUser?.uid;
    if (!uid) throw new AppError(ErrorCode.NotAuthenticated);
    return uid;
  },

  /** Current user without throwing. */
  currentUser(): FirebaseUser | null {
    return getFirebaseAuth().currentUser;
  },
};

/** Re-exported so hooks don't need to import from 'firebase/auth'. */
export type { UserProfile };
