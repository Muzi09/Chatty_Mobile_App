import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { SettingsItem as SettingsItemType } from '../../types';
import { colors } from '../../constants/colors';
import { spacing, fontSizes } from '../../constants/theme';

interface SettingsItemProps {
  item: SettingsItemType;
  onPress?: (item: SettingsItemType) => void;
}

export function SettingsItem({ item, onPress }: SettingsItemProps) {
  const textStyle = item.type === 'danger' ? styles.dangerText : styles.text;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress?.(item)}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.iconColor }]}>
        <Text style={styles.iconText}>{item.icon}</Text>
      </View>
      <View style={styles.content}>
        <Text style={textStyle}>{item.title}</Text>
      </View>
      {item.type === 'navigation' && <Text style={styles.chevron}>›</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconText: {
    fontSize: 14,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  text: {
    fontSize: fontSizes.body,
    color: colors.text,
  },
  dangerText: {
    fontSize: fontSizes.body,
    color: colors.danger,
  },
  chevron: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
});