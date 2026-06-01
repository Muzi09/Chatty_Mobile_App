// ============================================================================
// groupService — group use cases. Same shape as chatService.
// ============================================================================

import { authService } from './authService';
import { groupRepository, CreateGroupArgs } from '../repositories/groupRepository';
import { storageRepository } from '../repositories/storageRepository';
import { buildMediaPath, classifyMedia, MediaAsset } from '../utils/media';
import { debounce } from '../utils/debounce';
import {
  ChatMessage,
  Group,
  GroupMember,
  InboxItem,
  MessageType,
  Unsubscribe,
} from '../types';
import { TYPING_TTL_MS } from '../constants/firebase';

export const groupService = {
  async create(args: Omit<CreateGroupArgs, 'createdBy'>): Promise<string> {
    const me = authService.requireUid();
    return groupRepository.create({ ...args, createdBy: me });
  },

  async get(groupId: string): Promise<Group | null> {
    return groupRepository.get(groupId);
  },

  async listMembers(groupId: string): Promise<GroupMember[]> {
    return groupRepository.listMembers(groupId);
  },

  async rename(groupId: string, name: string): Promise<void> {
    return groupRepository.updateInfo(groupId, { name });
  },

  async setImage(groupId: string, image: string): Promise<void> {
    return groupRepository.updateInfo(groupId, { image });
  },

  async addMembers(
    groupId: string,
    members: { uid: string; name: string; photoURL: string }[],
  ): Promise<void> {
    const g = await groupRepository.get(groupId);
    if (!g) throw new Error('Group not found');
    return groupRepository.addMembers(groupId, members, g.name, g.image);
  },

  async removeMember(groupId: string, uid: string): Promise<void> {
    return groupRepository.removeMember(groupId, uid);
  },

  async leave(groupId: string): Promise<void> {
    const me = authService.requireUid();
    return groupRepository.leaveGroup(groupId, me);
  },

  async promote(groupId: string, uid: string): Promise<void> {
    return groupRepository.promoteToAdmin(groupId, uid);
  },

  async demote(groupId: string, uid: string): Promise<void> {
    return groupRepository.demoteToMember(groupId, uid);
  },

  async sendTextMessage(args: { groupId: string; text: string }): Promise<string> {
    const me = authService.requireUid();
    const meProf = await authService.currentUser();
    return groupRepository.sendMessage({
      groupId: args.groupId,
      senderId: me,
      senderName: meProf?.displayName ?? '',
      type: 'text',
      text: args.text,
    });
  },

  async sendMediaMessage(args: {
    groupId: string;
    asset: MediaAsset;
    onProgress?: (fraction: number) => void;
  }): Promise<string> {
    const me = authService.requireUid();
    const meProf = await authService.currentUser();
    const type: MessageType = classifyMedia(args.asset);
    const messageId = `m_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const blob = await fetchAsBlob(args.asset.uri, args.asset.mimeType ?? undefined);
    const path = buildMediaPath({
      scope: 'group',
      conversationId: args.groupId,
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
    return groupRepository.sendMessage({
      groupId: args.groupId,
      senderId: me,
      senderName: meProf?.displayName ?? '',
      type,
      fileUrl,
      fileName: args.asset.fileName ?? guessExt(args.asset.uri, type),
      fileSize: blob.size,
      fileMimeType: args.asset.mimeType ?? undefined,
      fileDurationMs: args.asset.durationMs ?? undefined,
    });
  },

  async markRead(groupId: string, messageId: string): Promise<void> {
    const me = authService.requireUid();
    return groupRepository.markRead(groupId, me, messageId);
  },

  watchMembers(groupId: string, cb: (m: GroupMember[]) => void): Unsubscribe {
    return groupRepository.watchMembers(groupId, cb);
  },

  watchMessages(
    groupId: string,
    cb: (msgs: ChatMessage[]) => void,
    onError?: (e: unknown) => void,
  ): Unsubscribe {
    return groupRepository.watchMessages(groupId, cb, onError);
  },

  watchUserGroups(uid: string, cb: (items: InboxItem[]) => void): Unsubscribe {
    return groupRepository.watchUserGroups(uid, cb);
  },

  createTypingEmitter(groupId: string) {
    const me = authService.requireUid();
    const debouncedStop = debounce(() => {
      groupRepository.setTyping(groupId, me, false).catch(() => {});
    }, TYPING_TTL_MS / 2);
    return {
      onKeystroke() {
        groupRepository.setTyping(groupId, me, true).catch(() => {});
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

  watchTyping(
    groupId: string,
    cb: (typing: Record<string, boolean>) => void,
  ): Unsubscribe {
    return groupRepository.watchTyping(groupId, cb);
  },
};

// ---------- helpers (duplicated locally to avoid a shared file pulling
// the chat service — keeps tree-shaking happy) ----------

async function fetchAsBlob(uri: string, contentType?: string): Promise<Blob> {
  const res = await fetch(uri);
  const blob = await res.blob();
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
