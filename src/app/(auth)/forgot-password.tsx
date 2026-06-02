import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { AuthForm, AuthField } from '../../components/auth/AuthForm';
import { colors } from '../../constants/colors';
import { fontSizes } from '../../constants/theme';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { forgotPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async () => {
    setError(null);
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setLoading(true);
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthForm
      title="Reset password"
      subtitle={
        sent
          ? 'Check your inbox for a reset link.'
          : 'Enter the email on your account and we will send a reset link.'
      }
      submitLabel={sent ? 'Resend' : 'Send reset link'}
      loading={loading}
      onSubmit={onSubmit}
      error={sent ? null : error}
      footer={
        <TouchableOpacity onPress={() => router.replace('/login')}>
          <Text style={styles.link}>Back to sign in</Text>
        </TouchableOpacity>
      }
    >
      {!sent && (
        <AuthField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoComplete="email"
          textContentType="emailAddress"
        />
      )}
    </AuthForm>
  );
}

const styles = StyleSheet.create({
  link: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: fontSizes.footnote,
  },
});
