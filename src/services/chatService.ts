// ============================================================================
// chatService — direct-message use cases.
// ----------------------------------------------------------------------------
// The chat service is "thin on logic, thick on orchestration": the
// repositories already enforce the data shape, and this layer stitches
// them into flows like "upload media then send a message".
// ============================================================================

import { authService } from './authService';
import { userService } from './userService';
import { chatRepository } from '../repositories/chatRepository';
import { storageRepository } from '../repositories/storageRepository';
import { buildMediaPath, MediaAsset, classifyMedia } from '../utils/media';
import { debounce } from '../utils/debounce';
import { ChatMessage, InboxItem, MessageType, Unsubscribe } from '../types';
import { TYPING_TTL_MS } from '../constants/firebase';

export const chatService = {
  /** Open or create a direct chat. Returns the chatId. */
  async openDirectChat(otherUid: string): Promise<string> {
    const me = authService.requireUid();
    const [meProf, otherProf] = await Promise.all([
      userService.get(me),
      userService.get(otherUid),
    ]);
    if (!meProf) throw new Error('Your profile is missing');
    if (!otherProf) throw new Error('User not found');
    return chatRepository.ensureDirectChat({
      uidA: me,
      uidB: otherUid,
      nameA: meProf.name,
      photoA: meProf.photoURL,
      nameB: otherProf.name,
      photoB: otherProf.photoURL,
    });
  },

  async sendTextMessage(args: { chatId: string; text: string }): Promise<string> {
    const me = authService.requireUid();
    const chat = await chatRepository.getChat(args.chatId);
    if (!chat) throw new Error('Chat not found');
    const receiverId = chat.participants.find((p) => p !== me);
    if (!receiverId) throw new Error('Invalid chat participants');
    const meProf = await userService.get(me);
    return chatRepository.sendMessage({
      chatId: args.chatId,
      senderId: me,
      receiverId,
      senderName: meProf?.name ?? '',
      type: 'text',
      text: args.text,
    });
  },

  /**
   * Upload media, then send a message that references the storage URL.
   * We use the messageId in the storage path so the Cloud Function
   * that cleans up deleted messages can find its object.
   */
  async sendMediaMessage(args: {
    chatId: string;
    asset: MediaAsset;
    onProgress?: (fraction: number) => void;
  }): Promise<string> {
    const me = authService.requireUid();
    const chat = await chatRepository.getChat(args.chatId);
    if (!chat) throw new Error('Chat not found');
    const receiverId = chat.participants.find((p) => p !== me);
    if (!receiverId) throw new Error('Invalid chat participants');
    const meProf = await userService.get(me);
    if (!meProf) throw new Error('Profile missing');

    const type: MessageType = classifyMedia(args.asset);

    // 1) Reserve the messageId so we can build the storage path.
    //    We use a deterministic id derived from a doc() call.
    const messageId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    // 2) Upload. (We have to actually do a fetch on the URI to get a
    //    Blob — RN's fetch supports file:// URIs.)
    const blob = await fetchAsBlob(args.asset.uri, args.asset.mimeType ?? undefined);

    const path = buildMediaPath({
      scope: 'direct',
      conversationId: args.chatId,
      messageId,
      fileName: args.asset.fileName ?? guessExt(args.asset.uri, type),
    });

    const fileUrl = await storageRepository.upload({
      path,
      data: blob,
      contentType: args.asset.mimeType ?? undefined,
      onProgress: args.onProgress
        ? (p) => args.onProgress?.(p.fraction)
        : undefined,
    });

    // 3) Write the message with the URL.
    return chatRepository.sendMessage({
      chatId: args.chatId,
      senderId: me,
      receiverId,
      senderName: meProf.name,
      type,
      fileUrl,
      fileName: args.asset.fileName ?? guessExt(args.asset.uri, type),
      fileSize: blob.size,
      fileMimeType: args.asset.mimeType ?? undefined,
      fileDurationMs: args.asset.durationMs ?? undefined,
    });
  },

  async editMessage(chatId: string, messageId: string, newText: string): Promise<void> {
    return chatRepository.editMessage({ chatId, messageId, newText });
  },

  async deleteMessage(chatId: string, messageId: string): Promise<void> {
    return chatRepository.deleteMessage(chatId, messageId);
  },

  async react(chatId: string, messageId: string, emoji: string): Promise<void> {
    const me = authService.requireUid();
    return chatRepository.addReaction({ chatId, messageId, uid: me, emoji });
  },

  async markRead(chatId: string, messageId: string): Promise<void> {
    const me = authService.requireUid();
    return chatRepository.markRead({ uid: me, chatId, messageId });
  },

  watchInbox(cb: (items: InboxItem[]) => void): Unsubscribe {
    const me = authService.requireUid();
    return chatRepository.watchInbox(me, cb);
  },

  watchMessages(
    chatId: string,
    cb: (msgs: ChatMessage[]) => void,
    onError?: (e: unknown) => void,
  ): Unsubscribe {
    return chatRepository.watchMessages(chatId, cb, onError);
  },

  // ---------- Typing indicator ----------
  //
  // Debounced on the client so we don't write to Firestore on every
  // keystroke. The first keystroke writes `isTyping: true`; the debounce
  // writes `isTyping: false` 1.5s after typing stops (or on flush).

  createTypingEmitter(chatId: string) {
    const me = authService.requireUid();
    const debouncedStop = debounce(() => {
      chatRepository.setTyping(chatId, me, false).catch(() => {});
    }, TYPING_TTL_MS / 2);

    return {
      onKeystroke() {
        chatRepository.setTyping(chatId, me, true).catch(() => {});
        debouncedStop();
      },
      onSend() {
        debouncedStop.flush();
      },
      cancel() {
        debouncedStop.cancel();
      },
    };
  },

  watchTyping(chatId: string, cb: (typing: Record<string, boolean>) => void): Unsubscribe {
    return chatRepository.watchTyping(chatId, cb);
  },
};

// ---------- helpers ----------

async function fetchAsBlob(uri: string, contentType?: string): Promise<Blob> {
  // RN's fetch supports file://, ph://, content://, http(s):// URIs.
  const res = await fetch(uri);
  const blob = await res.blob();
  // Re-wrap with the correct MIME if the platform lost it (Android
  // sometimes returns application/octet-stream from content:// URIs).
  if (contentType && blob.type !== contentType) {
    return new Blob([blob], { type: contentType });
  }
  return blob;
}

function guessExt(uri: string, type: MessageType): string {
  const fromUri = uri.split('.').pop()?.toLowerCase();
  if (fromUri && fromUri.length <= 5) return `file.${fromUri}`;
  switch (type) {
    case 'image':
      return 'image.jpg';
    case 'video':
      return 'video.mp4';
    case 'audio':
      return 'audio.m4a';
    case 'document':
      return 'file.pdf';
    default:
      return 'file';
  }
}
