// ============================================================================
// useAuth — auth state + profile. The single source of truth for "who am I".
// ----------------------------------------------------------------------------
// Lives at the top of the tree (wrapped in AuthProvider). Children get
// `user`, `profile`, `loading`, and the service methods.
// ============================================================================

import { useEffect, useState, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { UserProfile } from '../types';

export interface UseAuthState {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  error: Error | null;
  signUp: (args: { email: string; password: string; name: string }) => Promise<string>;
  signIn: (args: { email: string; password: string }) => Promise<string>;
  signOut: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
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

  // 1) Listen to Firebase auth state.
  useEffect(() => {
    const unsub = authService.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) {
        setProfile(null);
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  // 2) Whenever the user changes, fetch the Firestore profile and
  //    keep it live.
  useEffect(() => {
    if (!user) return;
    setLoading(true);
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

  return {
    user,
    profile,
    loading,
    error,
    signUp,
    signIn,
    signOut,
    forgotPassword,
    refreshProfile,
  };
}
