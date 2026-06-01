// ============================================================================
// useContacts — debounced search + full user list.
// ----------------------------------------------------------------------------
// Used by the contacts/people tab. Returns a `query` setter, debounced
// results, and a `loading` flag. Calling `query('')` returns the full
// list (capped at 200 — beyond that, paginate).
// ============================================================================

import { useEffect, useState, useCallback, useRef } from 'react';
import { userService } from '../services/userService';
import { UserProfile } from '../types';

export function useContacts(): {
  query: string;
  setQuery: (q: string) => void;
  results: UserProfile[];
  loading: boolean;
} {
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reqIdRef = useRef(0);

  const run = useCallback(async (q: string) => {
    const myId = ++reqIdRef.current;
    setLoading(true);
    try {
      const next = q.trim()
        ? await userService.search(q)
        : await userService.listAll();
      if (myId !== reqIdRef.current) return; // stale
      setResults(next);
    } finally {
      if (myId === reqIdRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => run(query), 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, run]);

  const setQuery = useCallback((q: string) => setQueryState(q), []);

  return { query, setQuery, results, loading };
}
