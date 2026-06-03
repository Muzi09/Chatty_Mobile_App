import { usePathname, useRouter } from 'expo-router';
import React, { ReactNode, useEffect, useRef } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { colors } from '../../constants/colors';
import { useAuth } from '../../contexts/AuthContext';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, needsProfileCompletion } = useAuth();

  // DEBUG: render counter
  const renderCount = useRef(0);
  renderCount.current += 1;
  // eslint-disable-next-line no-console
  console.log(`[DEBUG] AuthGate render #${renderCount.current}, loading=${loading}, user=${user?.uid ?? 'null'}, pathname=${pathname}`);

  // Hold the latest router/pathname in refs so the redirect effect can
  // depend only on auth-derived primitives. This prevents the effect
  // from re-firing on every render when the router object identity is
  // unstable (which would cause a redirect loop and "Maximum update
  // depth exceeded" as `router.replace` schedules another render).
  const routerRef = useRef(router);
  routerRef.current = router;
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log(`[DEBUG] AuthGate effect fired: loading=${loading}, user=${user?.uid ?? 'null'}, needsProfileCompletion=${needsProfileCompletion}, pathname=${pathnameRef.current}`);
    if (loading) return;

    const current = pathnameRef.current;
    if (!user && current !== '/login' && current !== '/signup' && current !== '/forgot-password') {
      // eslint-disable-next-line no-console
      console.log(`[DEBUG] AuthGate redirecting to /login from ${current}`);
      routerRef.current.replace('/login');
      return;
    }

    if (user && needsProfileCompletion && current !== '/complete-profile') {
      routerRef.current.replace('/complete-profile');
      return;
    }

    if (user && !needsProfileCompletion && current !== '/messages') {
      routerRef.current.replace('/messages');
    }
    // Intentionally depend only on auth-derived primitives. `router` and
    // `pathname` are read via refs above so an unstable router reference
    // can't retrigger this effect.
  }, [loading, user, needsProfileCompletion]);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
  },
});
