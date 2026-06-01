// Public re-exports for hooks.
export { useAuthInternal, type UseAuthState } from './useAuth';
export { useInbox, type UseInboxResult } from './useInbox';
export {
  useMessages,
  type ConversationScope,
  type UseMessagesOptions,
  type UseMessagesResult,
} from './useMessages';
export { usePresence } from './usePresence';
export { useTyping, type TypingEmitter, type UseTypingOptions } from './useTyping';
export {
  useChatMeta,
  type ChatScope,
  type UseChatMetaResult,
} from './useChatMeta';
export { useContacts } from './useContacts';
