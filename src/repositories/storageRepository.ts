// ============================================================================
// storageRepository — Firebase Storage uploads.
// ----------------------------------------------------------------------------
// The client uploads directly. The security rules are the gate; this
// repository just gives us a typed API and progress reporting.
// ============================================================================

import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  UploadTask,
} from 'firebase/storage';
import { getStorageInstance } from '../firebase/config';
import { LIMITS, STORAGE_PATHS } from '../constants/firebase';
import { toAppError } from '../utils/errors';
import { ErrorCode } from '../constants/firebase';

export interface UploadProgress {
  bytesTransferred: number;
  totalBytes: number;
  fraction: number;
}

export interface UploadOptions {
  /** Path within the bucket, e.g. "avatars/abc/avatar.jpg". */
  path: string;
  /** Raw bytes. (Local file URIs are turned into Blobs by the caller
   *  via fetch, so the SDK never sees a `string` here.) */
  data: Blob | Uint8Array;
  contentType?: string;
  onProgress?: (p: UploadProgress) => void;
}

export const storageRepository = {
  /**
   * Upload a blob to a specific path. Resolves to the download URL.
   * The path is built by the caller (utils/media.ts) so the message
   * doc and the storage object can be cross-referenced.
   */
  async upload(opts: UploadOptions): Promise<string> {
    try {
      const r = storageRef(getStorageInstance(), opts.path);
      const metadata = opts.contentType ? { contentType: opts.contentType } : undefined;
      const task: UploadTask = uploadBytesResumable(r, opts.data, metadata);

      if (opts.onProgress) {
        task.on('state_changed', (s) => {
          opts.onProgress?.({
            bytesTransferred: s.bytesTransferred,
            totalBytes: s.totalBytes,
            fraction: s.totalBytes === 0 ? 0 : s.bytesTransferred / s.totalBytes,
          });
        });
      }

      await new Promise<void>((resolve, reject) => {
        task.on('state_changed', undefined, reject, () => resolve());
      });
      return getDownloadURL(r);
    } catch (e) {
      throw toAppError(e, ErrorCode.UploadFailed);
    }
  },

  async delete(path: string): Promise<void> {
    try {
      const r = storageRef(getStorageInstance(), path);
      await deleteObject(r);
    } catch (e) {
      // Deleting a non-existent object is not fatal. Surface everything else.
      // eslint-disable-next-line no-console
      console.warn('[storageRepository.delete]', e);
    }
  },

  /**
   * Helper: upload an avatar for a user. Enforces the size limit
   * declared in rules.
   */
  async uploadAvatar(uid: string, file: Blob, contentType: string): Promise<string> {
    if (file.size > LIMITS.AVATAR_BYTES) {
      throw toAppError(new Error('Avatar too large'), ErrorCode.UploadFailed);
    }
    const ext = contentType.split('/')[1] ?? 'jpg';
    return this.upload({
      path: `${STORAGE_PATHS.AVATARS}/${uid}/avatar-${Date.now()}.${ext}`,
      data: file,
      contentType,
    });
  },
};
