import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Conversation, Message } from '../../../types';
import { messagesApi } from '../../../services/api';
import { Avatar } from '../../../components/common/Avatar';
import { MessageBubble } from '../../../components/chat/MessageBubble';
import { TypingIndicator } from '../../../components/chat/TypingIndicator';
import { MessageInput } from '../../../components/chat/MessageInput';
import { colors } from '../../../constants/colors';
import { spacing, fontSizes } from '../../../constants/theme';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (id) {
      messagesApi.getConversation(id).then((conv) => {
        if (conv) {
          setConversation(conv);
          setIsTyping(conv.unreadCount > 0);
        }
      });
    }
  }, [id]);

  const handleSend = async (text: string) => {
    if (id) {
      await messagesApi.sendMessage(id, text);
    }
  };

  const formatDate = (date: Date) => {
    return `TODAY ${date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
  };

  if (!conversation) {
    return (
      <View style={styles.loading}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.profileContainer}>
          <Avatar
            uri={conversation.participant.avatar}
            initials={conversation.participant.initials}
            name={conversation.participant.name}
            size="small"
          />
          <Text style={styles.profileName}>{conversation.participant.name}</Text>
        </View>
      </View>

      <ScrollView style={styles.messagesContainer} contentContainerStyle={styles.messagesContent}>
        <View style={styles.dateHeader}>
          <Text style={styles.dateText}>
            {formatDate(conversation.lastMessageTime)}
          </Text>
        </View>
        {conversation.messages.map((message: Message) => (
          <MessageBubble
            key={message.id}
            text={message.text}
            isFromMe={message.isFromMe}
            timestamp={message.timestamp}
            status={message.status}
          />
        ))}
        {isTyping && <TypingIndicator />}
      </ScrollView>

      <MessageInput onSend={handleSend} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backButton: {
    flex: 1,
  },
  backText: {
    fontSize: fontSizes.body,
    color: colors.primary,
  },
  profileContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.sm,
  },
  videoButton: {
    flex: 1,
    alignItems: 'flex-end',
  },
  videoIcon: {
    fontSize: 24,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    paddingVertical: spacing.md,
  },
  dateHeader: {
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  dateText: {
    fontSize: fontSizes.footnote,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});