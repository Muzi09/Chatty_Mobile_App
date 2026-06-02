import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { useMessages } from '../../../hooks/useMessages';
import { useChatMeta } from '../../../hooks/useChatMeta';
import { useTyping } from '../../../hooks/useTyping';
import { userService } from '../../../services/userService';
import { Avatar } from '../../../components/common/Avatar';
import { MessageBubble } from '../../../components/chat/MessageBubble';
import { MessageInput } from '../../../components/chat/MessageInput';
import { TypingIndicator } from '../../../components/chat/TypingIndicator';
import { ChatMessage, UserProfile } from '../../../types';
import { colors } from '../../../constants/colors';
import { spacing, fontSizes } from '../../../constants/theme';

export default function ChatScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const router = useRouter();
  const { user } = useAuth();
  const me = user?.uid ?? '';

  // Route params can be string | string[] | undefined; normalize.
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  const { messages, loading, sendText, markLatestRead } = useMessages({
    scope: 'direct',
    conversationId: id ?? '',
  });
  const { chat } = useChatMeta('direct', id ?? '');
  const { isOtherTyping, emitter } = useTyping({
    scope: 'direct',
    conversationId: id ?? '',
  });

  const [otherUser, setOtherUser] = useState<UserProfile | null>(null);

  // Look up the other participant's profile for the header.
  useEffect(() => {
    if (!chat || !me) return;
    const otherUid = chat.participants.find((p) => p !== me);
    if (!otherUid) return;
    let cancelled = false;
    userService
      .get(otherUid)
      .then((p) => {
        if (!cancelled) setOtherUser(p);
      })
      .catch(() => {
        if (!cancelled) setOtherUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [chat, me]);

  // Mark latest message as read whenever messages change.
  useEffect(() => {
    if (messages.length > 0) {
      markLatestRead().catch(() => {});
    }
  }, [messages, markLatestRead]);

  // Tear down the typing emitter on unmount.
  useEffect(() => emitter.cancel, [emitter]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!id) return;
      try {
        await sendText(text);
        emitter.onSend();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[chat] sendText failed', e);
      }
    },
    [id, sendText, emitter],
  );

  const handleChangeText = useCallback(
    (s: string) => {
      if (s.length > 0) emitter.onKeystroke();
    },
    [emitter],
  );

  if (!id) {
    return (
      <View style={styles.center}>
        <Text>Missing chat id</Text>
      </View>
    );
  }

  const headerName =
    otherUser?.name || (otherUser?.username ? `@${otherUser.username}` : 'Chat');
  const headerAvatarUri = otherUser?.photoURL;
  const headerInitials =
    (otherUser?.firstName?.charAt(0) ?? '') + (otherUser?.lastName?.charAt(0) ?? '');

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>‹ Back</Text>
        </TouchableOpacity>
        <View style={styles.profileContainer}>
          <Avatar
            uri={headerAvatarUri}
            initials={headerInitials || headerName.charAt(0).toUpperCase()}
            name={headerName}
            size="small"
          />
          <Text style={styles.profileName} numberOfLines={1}>
            {headerName}
          </Text>
        </View>
      </View>

      {loading && messages.length === 0 ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messagesContent}
          renderItem={({ item }: { item: ChatMessage }) => (
            <MessageBubble
              text={item.text ?? (item.type !== 'text' ? `[${item.type}]` : '')}
              isFromMe={item.senderId === me}
              timestamp={item.createdAt}
              status={
                item.status === 'read'
                  ? 'read'
                  : item.status === 'delivered'
                    ? 'delivered'
                    : 'sent'
              }
            />
          )}
          ListFooterComponent={isOtherTyping ? <TypingIndicator /> : null}
        />
      )}

      <MessageInput onSend={handleSend} onChangeText={handleChangeText} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  center: {
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
    marginRight: spacing.md,
  },
  backText: {
    fontSize: fontSizes.body,
    color: colors.primary,
  },
  profileContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileName: {
    fontSize: fontSizes.body,
    fontWeight: '600',
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  messagesContent: {
    paddingVertical: spacing.md,
  },
});
