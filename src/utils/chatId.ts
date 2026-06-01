// ============================================================================
// Chat ID — deterministic, collision-free, sortable.
// ----------------------------------------------------------------------------
// For 1:1 chats: sort(uidA, uidB).join('_'). Both clients compute the
// same id with no lookup, so a brand-new conversation is "free" — no
// Firestore round-trip to find or create the chat.
//
// Why sort? Because Firestore doc ids are case-sensitive strings, and we
// need a canonical form. [a, b] and [b, a] would otherwise produce
// different ids for the same pair of users.
//
// Underscore separator because: it's not allowed in Firebase Auth uids,
// which are alphanumeric, so we can never have an ambiguous split.
// ============================================================================

export function makeDirectChatId(uidA: string, uidB: string): string {
  if (!uidA || !uidB) throw new Error('makeDirectChatId: uids required');
  if (uidA === uidB) throw new Error('makeDirectChatId: cannot chat with yourself');
  return [uidA, uidB].sort().join('_');
}

/** Extract the "other" participant from a deterministic chatId. */
export function otherParticipant(chatId: string, myUid: string): string {
  const [a, b] = chatId.split('_');
  if (a === myUid) return b;
  if (b === myUid) return a;
  // We should never be reading a chat we're not in. If we are, fail loud
  // — security rules will block the read anyway, but better to throw
  // before the request.
  throw new Error(`otherParticipant: ${myUid} is not a participant of ${chatId}`);
}
