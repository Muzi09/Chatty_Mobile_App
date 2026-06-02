// ============================================================================
// Constants — single source of truth for collection paths, page sizes,
// typing TTLs, and error codes. Avoids "string drift" across services.
// ============================================================================

export const COLLECTIONS = {
  USERS: 'users',
  CHATS: 'chats',
  GROUPS: 'groups',
  USER_CHATS: 'userChats',
  USER_GROUPS: 'userGroups',
  FCM_TOKENS: 'fcmTokens',
  /** Username → uid reservations. Doc id is the lowercased username. */
  USERNAMES: 'usernames',
} as const;

export const SUBCOLLECTIONS = {
  MESSAGES: 'messages',
  TYPING: 'typing',
  MEMBERS: 'members',
} as const;

export const STORAGE_PATHS = {
  AVATARS: 'avatars',
  CHAT_MEDIA: 'chat_media',
  GROUP_MEDIA: 'group_media',
} as const;

/** Number of messages loaded per page in a chat thread. */
export const MESSAGE_PAGE_SIZE = 30;

/** Number of inbox items loaded per page in the chat list. */
export const INBOX_PAGE_SIZE = 25;

/** How long a typing indicator is considered fresh. */
export const TYPING_TTL_MS = 6_000;

/** Hard caps matched in security rules. Keep in sync. */
export const LIMITS = {
  MESSAGE_TEXT: 4_000,
  GROUP_NAME: 80,
  USER_STATUS: 140,
  FILE_BYTES: 50 * 1024 * 1024,
  AVATAR_BYTES: 5 * 1024 * 1024,
  REACTIONS_PER_MESSAGE: 64,
  GROUP_MEMBERS_HARD_CAP: 256,
} as const;

/** App-wide error codes. Map to user-facing strings in the UI layer. */
export const ErrorCode = {
  NotAuthenticated: 'auth/not-authenticated',
  UserNotFound: 'app/user-not-found',
  ChatNotFound: 'app/chat-not-found',
  GroupNotFound: 'app/group-not-found',
  NotAMember: 'app/not-a-member',
  NotAnAdmin: 'app/not-an-admin',
  PermissionDenied: 'permission-denied',
  UploadFailed: 'app/upload-failed',
  NetworkOffline: 'app/network-offline',
  Unknown: 'app/unknown',
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];
