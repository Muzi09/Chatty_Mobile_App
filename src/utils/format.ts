// ============================================================================
// Display helpers — formatting for the UI layer.
// ----------------------------------------------------------------------------
// Kept dependency-free so they can be unit-tested without RN.
// ============================================================================

/** Relative time, WhatsApp-style. */
export function formatRelativeTime(d: Date, now: Date = new Date()): string {
  const diff = now.getTime() - d.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return 'now';
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;

  // Older: locale date
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/** Chat list / message header. */
export function formatChatHeader(d: Date, now: Date = new Date()): string {
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
  const yesterday = (a: Date, b: Date) =>
    new Date(b.getFullYear(), b.getMonth(), b.getDate() - 1).toDateString() ===
    a.toDateString();

  if (sameDay(d, now)) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  }
  if (yesterday(d, now)) return 'Yesterday';
  if (now.getFullYear() === d.getFullYear()) {
    return d.toLocaleDateString(undefined, { weekday: 'short' });
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/** "last seen" copy. */
export function formatLastSeen(d: Date, isOnline: boolean, now: Date = new Date()): string {
  if (isOnline) return 'online';
  const diff = now.getTime() - d.getTime();
  if (diff < 60_000) return 'last seen just now';
  return `last seen ${formatRelativeTime(d, now)} ago`;
}

/** "user is typing" — used in conversation list. */
export function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
