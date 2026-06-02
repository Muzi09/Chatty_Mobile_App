// ============================================================================
// AuthGate — top-level routing based on auth + profile state.
// ----------------------------------------------------------------------------
// Wraps <Slot /> in the root layout. Reads `useAuth()` and routes:
//   - loading                → spinner (children stay mounted but the
//                              slot is empty, so child screens can't
//                              fire effects that need auth)
//   - signed out             → /login
//   - signed in, no username → /complete-profile
//   - signed in, complete    → /messages
//
// We render <Redirect> rather than the children while we're still
// deciding. Children render only on the success path.
// ============================================================================

import React, { ReactNode } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../constants/colors';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const { user, profile, loading, needsProfileCompletion } = useAuth();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  if (needsProfileCompletion) {
    return <Redirect href="/complete-profile" />;
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
