import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { AuthForm, AuthField } from '../../components/auth/AuthForm';
import { colors } from '../../constants/colors';
import { spacing, fontSizes } from '../../constants/theme';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Display name is required');
      return;
    }
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signUp({ email: email.trim(), password, name: name.trim() });
      // AuthGate sees the new user without a username and routes
      // to /complete-profile.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign up failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Create your account"
      subtitle="Pick a name — you can change it later."
      submitLabel="Create account"
      loading={loading}
      onSubmit={onSubmit}
      error={error}
      footer={
        <TouchableOpacity onPress={() => router.push('/login')}>
          <Text style={styles.altText}>
            Already have an account? <Text style={styles.link}>Sign in</Text>
          </Text>
        </TouchableOpacity>
      }
    >
      <AuthField
        label="Display name"
        value={name}
        onChangeText={setName}
        placeholder="e.g. John Doe"
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
      />
      <AuthField
        label="Email"
        value={email}
        onChangeText={setEmail}
        placeholder="you@example.com"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
      />
      <AuthField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="At least 8 characters"
        secureTextEntry
        autoComplete="password"
        textContentType="password"
      />
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.primary,
    fontWeight: '600',
  },
  altText: {
    color: colors.textSecondary,
    fontSize: fontSizes.footnote,
  },
});
