// ============================================================================
// useInbox — real-time chat list (1:1 + groups, merged + sorted).
// ----------------------------------------------------------------------------
// A single subscription that combines both projections. Used by the
// messages tab.
// ============================================================================

import { useEffect, useState } from 'react';
import { inboxService } from '../services/inboxService';
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

  useEffect(() => {
    let unsub: (() => void) | null = null;
    try {
      unsub = inboxService.watch((next) => {
        setItems(next);
        setLoading(false);
      });
    } catch (e) {
      setError(e as Error);
      setLoading(false);
    }
    return () => unsub?.();
  }, []);

  const unreadTotal = items.reduce((s, i) => s + (i.unreadCount ?? 0), 0);

  return { items, loading, error, unreadTotal };
}
