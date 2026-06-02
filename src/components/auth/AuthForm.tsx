// ============================================================================
// AuthForm — shared scaffold for login / signup / forgot-password screens.
// ----------------------------------------------------------------------------
// Provides a vertical form layout with consistent spacing, a primary
// submit button with loading state, and an inline error display.
// Per-field <TextInput> elements are passed in as children so each
// screen can compose its own fields.
// ============================================================================

import React, { ReactNode } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, fontSizes, borderRadius } from '../../constants/theme';

interface AuthFormProps {
  title: string;
  subtitle?: string;
  submitLabel: string;
  loading?: boolean;
  disabled?: boolean;
  error?: string | null;
  onSubmit: () => void;
  footer?: ReactNode;
  children: ReactNode;
}

export function AuthForm({
  title,
  subtitle,
  submitLabel,
  loading,
  disabled,
  error,
  onSubmit,
  footer,
  children,
}: AuthFormProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>

      <View style={styles.fields}>{children}</View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, (loading || disabled) && styles.buttonDisabled]}
        onPress={onSubmit}
        disabled={loading || disabled}
        activeOpacity={0.8}
      >
        {loading ? (
          <ActivityIndicator color={colors.white} />
        ) : (
          <Text style={styles.buttonText}>{submitLabel}</Text>
        )}
      </TouchableOpacity>

      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

interface AuthFieldProps {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  keyboardType?: 'default' | 'email-address';
  // Accept the full RN autoComplete / textContentType unions.
  autoComplete?: import('react-native').TextInputProps['autoComplete'];
  textContentType?: import('react-native').TextInputProps['textContentType'];
  editable?: boolean;
  error?: string | null;
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoComplete,
  textContentType,
  editable = true,
  error,
}: AuthFieldProps) {
  return (
    <View style={fieldStyles.field}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, error ? fieldStyles.inputError : null, !editable && fieldStyles.inputDisabled]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        secureTextEntry={secureTextEntry}
        autoCapitalize={autoCapitalize}
        keyboardType={keyboardType}
        autoComplete={autoComplete}
        textContentType={textContentType}
        editable={editable}
      />
      {error ? <Text style={fieldStyles.fieldError}>{error}</Text> : null}
    </View>
  );
}

// Local import to keep the AuthField declaration tidy.
import { TextInput } from 'react-native';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl,
    backgroundColor: colors.white,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: fontSizes.largeTitle,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    marginTop: spacing.sm,
    fontSize: fontSizes.body,
    color: colors.textSecondary,
  },
  fields: {
    marginBottom: spacing.md,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.footnote,
    marginBottom: spacing.md,
  },
  button: {
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: colors.white,
    fontSize: fontSizes.headline,
    fontWeight: '600',
  },
  footer: {
    marginTop: spacing.lg,
    alignItems: 'center',
  },
});

const fieldStyles = StyleSheet.create({
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  input: {
    fontSize: fontSizes.body,
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  inputError: {
    borderWidth: 1,
    borderColor: colors.danger,
  },
  inputDisabled: {
    opacity: 0.5,
  },
  fieldError: {
    color: colors.danger,
    fontSize: fontSizes.caption,
    marginTop: spacing.xs,
  },
});
