// ============================================================================
// useChatMeta — chat or group document, with the participant or members list.
// ----------------------------------------------------------------------------
// Generic shape: pass a scope and id, get the metadata and a way to
// subscribe to membership changes.
// ============================================================================

import { useEffect, useState } from 'react';
import { chatRepository } from '../repositories/chatRepository';
import { groupRepository } from '../repositories/groupRepository';
import { Chat, Group, GroupMember } from '../types';

export type ChatScope = 'direct' | 'group';

export interface UseChatMetaResult {
  chat: Chat | null;
  group: Group | null;
  members: GroupMember[];
  loading: boolean;
}

export function useChatMeta(scope: ChatScope, id: string): UseChatMetaResult {
  const [chat, setChat] = useState<Chat | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (scope === 'direct') {
      setLoading(true);
      const u1 = chatRepository.watchChat(id, (c) => {
        setChat(c);
        setLoading(false);
      });
      return () => u1();
    } else {
      setLoading(true);
      const u1 = groupRepository.watchGroup(id, (g) => {
        setGroup(g);
        setLoading(false);
      });
      const u2 = groupRepository.watchMembers(id, setMembers);
      return () => {
        u1();
        u2();
      };
    }
  }, [scope, id]);

  return { chat, group, members, loading };
}
