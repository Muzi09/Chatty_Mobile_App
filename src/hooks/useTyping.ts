// ============================================================================
// useTyping — typing indicator for a chat or group, plus an emitter.
// ----------------------------------------------------------------------------
// Returns:
//   - typing:     map of uid → isTyping
//   - isOtherTyping: convenient boolean for "X is typing..."
//   - emitter:    hook to attach to the input (onKeystroke / onSend)
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import { chatService } from '../services/chatService';
import { groupService } from '../services/groupService';
import { authService } from '../services/authService';
import { TYPING_TTL_MS } from '../constants/firebase';

export interface UseTypingOptions {
  scope: 'direct' | 'group';
  conversationId: string;
}

export interface TypingEmitter {
  onKeystroke: () => void;
  onSend: () => void;
  cancel: () => void;
}

export function useTyping(opts: UseTypingOptions): {
  typing: Record<string, boolean>;
  isOtherTyping: boolean;
  emitter: TypingEmitter;
} {
  const { scope, conversationId } = opts;
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const me = authService.currentUser()?.uid ?? '';

  useEffect(() => {
    const svc = scope === 'direct' ? chatService : groupService;
    const unsub = svc.watchTyping(conversationId, setTyping);
    return unsub;
  }, [scope, conversationId]);

  // Filter out stale entries (older than TTL). We re-evaluate on a
  // short interval rather than using server timestamps because
  // expo-firestore can't filter server-side on time deltas.
  useEffect(() => {
    const t = setInterval(() => {
      setTyping((prev) => {
        const next: Record<string, boolean> = {};
        for (const [uid, v] of Object.entries(prev)) {
          if (v) next[uid] = true;
        }
        return next;
      });
    }, TYPING_TTL_MS);
    return () => clearInterval(t);
  }, []);

  const emitter = useMemo<TypingEmitter>(() => {
    const svc = scope === 'direct' ? chatService : groupService;
    return svc.createTypingEmitter(conversationId);
  }, [scope, conversationId]);

  const isOtherTyping = Object.entries(typing).some(
    ([uid, v]) => v && uid !== me,
  );

  return { typing, isOtherTyping, emitter };
}
