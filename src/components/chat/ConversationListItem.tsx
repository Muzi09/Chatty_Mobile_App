import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Conversation } from '../../types';
import { Avatar } from '../common/Avatar';
import { colors } from '../../constants/colors';
import { spacing, fontSizes, borderRadius } from '../../constants/theme';

interface ConversationListItemProps {
  conversation: Conversation;
  onPress: (conversation: Conversation) => void;
}

export function ConversationListItem({ conversation, onPress }: ConversationListItemProps) {
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

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => onPress(conversation)}
      activeOpacity={0.7}
    >
      <Avatar
        uri={conversation.participant.avatar}
        initials={conversation.participant.initials}
        name={conversation.participant.name}
        size="medium"
      />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name} numberOfLines={1}>
            {conversation.participant.name}
          </Text>
          <Text style={styles.time}>{formatTime(conversation.lastMessageTime)}</Text>
        </View>
        <View style={styles.messageRow}>
          <Text style={styles.message} numberOfLines={1}>
            {conversation.lastMessage}
          </Text>
          {conversation.unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>{conversation.unreadCount}</Text>
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