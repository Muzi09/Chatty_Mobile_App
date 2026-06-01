import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Contact } from '../../types';
import { Avatar } from '../common/Avatar';
import { colors } from '../../constants/colors';
import { spacing, fontSizes } from '../../constants/theme';

interface ContactListItemProps {
  contact: Contact;
  onPress?: (contact: Contact) => void;
  showLetterHeader?: boolean;
}

export function ContactListItem({ contact, onPress, showLetterHeader }: ContactListItemProps) {
  const getLetterHeader = () => {
    return contact.name.charAt(0).toUpperCase();
  };

  const handlePress = () => {
    onPress?.(contact);
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {showLetterHeader && (
        <View style={styles.letterHeader}>
          <Text style={styles.letterText}>{getLetterHeader()}</Text>
        </View>
      )}
      <Avatar
        uri={contact.avatar}
        initials={contact.initials}
        name={contact.name}
        size="medium"
      />
      <View style={styles.content}>
        <Text style={styles.name} numberOfLines={1}>
          {contact.name}
        </Text>
      </View>
      <Text style={styles.chevron}>›</Text>
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
  letterHeader: {
    width: 28,
    marginRight: spacing.md,
  },
  letterText: {
    fontSize: fontSizes.footnote,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  name: {
    fontSize: fontSizes.body,
    fontWeight: '400',
    color: colors.text,
  },
  chevron: {
    fontSize: 24,
    color: colors.textTertiary,
    marginLeft: spacing.sm,
  },
});