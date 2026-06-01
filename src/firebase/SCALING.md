# Scaling Chatty to 100K+ users

The current architecture is correct up to ~50K DAU. Beyond that, several
hot spots need server-side help. This is the short list, ordered by
how much it matters.

## 1. Group message fan-out is O(N) writes

When someone posts in a 200-person group, the client today does ~200
writes (one per member's inbox row). At 1K-person groups that breaks.

**Fix:** Move fan-out to a Cloud Function triggered on group message
create. The function does the batched writes server-side, off the
client's quota, and can be retried. The client only writes the message
doc; the function handles inbox updates.

## 2. Unread counter is a transaction hot-spot

The `runTransaction` that increments the receiver's `unreadCount` is
fine for 1:1 (only one writer per inbox row). For popular users
(receives 100+ messages/second), the transaction can starve.

**Fix:** Sharded counters. Replace `unreadCount: number` with
`unreadShards: { [shard: string]: number }`, choose 4-10 shards per
inbox row, and the Cloud Function picks a random shard. Reader sums
all shards. The Firestore `in` query is not affected. The
`unreadCount` field is denormalized for display; you re-compute on
read for accuracy.

For 99% of users, the simple counter is fine. Sharding kicks in only
when a user has > 100 msg/s incoming.

## 3. Search is in-memory on the client

`useContacts` calls `userService.search` with a `startAt/endAt` query.
This works, but the client has to do a round-trip on every keystroke
(debounced to 250ms). At 100K+ users, the `users` collection gets
large and the `orderBy(displayNameLower)` query still works, but you
hit the "first 30 results" wall.

**Fix:** Two options.

  - **Algolia / Typesense:** for fast prefix + typo-tolerant search.
    Mirror `displayNameLower`, `name`, `photoURL` to a search index via
    a Cloud Function on user write. Most production chat apps do this.
  - **Firestore alone, but smarter:** store a `namePrefixes: string[]`
    field with the first 3-grams of the name. Query
    `where('namePrefixes', 'array-contains-any', prefixes)`. Trades
    storage for query flexibility.

## 4. Presence is a single-field read on every chat

`/users/{uid}.isOnline` updates are not the problem (rare events).
Reading them on every chat list row *is* a problem. If a user has 200
chats, the inbox projection should denormalize presence.

**Fix:** Add `participantIsOnline: Record<uid, boolean>` to
`/userChats/{uid}/chats/{chatId}` and update via the same function
that processes presence changes. Reads then become 1 doc per row, no
fan-out.

(Or just chunk the inbox load — 25 rows at a time means at most 25
presence lookups, which is fine even without denormalization.)

## 5. Typing indicators can spam writes

The debounce in `chatService.createTypingEmitter` helps, but a power
typer still writes 1+ writes per second. A burst of 100 people typing
in a 100-person group = 100 writes/sec.

**Fix:** Realtime Database (RTDB) for typing. It's cheaper for
high-frequency, ephemeral data. Move typing subcollections to RTDB
or use a Cloud Function that throttles.

For most apps, the current Firestore approach is fine. RTDB only when
you measure a problem.

## 6. Media uploads use the user's network

For 50MB video uploads on a phone with a flaky connection, the upload
fails halfway and you've charged the user for nothing.

**Fix:** Resumable uploads via `uploadBytesResumable` (already used)
plus an "upload intent" doc the client writes before starting. A
Cloud Function reconciles dangling uploads (started > 30 min ago with
no corresponding message) and deletes the orphaned storage object.

## 7. Firestore quota at 100K users

The free tier (Spark) won't cover you. Blaze plan is required, and
the first thing to do is set a budget alert. The second is to enable
**App Check** to prevent API abuse from forged clients.

## 8. Cost calculator (rough)

Per DAU, an average chat user:
- 1 read on `/users/{me}` (cache this in memory) = 1 read
- 1 read on `/userChats/{me}/chats` (subscribed) = 1 read
- N reads on each message stream (subscribed, but only on change) = ~5 reads/day
- ~20 writes/day (sent + read receipts + presence)

At $0.06 per 100K reads and $0.18 per 100K writes, a 100K DAU app
costs roughly **$300-800/month** for Firestore, plus Storage and
Functions. Push delivery is free via Expo's Push Service (with
rate limits; switch to FCM HTTP v1 at scale).

## 9. Things you should NOT do

- **Don't `get()` documents in security rules** unless absolutely
  necessary. Each `get()` is a billed read. We have a few in the
  storage rule for group media; consider caching membership in a
  custom claim via a Cloud Function.
- **Don't use `array-contains` for search.** It can't be combined
  with `orderBy` and doesn't scale.
- **Don't store the entire message history in one document.** A
  collection per chat is correct; a single document is not.
- **Don't `set()` on the user doc on every sign-in.** Use `update`
  with the fields that change; rule out no-ops.
