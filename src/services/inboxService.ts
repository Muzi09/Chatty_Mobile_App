// ============================================================================
// inboxService — unified chat list (1:1 + groups), sorted by lastMessageAt.
// ----------------------------------------------------------------------------
// A single subscription merging the two projections. Sorts in memory
// since each list is already tiny (most users have < 200 conversations)
// and avoiding a Cloud Function here keeps the architecture honest.
// ============================================================================

import { chatRepository } from '../repositories/chatRepository';
import { groupRepository } from '../repositories/groupRepository';
import { authService } from './authService';
import { InboxItem, Unsubscribe } from '../types';

export const inboxService = {
  /**
   * Watch the unified inbox. Returns an unsubscribe that tears down
   * both subscriptions.
   */
  watch(cb: (items: InboxItem[]) => void): Unsubscribe {
    const me = authService.requireUid();
    let direct: InboxItem[] = [];
    let group: InboxItem[] = [];
    const emit = () => {
      const merged = [...direct, ...group].sort(
        (a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime(),
      );
      cb(merged);
    };
    const u1 = chatRepository.watchInbox(me, (items) => {
      direct = items;
      emit();
    });
    const u2 = groupRepository.watchUserGroups(me, (items) => {
      group = items;
      emit();
    });
    return () => {
      u1();
      u2();
    };
  },

  /** Total unread across all conversations. */
  watchUnreadCount(cb: (count: number) => void): Unsubscribe {
    return this.watch((items) => {
      cb(items.reduce((sum, i) => sum + (i.unreadCount ?? 0), 0));
    });
  },
};
