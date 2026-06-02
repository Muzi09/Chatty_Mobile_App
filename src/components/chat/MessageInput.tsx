import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, borderRadius, fontSizes } from '../../constants/theme';

interface MessageInputProps {
  onSend?: (text: string) => void;
  onChangeText?: (text: string) => void;
  placeholder?: string;
}

export function MessageInput({ onSend, onChangeText, placeholder = 'iMessage' }: MessageInputProps) {
  const [text, setText] = useState('');

  const handleChange = (s: string) => {
    setText(s);
    onChangeText?.(s);
  };

  const handleSend = () => {
    if (text.trim()) {
      onSend?.(text.trim());
      setText('');
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.attachButton}>
        <View style={styles.plusIcon} />
        <View style={styles.plusIconVertical} />
      </TouchableOpacity>
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={text}
          onChangeText={handleChange}
          placeholder={placeholder}
          placeholderTextColor={colors.textTertiary}
          multiline
        />
      </View>
      {text.trim() ? (
        <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
          <View style={styles.sendIcon} />
          <View style={styles.sendArrow} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.micButton}>
          <View style={styles.micIcon} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  attachButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plusIcon: {
    position: 'absolute',
    width: 16,
    height: 2,
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
  },
  plusIconVertical: {
    position: 'absolute',
    width: 2,
    height: 16,
    backgroundColor: colors.textSecondary,
    borderRadius: 1,
  },
  inputContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    marginHorizontal: spacing.sm,
    minHeight: 36,
    maxHeight: 100,
  },
  input: {
    fontSize: fontSizes.body,
    color: colors.text,
    padding: 0,
    margin: 0,
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendIcon: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'transparent',
  },
  sendArrow: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderBottomWidth: 4,
    borderTopWidth: 4,
    borderLeftColor: colors.white,
    borderBottomColor: 'transparent',
    borderTopColor: 'transparent',
  },
  micButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  micIcon: {
    width: 10,
    height: 16,
    backgroundColor: colors.textSecondary,
    borderRadius: 5,
  },
});