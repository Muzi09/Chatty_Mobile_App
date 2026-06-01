// ============================================================================
// Domain types — shared between UI, services, repositories, and hooks.
// ----------------------------------------------------------------------------
// Conventions:
//   - Firestore timestamps are converted to JS Date at the repository
//     boundary, so the rest of the app never sees Timestamp instances.
//   - IDs are strings everywhere; never numbers (Firestore doc ids are
//     strings, and that gives us prefix queries for free).
// ============================================================================

// --- Existing UI types (kept for backward compatibility with screens) -----

export interface User {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  phone?: string;
  email?: string;
}

export interface Message {
  id: string;
  text: string;
  timestamp: Date;
  isFromMe: boolean;
  status?: 'sent' | 'delivered' | 'read';
}

export interface Conversation {
  id: string;
  participant: User;
  lastMessage: string;
  lastMessageTime: Date;
  unreadCount: number;
  messages: Message[];
}

export interface Contact {
  id: string;
  name: string;
  avatar?: string;
  initials?: string;
  phone?: string;
  email?: string;
  address?: string;
}

export interface SettingsItem {
  id: string;
  icon: string;
  iconColor: string;
  title: string;
  type: 'navigation' | 'action' | 'danger';
}

// --- Firebase / backend types ---------------------------------------------

/** A user document at /users/{uid}. */
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  status: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;

  /** Lowercased name for case-insensitive prefix search. */
  displayNameLower?: string;

  /** FCM/APNs push token. Kept on the profile for simplicity. */
  pushToken?: string;
}

/** Minimal user reference used in chat lists, member pickers, etc. */
export interface UserSummary {
  uid: string;
  name: string;
  photoURL: string;
  isOnline: boolean;
  lastSeen: Date;
}

/** A 1:1 chat document at /chats/{chatId}. */
export interface Chat {
  id: string;
  type: 'direct';
  /** Always 2 uids, sorted. */
  participants: [string, string];
  /** Denormalized headline for the inbox row. */
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageSenderId?: string;
  /** One of the participant uids' display name — used to label the row. */
  lastMessagePreviewName?: string;
  createdAt: Date;
}

/** Per-user inbox row at /userChats/{uid}/chats/{chatId}. */
export interface InboxItem {
  chatId: string;
  /** 'direct' or 'group'. */
  type: 'direct' | 'group';
  /** For direct chats, the OTHER participant. For groups, the groupId. */
  refId: string;
  /** Display name for the row. */
  name: string;
  /** Avatar URL for the row. */
  photoURL: string;
  lastMessage: string;
  lastMessageAt: Date;
  unreadCount: number;
  isMuted: boolean;
  isPinned: boolean;
  /** Per-user "last read message id" — used to compute unread above. */
  lastReadMessageId?: string;
}

export type MessageType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'system';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Reaction {
  uid: string;
  emoji: string;
  at: Date;
}

/** A message document. The shape is unified across 1:1 and group chats. */
export interface ChatMessage {
  id: string;
  /** Scope: 'direct' or 'group'. */
  scope: 'direct' | 'group';
  /** The chatId or groupId. */
  conversationId: string;

  senderId: string;
  /** For 1:1 only. For groups, omitted. */
  receiverId?: string;

  type: MessageType;

  // Text payload
  text?: string;

  // Media payload
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileMimeType?: string;
  fileDurationMs?: number; // for audio/video
  thumbnailUrl?: string;

  // Lifecycle
  status: MessageStatus;
  createdAt: Date;
  updatedAt: Date;

  // Edit / delete
  isEdited: boolean;
  /** Soft delete: a list of uids who deleted for themselves. If everyone
   *  has deleted, the doc is hard-deleted by a Cloud Function. */
  deletedFor: string[];

  // Reactions
  reactions: Reaction[];

  // Reply / forward context (optional, future-proofing)
  replyToMessageId?: string;
}

/** A group document at /groups/{groupId}. */
export interface Group {
  id: string;
  name: string;
  image: string;
  description?: string;
  createdBy: string;
  createdAt: Date;
  /** Headline for inbox. */
  lastMessage: string;
  lastMessageAt: Date;
  lastMessageSenderId?: string;
  /** Soft-deleted groups (left but not destroyed) can be hidden in lists. */
  isArchived: boolean;
}

export type GroupRole = 'admin' | 'member';

export interface GroupMember {
  uid: string;
  role: GroupRole;
  joinedAt: Date;
  /** Display name denormalized for fast list rendering. */
  name: string;
  photoURL: string;
  lastReadAt: Date;
  isMuted: boolean;
}

/** Typing indicator doc. */
export interface TypingState {
  uid: string;
  isTyping: boolean;
  /** Set by the writer. Readers ignore if older than ~6 seconds. */
  updatedAt: Date;
}

/** FCM token record at /fcmTokens/{uid}. */
export interface FcmTokenRecord {
  uid: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  updatedAt: Date;
}
