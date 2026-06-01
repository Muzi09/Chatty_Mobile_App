// ============================================================================
// Media helpers — classify a file picker result and build a storage path.
// ----------------------------------------------------------------------------
// expo-image-picker returns assets with `uri`, `mimeType`, `fileName`,
// `fileSize`. We map that to one of our message types so the security
// rules and the UI agree on what `type` means.
// ============================================================================

import { MessageType } from '../types';

export interface MediaAsset {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
  fileSize?: number | null;
  durationMs?: number | null;
}

const IMAGE_PREFIXES = ['image/'];
const VIDEO_PREFIXES = ['video/'];
const AUDIO_PREFIXES = ['audio/'];
const DOC_MIME = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
]);

export function classifyMedia(asset: MediaAsset): MessageType {
  const mime = (asset.mimeType ?? '').toLowerCase();
  if (!mime) {
    // Best-effort fallback on extension. expo-image-picker usually sets
    // mimeType, but in some flows (Android intent-pick) it may be null.
    const ext = (asset.fileName ?? '').split('.').pop()?.toLowerCase() ?? '';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'm4v', 'webm', '3gp'].includes(ext)) return 'video';
    if (['mp3', 'm4a', 'aac', 'wav', 'ogg', 'opus'].includes(ext)) return 'audio';
    if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt'].includes(ext)) return 'document';
    return 'document';
  }
  if (IMAGE_PREFIXES.some((p) => mime.startsWith(p))) return 'image';
  if (VIDEO_PREFIXES.some((p) => mime.startsWith(p))) return 'video';
  if (AUDIO_PREFIXES.some((p) => mime.startsWith(p))) return 'audio';
  if (DOC_MIME.has(mime)) return 'document';
  return 'document';
}

/**
 * Build a deterministic storage path for a media upload.
 * Format: {CHAT_MEDIA|GROUP_MEDIA}/{chatId|groupId}/{messageId}/{fileName}
 *
 * Including the messageId in the path means the Firestore doc and the
 * Storage object are created together and can be cross-referenced — if a
 * message gets deleted, the function knows exactly which storage object
 * to clean up.
 */
export function buildMediaPath(opts: {
  scope: 'direct' | 'group';
  conversationId: string;
  messageId: string;
  fileName: string;
}): string {
  const { scope, conversationId, messageId, fileName } = opts;
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const base = scope === 'group' ? 'group_media' : 'chat_media';
  return `${base}/${conversationId}/${messageId}/${safeName}`;
}

/** Filename for an avatar upload. */
export function buildAvatarPath(uid: string, ext: string): string {
  const safe = ext.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  return `avatars/${uid}/avatar-${Date.now()}.${safe}`;
}
