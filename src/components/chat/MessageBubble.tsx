import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../constants/colors';
import { spacing, borderRadius, fontSizes } from '../../constants/theme';

interface MessageBubbleProps {
  text: string;
  isFromMe: boolean;
  timestamp: Date;
  status?: 'sent' | 'delivered' | 'read';
}

export function MessageBubble({ text, isFromMe, timestamp, status }: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <View style={[styles.container, isFromMe ? styles.myMessage : styles.theirMessage]}>
      <View
        style={[
          styles.bubble,
          isFromMe ? styles.myBubble : styles.theirBubble,
        ]}
      >
        <Text style={[styles.text, isFromMe ? styles.myText : styles.theirText]}>
          {text}
        </Text>
      </View>
      <View style={[styles.metaContainer, isFromMe ? styles.myMeta : styles.theirMeta]}>
        <Text style={styles.time}>{formatTime(timestamp)}</Text>
        {isFromMe && status && (
          <Text style={[styles.status, { color: status === 'read' ? colors.primary : colors.textSecondary }]}>
            {status === 'delivered' ? 'Delivered' : status}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  myMessage: {
    alignItems: 'flex-end',
  },
  theirMessage: {
    alignItems: 'flex-start',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  myBubble: {
    backgroundColor: colors.sentBubble,
    borderRadius: borderRadius.xl,
    borderBottomRightRadius: spacing.xs,
  },
  theirBubble: {
    backgroundColor: colors.receivedBubble,
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: spacing.xs,
  },
  text: {
    fontSize: fontSizes.body,
    lineHeight: 22,
  },
  myText: {
    color: colors.white,
  },
  theirText: {
    color: colors.text,
  },
  metaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  myMeta: {
    justifyContent: 'flex-end',
  },
  theirMeta: {
    justifyContent: 'flex-start',
  },
  time: {
    fontSize: fontSizes.caption,
    color: colors.textSecondary,
  },
  status: {
    fontSize: fontSizes.caption,
  },
});