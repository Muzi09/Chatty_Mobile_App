// ============================================================================
// useMessages — paginated, real-time messages for a single chat or group.
// ----------------------------------------------------------------------------
// Loads the most recent N (MESSAGE_PAGE_SIZE) on mount, then subscribes
// to live updates. Older pages can be loaded explicitly with loadOlder().
// ============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { DocumentSnapshot } from 'firebase/firestore';
import { chatService } from '../services/chatService';
import { groupService } from '../services/groupService';
import { chatRepository } from '../repositories/chatRepository';
import { groupRepository } from '../repositories/groupRepository';
import { ChatMessage, Unsubscribe } from '../types';
import { MESSAGE_PAGE_SIZE } from '../constants/firebase';

export type ConversationScope = 'direct' | 'group';

export interface UseMessagesOptions {
  scope: ConversationScope;
  conversationId: string;
  pageSize?: number;
}

export interface UseMessagesResult {
  messages: ChatMessage[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  error: Error | null;
  loadOlder: () => Promise<void>;
  sendText: (text: string) => Promise<void>;
  sendMedia: (args: {
    asset: import('../utils/media').MediaAsset;
    onProgress?: (fraction: number) => void;
  }) => Promise<void>;
  deleteMessage: (id: string) => Promise<void>;
  editMessage: (id: string, newText: string) => Promise<void>;
  react: (id: string, emoji: string) => Promise<void>;
  markLatestRead: () => Promise<void>;
}

export function useMessages(opts: UseMessagesOptions): UseMessagesResult {
  const { scope, conversationId, pageSize = MESSAGE_PAGE_SIZE } = opts;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // The "older than this" cursor. We use it for next-page fetches.
  const cursorRef = useRef<DocumentSnapshot | null>(null);
  // Track live-subscription so we can dedupe additions.
  const liveUnsubRef = useRef<Unsubscribe | null>(null);

  // ----- Live subscription -----
  useEffect(() => {
    setLoading(true);
    setError(null);

    const onLive = (live: ChatMessage[]) => {
      setMessages((prev) => mergeMessages(prev, live));
      setLoading(false);
    };

    if (scope === 'direct') {
      liveUnsubRef.current = chatService.watchMessages(
        conversationId,
        onLive,
        (e) => setError(e as Error),
      );
    } else {
      liveUnsubRef.current = groupService.watchMessages(
        conversationId,
        onLive,
        (e) => setError(e as Error),
      );
    }

    // Initial page (older history).
    (async () => {
      try {
        const repo = scope === 'direct' ? chatRepository : groupRepository;
        const { messages: page, cursor } = await repo.listMessagesPage(
          conversationId,
          pageSize,
        );
        // Seed with the initial page; live subscription will fill in.
        setMessages((prev) => mergeMessages(prev, page));
        cursorRef.current = cursor;
        setHasMore(cursor != null);
        setLoading(false);
      } catch (e) {
        setError(e as Error);
        setLoading(false);
      }
    })();

    return () => {
      liveUnsubRef.current?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, conversationId, pageSize]);

  const loadOlder = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const repo = scope === 'direct' ? chatRepository : groupRepository;
      const { messages: page, cursor } = await repo.listMessagesPage(
        conversationId,
        pageSize,
        cursorRef.current ?? undefined,
      );
      setMessages((prev) => mergeMessages(prev, page));
      cursorRef.current = cursor;
      setHasMore(cursor != null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoadingMore(false);
    }
  }, [scope, conversationId, pageSize, hasMore, loadingMore]);

  const sendText = useCallback(
    async (text: string) => {
      if (scope === 'direct') {
        await chatService.sendTextMessage({ chatId: conversationId, text });
      } else {
        await groupService.sendTextMessage({ groupId: conversationId, text });
      }
    },
    [scope, conversationId],
  );

  const sendMedia = useCallback(
    async (args: {
      asset: import('../utils/media').MediaAsset;
      onProgress?: (fraction: number) => void;
    }) => {
      if (scope === 'direct') {
        await chatService.sendMediaMessage({
          chatId: conversationId,
          ...args,
        });
      } else {
        await groupService.sendMediaMessage({
          groupId: conversationId,
          ...args,
        });
      }
    },
    [scope, conversationId],
  );

  const deleteMessage = useCallback(
    async (id: string) => {
      if (scope === 'direct') {
        await chatService.deleteMessage(conversationId, id);
      } else {
        // groupService doesn't expose delete yet — use repository directly.
        // (Kept simple; you can lift it into the service later.)
        await import('../repositories/groupRepository').then((m) =>
          m.groupRepository.deleteMessage(conversationId, id).catch(() => {}),
        );
      }
    },
    [scope, conversationId],
  );

  const editMessage = useCallback(
    async (id: string, newText: string) => {
      if (scope === 'direct') {
        await chatService.editMessage(conversationId, id, newText);
      }
    },
    [scope, conversationId],
  );

  const react = useCallback(
    async (id: string, emoji: string) => {
      if (scope === 'direct') {
        await chatService.react(conversationId, id, emoji);
      }
    },
    [scope, conversationId],
  );

  const markLatestRead = useCallback(async () => {
    const last = messages[messages.length - 1];
    if (!last) return;
    try {
      if (scope === 'direct') {
        await chatService.markRead(conversationId, last.id);
      } else {
        await groupService.markRead(conversationId, last.id);
      }
    } catch {
      // Non-fatal: the inbox row is also a denormalized counter and will
      // be corrected on the next write.
    }
  }, [scope, conversationId, messages]);

  return {
    messages,
    loading,
    loadingMore,
    hasMore,
    error,
    loadOlder,
    sendText,
    sendMedia,
    deleteMessage,
    editMessage,
    react,
    markLatestRead,
  };
}

// ---------- helpers ----------

/**
 * Merge a live snapshot with a paginated batch. Live wins on conflict
 * (it has the freshest status / updatedAt).
 */
function mergeMessages(a: ChatMessage[], b: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const m of a) byId.set(m.id, m);
  for (const m of b) byId.set(m.id, m);
  return Array.from(byId.values()).sort(
    (x, y) => x.createdAt.getTime() - y.createdAt.getTime(),
  );
}
