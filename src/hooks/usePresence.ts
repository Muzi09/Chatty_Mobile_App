// ============================================================================
// usePresence — online/offline + lastSeen for a list of uids.
// ----------------------------------------------------------------------------
// Used by the chat list to render presence dots without each row
// spinning up its own subscription.
// ============================================================================

import { useEffect, useState } from 'react';
import { userService } from '../services/userService';
import { UserSummary } from '../types';

export function usePresence(uids: string[]): {
  byUid: Record<string, UserSummary>;
  loading: boolean;
} {
  const [byUid, setByUid] = useState<Record<string, UserSummary>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (uids.length === 0) {
      setByUid({});
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = userService.watchMany(uids, (next) => {
      setByUid(next);
      setLoading(false);
    });
    return unsub;
  }, [uids.join(',')]);

  return { byUid, loading };
}
