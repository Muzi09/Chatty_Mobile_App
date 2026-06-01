// ============================================================================
// AuthContext — top-level provider for auth + profile state.
// ----------------------------------------------------------------------------
// Place inside the Expo Router root layout, above any screen that
// needs `useAuth()`. Also wires up:
//   - presence: sets isOnline=true on connect, false on disconnect
//   - push notifications: registers a token, listens for taps
//   - AppState: switches isOnline on background/foreground
// ============================================================================

import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useAuthInternal, UseAuthState } from '../hooks/useAuth';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { notificationService, setRouteResolver } from '../services/notificationService';

const AuthContext = createContext<UseAuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const state = useAuthInternal();
  const { user } = state;

  // ---- Presence: online/offline + lastSeen ----
  useEffect(() => {
    if (!user) return;
    // Mark online at mount.
    import('../repositories/userRepository').then((m) =>
      m.userRepository.setOnline(user.uid, true).catch(() => {}),
    );

    // AppState: when backgrounded, mark offline. When foregrounded, mark
    // online. lastSeen is updated by the setOnline call.
    const onChange = (status: AppStateStatus) => {
      const online = status === 'active';
      import('../repositories/userRepository').then((m) =>
        m.userRepository.setOnline(user.uid, online).catch(() => {}),
      );
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => {
      sub.remove();
      // Last-resort: mark offline when provider unmounts.
      import('../repositories/userRepository').then((m) =>
        m.userRepository.setOnline(user.uid, false).catch(() => {}),
      );
    };
  }, [user]);

  // ---- Push notifications ----
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const token = await notificationService.registerForPush();
      if (cancelled || !token) return;
      await authService; // (no-op; keep tree-shaker happy)
      // Token was already saved inside registerForPush.
    })();
    const unsubTaps = notificationService.onResponseTapped({
      resolve: ({ scope, id }) =>
        scope === 'group' ? `/chat/${id}?scope=group` : `/chat/${id}`,
    });
    const unsubRefresh = notificationService.onTokenRefresh(async (token) => {
      try {
        await userService.setPushToken(user.uid, token);
      } catch {
        // ignore
      }
    });
    return () => {
      cancelled = true;
      unsubTaps();
      unsubRefresh();
    };
  }, [user]);

  // Wire the route resolver once at provider mount.
  useEffect(() => {
    setRouteResolver(({ scope, id }) =>
      scope === 'group' ? `/chat/${id}?scope=group` : `/chat/${id}`,
    );
  }, []);

  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): UseAuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
