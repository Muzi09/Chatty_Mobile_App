import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { AuthForm, AuthField } from '../../components/auth/AuthForm';
import { colors } from '../../constants/colors';
import { spacing, fontSizes } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      await signIn({ email: email.trim(), password });
      // AuthGate handles the redirect once `user` and `profile` resolve.
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Welcome back"
      subtitle="Sign in to continue"
      submitLabel="Sign in"
      loading={loading}
      onSubmit={onSubmit}
      error={error}
      footer={
        <View>
          <TouchableOpacity onPress={() => router.push('/forgot-password')}>
            <Text style={styles.linkMuted}>Forgot password?</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/signup')}
            style={styles.altLink}
          >
            <Text style={styles.altText}>
              New here? <Text style={styles.link}>Create an account</Text>
            </Text>
          </TouchableOpacity>
        </View>
      }
    >
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
        placeholder="••••••••"
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
  linkMuted: {
    color: colors.primary,
    fontSize: fontSizes.footnote,
  },
  altLink: {
    marginTop: spacing.lg,
  },
  altText: {
    color: colors.textSecondary,
    fontSize: fontSizes.footnote,
  },
});
