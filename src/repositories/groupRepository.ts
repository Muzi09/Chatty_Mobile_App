// ============================================================================
// groupRepository — group docs, members, messages.
// ----------------------------------------------------------------------------
// Mirrors chatRepository's shape but with:
//   - admin role semantics
//   - member subcollection that doubles as the membership index
//   - separate /userGroups inbox projection
// ============================================================================

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  startAfter,
  onSnapshot,
  runTransaction,
  writeBatch,
  serverTimestamp,
  DocumentSnapshot,
  QueryConstraint,
  Unsubscribe,
} from 'firebase/firestore';
import { getDb } from '../firebase/config';
import { COLLECTIONS, SUBCOLLECTIONS, INBOX_PAGE_SIZE, LIMITS } from '../constants/firebase';
import { toDate } from '../utils/timestamp';
import { toAppError, AppError } from '../utils/errors';
import { ErrorCode } from '../constants/firebase';
import { Group, GroupMember, ChatMessage, InboxItem } from '../types';

function groupRef(groupId: string) {
  return doc(getDb(), COLLECTIONS.GROUPS, groupId);
}
function memberRef(groupId: string, uid: string) {
  return doc(getDb(), COLLECTIONS.GROUPS, groupId, SUBCOLLECTIONS.MEMBERS, uid);
}
function messageRef(groupId: string, messageId: string) {
  return doc(getDb(), COLLECTIONS.GROUPS, groupId, SUBCOLLECTIONS.MESSAGES, messageId);
}
function userGroupRef(uid: string, groupId: string) {
  return doc(getDb(), COLLECTIONS.USER_GROUPS, uid, COLLECTIONS.GROUPS, groupId);
}
function typingRef(groupId: string, uid: string) {
  return doc(getDb(), COLLECTIONS.GROUPS, groupId, SUBCOLLECTIONS.TYPING, uid);
}

function mapGroup(snap: DocumentSnapshot): Group {
  const d = snap.data()!;
  return {
    id: snap.id,
    name: d.name ?? '',
    image: d.image ?? '',
    description: d.description,
    createdBy: d.createdBy,
    createdAt: toDate(d.createdAt),
    lastMessage: d.lastMessage ?? '',
    lastMessageAt: toDate(d.lastMessageAt),
    lastMessageSenderId: d.lastMessageSenderId,
    isArchived: !!d.isArchived,
  };
}

function mapMember(snap: DocumentSnapshot): GroupMember {
  const d = snap.data()!;
  return {
    uid: snap.id,
    role: d.role ?? 'member',
    joinedAt: toDate(d.joinedAt),
    name: d.name ?? '',
    photoURL: d.photoURL ?? '',
    lastReadAt: toDate(d.lastReadAt),
    isMuted: !!d.isMuted,
  };
}

function mapMessage(snap: DocumentSnapshot): ChatMessage {
  const d = snap.data()!;
  return {
    id: snap.id,
    scope: 'group',
    conversationId: snap.ref.parent.parent!.id,
    senderId: d.senderId,
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

export interface CreateGroupArgs {
  name: string;
  image: string;
  description?: string;
  createdBy: string;
  /** Initial members. createdBy should be the first element. */
  members: { uid: string; name: string; photoURL: string }[];
}

export const groupRepository = {
  async create(args: CreateGroupArgs): Promise<string> {
    if (args.name.length > LIMITS.GROUP_NAME) {
      throw new AppError(ErrorCode.Unknown, 'Group name too long');
    }
    if (args.members.length > LIMITS.GROUP_MEMBERS_HARD_CAP) {
      throw new AppError(ErrorCode.Unknown, 'Group too large');
    }
    const groupId = doc(collection(getDb(), '_')).id;
    try {
      const batch = writeBatch(getDb());

      // Group doc
      batch.set(groupRef(groupId), {
        id: groupId,
        name: args.name,
        image: args.image,
        description: args.description ?? null,
        createdBy: args.createdBy,
        createdAt: serverTimestamp(),
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        isArchived: false,
      });

      // Member subcollection — creator is admin, others are members.
      for (const m of args.members) {
        batch.set(memberRef(groupId, m.uid), {
          uid: m.uid,
          role: m.uid === args.createdBy ? 'admin' : 'member',
          name: m.name,
          photoURL: m.photoURL,
          joinedAt: serverTimestamp(),
          lastReadAt: serverTimestamp(),
          isMuted: false,
        });
        // Inbox projection
        batch.set(userGroupRef(m.uid, groupId), {
          groupId,
          name: args.name,
          photoURL: args.image,
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          unreadCount: 0,
          isMuted: false,
        });
      }

      await batch.commit();
      return groupId;
    } catch (e) {
      throw toAppError(e);
    }
  },

  async get(groupId: string): Promise<Group | null> {
    try {
      const snap = await getDoc(groupRef(groupId));
      return snap.exists() ? mapGroup(snap) : null;
    } catch (e) {
      throw toAppError(e, ErrorCode.GroupNotFound);
    }
  },

  watchGroup(groupId: string, cb: (g: Group | null) => void): Unsubscribe {
    return onSnapshot(
      groupRef(groupId),
      (s) => cb(s.exists() ? mapGroup(s) : null),
      (e) => {
        // eslint-disable-next-line no-console
        console.warn('[groupRepository.watchGroup]', e);
        cb(null);
      },
    );
  },

  async updateInfo(
    groupId: string,
    patch: Partial<Pick<Group, 'name' | 'image' | 'description'>>,
  ): Promise<void> {
    try {
      await updateDoc(groupRef(groupId), patch);
      // Mirror the rename into every member's inbox row.
      if (patch.name !== undefined || patch.image !== undefined) {
        const members = await this.listMembers(groupId);
        const batch = writeBatch(getDb());
        for (const m of members) {
          batch.set(
            userGroupRef(m.uid, groupId),
            { name: patch.name, photoURL: patch.image },
            { merge: true },
          );
        }
        await batch.commit();
      }
    } catch (e) {
      throw toAppError(e);
    }
  },

  async listMembers(groupId: string): Promise<GroupMember[]> {
    try {
      const q = query(
        collection(getDb(), COLLECTIONS.GROUPS, groupId, SUBCOLLECTIONS.MEMBERS),
        orderBy('joinedAt', 'asc'),
      );
      const snap = await getDocs(q);
      return snap.docs.map(mapMember);
    } catch (e) {
      throw toAppError(e);
    }
  },

  watchMembers(groupId: string, cb: (members: GroupMember[]) => void): Unsubscribe {
    const q = query(
      collection(getDb(), COLLECTIONS.GROUPS, groupId, SUBCOLLECTIONS.MEMBERS),
      orderBy('joinedAt', 'asc'),
    );
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map(mapMember)),
      (e) => {
        // eslint-disable-next-line no-console
        console.warn('[groupRepository.watchMembers]', e);
        cb([]);
      },
    );
  },

  async addMembers(
    groupId: string,
    members: { uid: string; name: string; photoURL: string }[],
    groupName: string,
    groupImage: string,
  ): Promise<void> {
    try {
      const batch = writeBatch(getDb());
      for (const m of members) {
        batch.set(memberRef(groupId, m.uid), {
          uid: m.uid,
          role: 'member',
          name: m.name,
          photoURL: m.photoURL,
          joinedAt: serverTimestamp(),
          lastReadAt: serverTimestamp(),
          isMuted: false,
        });
        batch.set(userGroupRef(m.uid, groupId), {
          groupId,
          name: groupName,
          photoURL: groupImage,
          lastMessage: '',
          lastMessageAt: serverTimestamp(),
          unreadCount: 0,
          isMuted: false,
        });
      }
      await batch.commit();
    } catch (e) {
      throw toAppError(e);
    }
  },

  async removeMember(groupId: string, uid: string): Promise<void> {
    try {
      const batch = writeBatch(getDb());
      batch.delete(memberRef(groupId, uid));
      batch.delete(userGroupRef(uid, groupId));
      await batch.commit();
    } catch (e) {
      throw toAppError(e);
    }
  },

  async leaveGroup(groupId: string, uid: string): Promise<void> {
    return this.removeMember(groupId, uid);
  },

  async promoteToAdmin(groupId: string, uid: string): Promise<void> {
    try {
      await updateDoc(memberRef(groupId, uid), { role: 'admin' });
    } catch (e) {
      throw toAppError(e);
    }
  },

  async demoteToMember(groupId: string, uid: string): Promise<void> {
    try {
      await updateDoc(memberRef(groupId, uid), { role: 'member' });
    } catch (e) {
      throw toAppError(e);
    }
  },

  /** Page through group messages. */
  async listMessagesPage(
    groupId: string,
    pageSize: number,
    cursor?: DocumentSnapshot,
  ): Promise<{ messages: ChatMessage[]; cursor: DocumentSnapshot | null }> {
    const constraints: QueryConstraint[] = [orderBy('createdAt', 'desc'), limit(pageSize)];
    if (cursor) constraints.push(startAfter(cursor));
    try {
      const q = query(
        collection(getDb(), COLLECTIONS.GROUPS, groupId, SUBCOLLECTIONS.MESSAGES),
        ...constraints,
      );
      const snap = await getDocs(q);
      const messages = snap.docs.map(mapMessage).reverse();
      const last = snap.docs[snap.docs.length - 1] ?? null;
      return { messages, cursor: last };
    } catch (e) {
      throw toAppError(e);
    }
  },

  watchMessages(
    groupId: string,
    cb: (msgs: ChatMessage[]) => void,
    onError?: (e: unknown) => void,
  ): Unsubscribe {
    const q = query(
      collection(getDb(), COLLECTIONS.GROUPS, groupId, SUBCOLLECTIONS.MESSAGES),
      orderBy('createdAt', 'asc'),
    );
    return onSnapshot(
      q,
      (snap) => cb(snap.docs.map(mapMessage)),
      (e) => {
        if (onError) onError(e);
        else {
          // eslint-disable-next-line no-console
          console.warn('[groupRepository.watchMessages]', e);
        }
      },
    );
  },

  async sendMessage(args: {
    groupId: string;
    senderId: string;
    senderName: string;
    text?: string;
    type: import('../types').MessageType;
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
              ? `🎙 ${args.senderName}: Voice`
              : args.type === 'document'
                ? `📄 ${args.fileName ?? 'Document'}`
                : '';

    try {
      const batch = writeBatch(getDb());

      batch.set(messageRef(args.groupId, messageId), {
        id: messageId,
        senderId: args.senderId,
        type: args.type,
        text: args.text ?? null,
        fileUrl: args.fileUrl ?? null,
        fileName: args.fileName ?? null,
        fileSize: args.fileSize ?? null,
        fileMimeType: args.fileMimeType ?? null,
        fileDurationMs: args.fileDurationMs ?? null,
        thumbnailUrl: args.thumbnailUrl ?? null,
        status: 'sent',
        createdAt: nowDate,
        updatedAt: nowDate,
        isEdited: false,
        deletedFor: [],
        reactions: [],
      });

      batch.update(groupRef(args.groupId), {
        lastMessage: preview,
        lastMessageAt: nowDate,
        lastMessageSenderId: args.senderId,
      });

      // Update every member's inbox row in one batch. For very large
      // groups (100+) this is too many writes — see Cloud Function note
      // in scalability.md.
      const membersSnap = await getDocs(
        query(
          collection(
            getDb(),
            COLLECTIONS.GROUPS,
            args.groupId,
            SUBCOLLECTIONS.MEMBERS,
          ),
        ),
      );

      for (const m of membersSnap.docs) {
        const uid = m.id;
        batch.set(
          userGroupRef(uid, args.groupId),
          {
            lastMessage: preview,
            lastMessageAt: nowDate,
          },
          { merge: true },
        );
      }

      await batch.commit();

      // Bump unread for everyone except the sender.
      await runTransaction(getDb(), async (tx) => {
        for (const m of membersSnap.docs) {
          const uid = m.id;
          if (uid === args.senderId) {
            // Sender's unread is 0; lastReadMessageId tracks their own
            // messages implicitly.
            tx.set(
              userGroupRef(uid, args.groupId),
              { unreadCount: 0, lastReadAt: nowDate },
              { merge: true },
            );
            continue;
          }
          const inbox = await tx.get(userGroupRef(uid, args.groupId));
          const prev = (inbox.data()?.unreadCount as number | undefined) ?? 0;
          tx.set(
            userGroupRef(uid, args.groupId),
            { unreadCount: prev + 1 },
            { merge: true },
          );
        }
      });

      return messageId;
    } catch (e) {
      throw toAppError(e, ErrorCode.Unknown);
    }
  },

  async markRead(groupId: string, uid: string, messageId: string): Promise<void> {
    try {
      const batch = writeBatch(getDb());
      batch.set(
        memberRef(groupId, uid),
        { lastReadAt: new Date(), lastReadMessageId: messageId },
        { merge: true },
      );
      batch.set(
        userGroupRef(uid, groupId),
        { unreadCount: 0, lastReadMessageId: messageId },
        { merge: true },
      );
      await batch.commit();
    } catch (e) {
      throw toAppError(e);
    }
  },

  watchUserGroups(uid: string, cb: (items: InboxItem[]) => void): Unsubscribe {
    const q = query(
      collection(getDb(), COLLECTIONS.USER_GROUPS, uid, COLLECTIONS.GROUPS),
      orderBy('lastMessageAt', 'desc'),
    );
    return onSnapshot(
      q,
      (snap) =>
        cb(
          snap.docs.map((d) => {
            const data = d.data();
            return {
              chatId: d.id,
              type: 'group' as const,
              refId: d.id,
              name: data.name ?? '',
              photoURL: data.photoURL ?? '',
              lastMessage: data.lastMessage ?? '',
              lastMessageAt: toDate(data.lastMessageAt),
              unreadCount: data.unreadCount ?? 0,
              isMuted: !!data.isMuted,
              isPinned: !!data.isPinned,
              lastReadMessageId: data.lastReadMessageId,
            };
          }),
        ),
      (e) => {
        // eslint-disable-next-line no-console
        console.warn('[groupRepository.watchUserGroups]', e);
        cb([]);
      },
    );
  },

  watchTyping(
    groupId: string,
    cb: (typing: Record<string, boolean>) => void,
  ): Unsubscribe {
    return onSnapshot(
      collection(getDb(), COLLECTIONS.GROUPS, groupId, SUBCOLLECTIONS.TYPING),
      (snap) => {
        const out: Record<string, boolean> = {};
        for (const d of snap.docs) out[d.id] = !!d.data().isTyping;
        cb(out);
      },
      (e) => {
        // eslint-disable-next-line no-console
        console.warn('[groupRepository.watchTyping]', e);
        cb({});
      },
    );
  },

  async setTyping(groupId: string, uid: string, isTyping: boolean): Promise<void> {
    try {
      await setDoc(typingRef(groupId, uid), { uid, isTyping, updatedAt: new Date() });
    } catch (e) {
      throw toAppError(e);
    }
  },
};
