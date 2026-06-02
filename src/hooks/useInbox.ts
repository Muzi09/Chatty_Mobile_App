// ============================================================================
// useInbox — real-time chat list (1:1 + groups, merged + sorted).
// ----------------------------------------------------------------------------
// A single subscription that combines both projections. Used by the
// messages tab. Subscribes to auth state itself and short-circuits when
// there's no signed-in user (this is what the auth/not-authenticated
// error was about: the tabs layout can mount before the auth gate
// decides where to send us, so this hook must not throw).
// ============================================================================

import { useEffect, useState, useRef } from 'react';
import { inboxService } from '../services/inboxService';
import { authService } from '../services/authService';
import { InboxItem } from '../types';

export interface UseInboxResult {
  items: InboxItem[];
  loading: boolean;
  error: Error | null;
  unreadTotal: number;
}

export function useInbox(): UseInboxResult {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  // Hold the inbox unsubscribe so we can tear it down when the user
  // signs out or the hook unmounts.
  const inboxUnsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const unsubAuth = authService.onAuthStateChanged((u) => {
      if (cancelled) return;
      // Tear down any prior inbox subscription (e.g. on sign-out).
      inboxUnsubRef.current?.();
      inboxUnsubRef.current = null;

      if (!u) {
        setItems([]);
        setLoading(false);
        setError(null);
        return;
      }
      try {
        inboxUnsubRef.current = inboxService.watch((next) => {
          if (cancelled) return;
          setItems(next);
          setLoading(false);
        });
      } catch (e) {
        setError(e as Error);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubAuth();
      inboxUnsubRef.current?.();
      inboxUnsubRef.current = null;
    };
  }, []);

  const unreadTotal = items.reduce((s, i) => s + (i.unreadCount ?? 0), 0);

  return { items, loading, error, unreadTotal };
}
