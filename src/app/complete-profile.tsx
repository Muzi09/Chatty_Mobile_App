import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { AuthForm, AuthField } from '../components/auth/AuthForm';
import { validateUsername, normalizeUsername } from '../utils/username';
import { colors } from '../constants/colors';
import { spacing, fontSizes } from '../constants/theme';

export default function CompleteProfileScreen() {
  const router = useRouter();
  const { user, profile, completeProfile, signOut } = useAuth();

  const [firstName, setFirstName] = useState(profile?.firstName ?? '');
  const [lastName, setLastName] = useState(profile?.lastName ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fieldErrors = useMemo(() => {
    const errs: { firstName?: string; lastName?: string; username?: string } = {};
    if (firstName.trim().length === 0) errs.firstName = 'Required';
    if (lastName.trim().length === 0) errs.lastName = 'Required';
    const uErr = validateUsername(username.trim());
    if (uErr === 'empty') errs.username = 'Required';
    else if (uErr === 'too-short') errs.username = 'At least 3 characters';
    else if (uErr === 'too-long') errs.username = 'At most 20 characters';
    else if (uErr === 'invalid-characters')
      errs.username = 'Letters, numbers, and underscores only';
    return errs;
  }, [firstName, lastName, username]);

  const canSubmit =
    !loading && !fieldErrors.firstName && !fieldErrors.lastName && !fieldErrors.username;

  const onSubmit = async () => {
    setError(null);
    if (!canSubmit) return;
    setLoading(true);
    try {
      await completeProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: normalizeUsername(username.trim()),
      });
      // AuthGate will now route to /messages because username is set.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <AuthForm
        title="Set up your profile"
        subtitle="Tell other people who's messaging them."
        submitLabel="Continue"
        loading={loading}
        disabled={!canSubmit}
        onSubmit={onSubmit}
        error={error}
        footer={
          <TouchableOpacity
            onPress={async () => {
              try {
                await signOut();
              } catch {
                // ignore — AuthGate will pick up the user=null state
              }
              router.replace('/login');
            }}
          >
            <Text style={styles.muted}>
              Signed in as {user?.email}? <Text style={styles.link}>Sign out</Text>
            </Text>
          </TouchableOpacity>
        }
      >
        <AuthField
          label="First name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="John"
          autoCapitalize="words"
          autoComplete="given-name"
          textContentType="givenName"
          error={fieldErrors.firstName}
        />
        <AuthField
          label="Last name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Doe"
          autoCapitalize="words"
          autoComplete="family-name"
          textContentType="familyName"
          error={fieldErrors.lastName}
        />
        <AuthField
          label="Username"
          value={username}
          onChangeText={(s) => setUsername(s.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
          placeholder="john_doe"
          autoCapitalize="none"
          autoComplete="username"
          textContentType="username"
          error={fieldErrors.username}
        />
      </AuthForm>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  muted: {
    color: colors.textSecondary,
    fontSize: fontSizes.footnote,
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
});
