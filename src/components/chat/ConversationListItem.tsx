import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { InboxItem } from '../../types';
import { Avatar } from '../common/Avatar';
import { colors } from '../../constants/colors';
import { spacing, fontSizes, borderRadius } from '../../constants/theme';

interface ConversationListItemProps {
  /**
   * The row to render. Either an InboxItem (from useInbox) or a
   * Conversation (legacy). New code should pass InboxItem.
   */
  item: InboxItem;
  onPress?: (item: InboxItem) => void;
}

export function ConversationListItem({ item, onPress }: ConversationListItemProps) {
  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const initials = (item.name || '?')
    .split(/\s+/)
    .map((s) => s.charAt(0))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress ? () => onPress(item) : undefined}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      <Avatar uri={item.photoURL} initials={initials} name={item.name} size="medium" />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {item.name || 'Unknown'}
          </Text>
          <Text style={styles.time}>{formatTime(item.lastMessageAt)}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.message} numberOfLines={1}>
            {item.lastMessage || 'No messages yet'}
          </Text>
          {item.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{item.unreadCount}</Text>
            </View>
          )}
        </View>
      </View>
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
  content: {
    flex: 1,
    marginLeft: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  name: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: spacing.sm,
  },
  time: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  message: {
    flex: 1,
    fontSize: fontSizes.subhead,
    color: colors.textSecondary,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    backgroundColor: colors.unread,
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  unreadText: {
    fontSize: fontSizes.caption,
    fontWeight: '600',
    color: colors.white,
  },
});
