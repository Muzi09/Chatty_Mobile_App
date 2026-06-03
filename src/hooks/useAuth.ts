// ============================================================================
// useAuth — auth state + profile. The single source of truth for "who am I".
// ----------------------------------------------------------------------------
// Lives at the top of the tree (wrapped in AuthProvider). Children get
// `user`, `profile`, `loading`, and the service methods.
// ============================================================================

import { User as FirebaseUser } from 'firebase/auth';
import { useCallback, useEffect, useRef, useState } from 'react';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile } from '../types';

export interface UseAuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  /**
   * True when the user is signed in but has not yet chosen a unique
   * username. The AuthGate uses this to route to /complete-profile.
   */
  needsProfileCompletion: boolean;
  signUp: (args: { email: string; password: string; name: string }) => Promise<string>;
  signIn: (args: { email: string; password: string }) => Promise<string>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
  /**
   * Save first name, last name, and a unique username. Reserved via a
   * transaction in userService.setNames — throws if the username is
   * already taken.
   */
  completeProfile: (args: {
    firstName: string;
    lastName: string;
    username: string;
  }) => Promise<void>;
}

/**
 * Lower-level hook. Most screens should consume this via AuthContext
 * so the profile fetch is shared, not duplicated per screen.
 */
export function useAuthInternal(): UseAuthState {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // DEBUG: render counter
  const renderCount = useRef(0);
  renderCount.current += 1;
  // eslint-disable-next-line no-console
  console.log(`[DEBUG] useAuthInternal render #${renderCount.current}, loading=${loading}, user=${user?.uid ?? 'null'}`);

  // 1) Listen to Firebase auth state.
  useEffect(() => {
    const unsub = authService.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
      }
      // Always clear loading once we know the auth state — never leave
      // `loading` true when `user` is settled.
      setLoading(false);
    });
    // Safety net: if the auth callback never fires (SDK init failure,
    // hot-reload edge case, etc.), clear loading so the AuthGate doesn't
    // show a spinner forever.
    const timeout = setTimeout(() => setLoading(false), 5000);
    return () => {
      unsub();
      clearTimeout(timeout);
    };
  }, []);

  // 2) Whenever the user changes, fetch the Firestore profile and
  //    keep it live.
  useEffect(() => {
    if (!user) {
      // No user → no profile to watch. Make sure loading is cleared so
      // the AuthGate can route to /login instead of showing a spinner.
      setLoading(false);
      return;
    }
    const unsub = userService.watch(user.uid, (p) => {
      setProfile(p);
      setLoading(false);
    });
    return unsub;
  }, [user]);

  const signUp = useCallback(
    async (args: { email: string; password: string; name: string }) => {
      try {
        return await authService.signUp(args);
      } catch (e) {
        setError(e as Error);
        throw e;
      }
    },
    [],
  );

  const signIn = useCallback(async (args: { email: string; password: string }) => {
    try {
      return await authService.signIn(args);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await authService.signOut();
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    try {
      await authService.forgotPassword(email);
    } catch (e) {
      setError(e as Error);
      throw e;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const p = await userService.get(user.uid);
    setProfile(p);
  }, [user]);

  const completeProfile = useCallback(
    async (args: { firstName: string; lastName: string; username: string }) => {
      if (!user) throw new Error('Not signed in');
      try {
        await userService.setNames({
          uid: user.uid,
          firstName: args.firstName,
          lastName: args.lastName,
          username: args.username,
          previousUsernameLower: profile?.usernameLower,
        });
      } catch (e) {
        setError(e as Error);
        throw e;
      }
    },
    [user, profile],
  );

  // The profile-completion gate: signed in but no username chosen yet.
  const needsProfileCompletion = !!user && !profile?.username;

  return {
    user,
    profile,
    loading,
    error,
    needsProfileCompletion,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    refreshProfile,
    completeProfile,
  };
}
