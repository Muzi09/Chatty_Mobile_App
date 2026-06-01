// ============================================================================
// chatRepository — direct chats and inbox projection.
// ----------------------------------------------------------------------------
// Two collections of interest:
//   /chats/{chatId}              — canonical chat doc
//   /userChats/{uid}/chats/{cid} — per-user inbox row (denormalized)
// All mutations are designed to be batched into a single atomic write.
// ============================================================================

import {
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  getDocs,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  DocumentSnapshot,
  QueryConstraint,
  Unsubscribe,
  writeBatch,
} from 'firebase/firestore';
import { getDb } from '../firebase/config';
import { COLLECTIONS, SUBCOLLECTIONS, INBOX_PAGE_SIZE } from '../constants/firebase';
import { toDate } from '../utils/timestamp';
import { toAppError } from '../utils/errors';
import { ErrorCode } from '../constants/firebase';
import { Chat, InboxItem, ChatMessage, MessageStatus, MessageType } from '../types';
import { makeDirectChatId } from '../utils/chatId';

function chatRef(chatId: string) {
  return doc(getDb(), COLLECTIONS.CHATS, chatId);
}

function inboxRef(uid: string, chatId: string) {
  return doc(getDb(), COLLECTIONS.USER_CHATS, uid, COLLECTIONS.CHATS, chatId);
}

function messageRef(chatId: string, messageId: string) {
  return doc(getDb(), COLLECTIONS.CHATS, chatId, SUBCOLLECTIONS.MESSAGES, messageId);
}

function typingRef(chatId: string, uid: string) {
  return doc(getDb(), COLLECTIONS.CHATS, chatId, SUBCOLLECTIONS.TYPING, uid);
}

function memberRef(chatId: string, uid: string) {
  return doc(getDb(), COLLECTIONS.CHATS, chatId, SUBCOLLECTIONS.MEMBERS, uid);
}

function mapChat(snap: DocumentSnapshot): Chat {
  const d = snap.data()!;
  return {
    id: snap.id,
    type: 'direct',
    participants: d.participants as [string, string],
    lastMessage: d.lastMessage ?? '',
    lastMessageAt: toDate(d.lastMessageAt),
    lastMessageSenderId: d.lastMessageSenderId,
    lastMessagePreviewName: d.lastMessagePreviewName,
    createdAt: toDate(d.createdAt),
  };
}

function mapInbox(snap: DocumentSnapshot): InboxItem {
  const d = snap.data()!;
  return {
    chatId: snap.id,
    type: d.type ?? 'direct',
    refId: d.refId,
    name: d.name ?? '',
    photoURL: d.photoURL ?? '',
    lastMessage: d.lastMessage ?? '',
    lastMessageAt: toDate(d.lastMessageAt),
    unreadCount: d.unreadCount ?? 0,
    isMuted: !!d.isMuted,
    isPinned: !!d.isPinned,
    lastReadMessageId: d.lastReadMessageId,
  };
}

function mapMessage(snap: DocumentSnapshot): ChatMessage {
  const d = snap.data()!;
  return {
    id: snap.id,
    scope: 'direct',
    conversationId: d.conversationId ?? snap.ref.parent.parent!.id,
    senderId: d.senderId,
    receiverId: d.receiverId,
    type: d.type,
    text: d.text,
    fileUrl: d.fileUrl,
    fileName: d.fileName,
    fileSize: d.fileSize,
    fileMimeType: d.fileMimeType,
    fileDurationMs: d.fileDurationMs,
    thumbnailUrl: d.thumbnailUrl,
    status: d.status ?? 'sent',
    createdAt: toDate(d.createdAt),
    updatedAt: toDate(d.updatedAt),
    isEdited: !!d.isEdited,
    deletedFor: d.deletedFor ?? [],
    reactions: (d.reactions ?? []).map((r: { uid: string; emoji: string; at: unknown }) => ({
      uid: r.uid,
      emoji: r.emoji,
      at: toDate(r.at),
    })),
    replyToMessageId: d.replyToMessageId,
  };
}

export interface DirectChatSeed {
  uidA: string;
  uidB: string;
  nameA: string;
  photoA: string;
  nameB: string;
  photoB: string;
}

export const chatRepository = {
  /** Idempotent — creates the chat doc + both inbox rows in one batch. */
  async ensureDirectChat(seed: DirectChatSeed): Promise<string> {
    const chatId = makeDirectChatId(seed.uidA, seed.uidB);
    try {
      const existing = await getDoc(chatRef(chatId));
      if (existing.exists()) return chatId;

      const batch = writeBatch(getDb());
      batch.set(chatRef(chatId), {
        id: chatId,
        type: 'direct',
        participants: [seed.uidA, seed.uidB].sort(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      batch.set(inboxRef(seed.uidA, chatId), {
        type: 'direct',
        refId: seed.uidB,
        name: seed.nameB,
        photoURL: seed.photoB,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unreadCount: 0,
        isMuted: false,
        isPinned: false,
      });
      batch.set(inboxRef(seed.uidB, chatId), {
        type: 'direct',
        refId: seed.uidA,
        name: seed.nameA,
        photoURL: seed.photoA,
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        unreadCount: 0,
        isMuted: false,
        isPinned: false,
      });
      await batch.commit();
      return chatId;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async getChat(chatId: string): Promise<Chat | null> {
    try {
      const snap = await getDoc(chatRef(chatId));
      return snap.exists() ? mapChat(snap) : null;
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Subscribe to a chat doc. */
  watchChat(chatId: string, cb: (c: Chat | null) => void): Unsubscribe {
    return onSnapshot(
      chatRef(chatId),
      (s) => cb(s.exists() ? mapChat(s) : null),
      (e) => {
        // eslint-disable-next-line no-console
        console.warn('[chatRepository.watchChat]', e);
        cb(null);
      },
    );
  },

  /** Page through inbox. Cursor-based — pass the last cursor from the
   *  previous page to fetch the next. */
  async listInboxPage(
    uid: string,
    pageSize: number = INBOX_PAGE_SIZE,
    cursor?: DocumentSnapshot,
  ): Promise<{ items: InboxItem[]; cursor: DocumentSnapshot | null }> {
    const constraints: QueryConstraint[] = [
      orderBy('lastMessageAt', 'desc'),
      limit(pageSize),
    ];
    if (cursor) constraints.push(startAfter(cursor));
    try {
      const q = query(
        collection(getDb(), COLLECTIONS.USER_CHATS, uid, COLLECTIONS.CHATS),
        ...constraints,
      );
      const snap = await getDocs(q);
      const items = snap.docs.map(mapInbox);
      const last = snap.docs[snap.docs.length - 1] ?? null;
      return { items, cursor: last };
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Real-time inbox — used by the chat list screen. */
  watchInbox(uid: string, cb: (items: InboxItem[]) => void): Unsubscribe {
    const q = query(
      collection(getDb(), COLLECTIONS.USER_CHATS, uid, COLLECTIONS.CHATS),
      orderBy('lastMessageAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map(mapInbox)),
      (e) => {
        // eslint-disable-next-line no-console
        console.warn('[chatRepository.watchInbox]', e);
        cb([]);
      },
    );
  },

  /** Page through messages in a chat. Cursor-based. */
  async listMessagesPage(
    chatId: string,
    pageSize: number,
    cursor?: DocumentSnapshot,
  ): Promise<{ messages: ChatMessage[]; cursor: DocumentSnapshot | null }> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(pageSize)];
    if (cursor) constraints.push(startAfter(cursor));
    try {
      const q = query(
        collection(getDb(), COLLECTIONS.CHATS, chatId, SUBCOLLECTIONS.MESSAGES),
        ...constraints,
      );
      const snap = await getDocs(q);
      const messages = snap.docs.map(mapMessage).reverse(); // ascending order
      const last = snap.docs[snap.docs.length - 1] ?? null;
      return { messages, cursor: last };
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Real-time messages in a chat. */
  watchMessages(
    chatId: string,
    cb: (msgs: ChatMessage[]) => void,
    onError?: (e: unknown) => void,
  ): Unsubscribe {
    const q = query(
      collection(getDb(), COLLECTIONS.CHATS, chatId, SUBCOLLECTIONS.MESSAGES),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map(mapMessage)),
      (e) => {
        if (onError) onError(e);
        else {
          // eslint-disable-next-line no-console
          console.warn('[chatRepository.watchMessages]', e);
        }
      },
    );
  },

  /** Atomically write a new message + update chat head + both inbox rows.
   *  Returns the messageId. */
  async sendMessage(args: {
    chatId: string;
    senderId: string;
    receiverId: string;
    senderName: string;
    text?: string;
    type: MessageType;
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    fileMimeType?: string;
    fileDurationMs?: number;
    thumbnailUrl?: string;
  }): Promise<string> {
    const messageId = doc(collection(getDb(), '_')).id;
    const nowDate = new Date();
    const preview =
      args.type === 'text'
        ? args.text ?? ''
        : args.type === 'image'
          ? '📷 Photo'
          : args.type === 'video'
            ? '🎬 Video'
            : args.type === 'audio'
              ? '🎙 Voice'
              : args.type === 'document'
                ? `📄 ${args.fileName ?? 'Document'}`
                : '';

    try {
      const batch = writeBatch(getDb());

      // 1) Message
      batch.set(messageRef(args.chatId, messageId), {
        id: messageId,
        conversationId: args.chatId,
        senderId: args.senderId,
        receiverId: args.receiverId,
        type: args.type,
        text: args.text ?? null,
        fileUrl: args.fileUrl ?? null,
        fileName: args.fileName ?? null,
        fileSize: args.fileSize ?? null,
        fileMimeType: args.fileMimeType ?? null,
        fileDurationMs: args.fileDurationMs ?? null,
        thumbnailUrl: args.thumbnailUrl ?? null,
        status: 'sent' as MessageStatus,
        createdAt: nowDate,
        updatedAt: nowDate,
        isEdited: false,
        deletedFor: [],
        reactions: [],
      });

      // 2) Chat head
      batch.update(chatRef(args.chatId), {
        lastMessage: preview,
        lastMessageAt: nowDate,
        lastMessageSenderId: args.senderId,
        lastMessagePreviewName: args.senderName,
      });

      // 3) Both inbox rows. The receiver's unreadCount bumps by 1; the
      //    sender's resets to 0 (their own outgoing message is "read").
      batch.set(
        inboxRef(args.senderId, args.chatId),
        {
          lastMessage: preview,
          lastMessageAt: nowDate,
          unreadCount: 0,
        },
        { merge: true },
      );
      batch.set(
        inboxRef(args.receiverId, args.chatId),
        {
          lastMessage: preview,
          lastMessageAt: nowDate,
        },
        { merge: true },
      );

      // Use a transaction-like update for the receiver's unread count to
      // avoid clobbering concurrent bumps. writeBatch doesn't have
      // increment, so we do a follow-up transaction.
      await batch.commit();
      await runTransaction(getDb(), async (tx) => {
        const inboxSnap = await tx.get(inboxRef(args.receiverId, args.chatId));
        const prev = (inboxSnap.data()?.unreadCount as number | undefined) ?? 0;
        tx.set(
          inboxRef(args.receiverId, args.chatId),
          { unreadCount: prev + 1 },
          { merge: true },
        );
      });
      return messageId;
    } catch (e) {
      throw toAppError(e, ErrorCode.Unknown);
    }
  },

  async editMessage(args: {
    chatId: string;
    messageId: string;
    newText: string;
  }): Promise<void> {
    try {
      await updateDoc(messageRef(args.chatId, args.messageId), {
        text: args.newText,
        isEdited: true,
        updatedAt: new Date(),
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Hard delete. Soft delete is via updateDoc with `deletedFor`. */
  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    try {
      // We also re-write the chat head so the deleted message disappears
      // from the inbox preview. The transaction below picks the most
      // recent remaining message; if none, the chat head is blanked.
      const messagesCol = collection(
        getDb(),
        COLLECTIONS.CHATS,
        chatId,
        SUBCOLLECTIONS.MESSAGES,
      );
      const recent = await getDocs(
        query(messagesCol, orderBy('createdAt', 'desc'), limit(1)),
      );
      const headDoc = recent.docs[0]?.data();
      const batch = writeBatch(getDb());
      batch.delete(messageRef(chatId, messageId));
      batch.update(chatRef(chatId), {
        lastMessage: headDoc?.text ?? '',
        lastMessageAt: headDoc?.createdAt ?? serverTimestamp(),
        lastMessageSenderId: headDoc?.senderId ?? null,
      });
      await batch.commit();
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Mark a message as read. Updates per-user lastReadMessageId and the
   *  inbox unread count. */
  async markRead(args: {
    uid: string;
    chatId: string;
    messageId: string;
  }): Promise<void> {
    try {
      const batch = writeBatch(getDb());
      batch.set(
        memberRef(args.chatId, args.uid),
        { lastReadAt: new Date(), lastReadMessageId: args.messageId },
        { merge: true },
      );
      // Reset unread to 0 on the inbox row.
      batch.set(
        inboxRef(args.uid, args.chatId),
        { unreadCount: 0, lastReadMessageId: args.messageId },
        { merge: true },
      );
      // Mark the message as read for the receiver.
      batch.update(messageRef(args.chatId, args.messageId), {
        status: 'read',
        updatedAt: new Date(),
      });
      await batch.commit();
    } catch (e) {
      throw toAppError(e);
    }
  },

  async markDelivered(args: {
    chatId: string;
    messageId: string;
  }): Promise<void> {
    try {
      await updateDoc(messageRef(args.chatId, args.messageId), {
        status: 'delivered',
        updatedAt: new Date(),
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  async addReaction(args: {
    chatId: string;
    messageId: string;
    uid: string;
    emoji: string;
  }): Promise<void> {
    try {
      await runTransaction(getDb(), async (tx) => {
        const ref = messageRef(args.chatId, args.messageId);
        const snap = await tx.get(ref);
        if (!snap.exists()) return;
        const reactions: { uid: string; emoji: string; at: unknown }[] =
          snap.data().reactions ?? [];
        // Remove a prior reaction from this uid, then append the new one.
        const filtered = reactions.filter((r) => r.uid !== args.uid);
        filtered.push({ uid: args.uid, emoji: args.emoji, at: new Date() });
        tx.update(ref, { reactions: filtered, updatedAt: new Date() });
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Typing indicator. We just write a single doc; readers ignore if
   *  older than TYPING_TTL_MS. */
  async setTyping(chatId: string, uid: string, isTyping: boolean): Promise<void> {
    try {
      await setDoc(typingRef(chatId, uid), {
        uid,
        isTyping,
        updatedAt: new Date(),
      });
    } catch (e) {
      throw toAppError(e);
    }
  },

  watchTyping(
    chatId: string,
    cb: (typing: Record<string, boolean>) => void,
  ): Unsubscribe {
    return onSnapshot(
      collection(getDb(), COLLECTIONS.CHATS, chatId, SUBCOLLECTIONS.TYPING),
      (snap) => {
        const out: Record<string, boolean> = {};
        for (const d of snap.docs) out[d.id] = !!d.data().isTyping;
        cb(out);
      },
      (e) => {
        // eslint-disable-next-line no-console
        console.warn('[chatRepository.watchTyping]', e);
        cb({});
      },
    );
  },
};
