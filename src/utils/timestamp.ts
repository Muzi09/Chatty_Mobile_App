// ============================================================================
// Timestamp / Date helpers.
// ----------------------------------------------------------------------------
// Firestore returns `Timestamp` objects. The rest of the app wants `Date`.
// We convert at the repository boundary so services and hooks only ever
// see `Date`. Use these helpers consistently — never call `.toDate()` in
// a hook or a screen.
// ============================================================================

import { Timestamp } from 'firebase/firestore';

/** Convert Firestore Timestamp | Date | null | undefined to Date. */
export function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value instanceof Timestamp) return value.toDate();
  if (typeof value === 'number') return new Date(value);
  if (typeof value === 'string') {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date(0);
}

/** Server-side timestamp helper. Use this when writing. */
export function serverTimestamp(): {
  readonly serverTimestamp: true;
  // The Firestore SDK treats this specially on write. We keep the type
  // narrow so we don't accidentally compare against it.
} {
  return { serverTimestamp: true } as const;
}

/** True if `t` is a sentinel value (serverTimestamp placeholder). */
export function isServerTimestamp(t: unknown): boolean {
  return (
    typeof t === 'object' &&
    t !== null &&
    (t as { serverTimestamp?: unknown }).serverTimestamp === true
  );
}

/** "now" — Date. Prefer this over `new Date()` for consistency. */
export const now = (): Date => new Date();
