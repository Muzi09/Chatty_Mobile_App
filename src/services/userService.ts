// ============================================================================
// userService — user profile reads/writes, search, presence.
// ----------------------------------------------------------------------------
// This is the layer screens call. It does not touch the SDK directly.
// ============================================================================

import { userRepository } from '../repositories/userRepository';
import { storageRepository } from '../repositories/storageRepository';
import { AppError } from '../utils/errors';
import { ErrorCode } from '../constants/firebase';
import { UserProfile, UserSummary } from '../types';

export const userService = {
  async get(uid: string): Promise<UserProfile | null> {
    return userRepository.get(uid);
  },

  async getMany(uid: string): Promise<UserProfile> {
    const u = await userRepository.get(uid);
    if (!u) throw new AppError(ErrorCode.UserNotFound);
    return u;
  },

  async search(query: string): Promise<UserProfile[]> {
    return userRepository.searchByName(query);
  },

  async listAll(): Promise<UserProfile[]> {
    return userRepository.listAll();
  },

  async updateProfile(
    uid: string,
    patch: Partial<Pick<UserProfile, 'name' | 'status' | 'photoURL'>>,
  ): Promise<void> {
    await userRepository.update(uid, patch);
  },

  async uploadAvatar(uid: string, file: Blob, contentType: string): Promise<string> {
    const url = await storageRepository.uploadAvatar(uid, file, contentType);
    await userRepository.update(uid, { photoURL: url });
    return url;
  },

  async setPushToken(uid: string, token: string): Promise<void> {
    await userRepository.update(uid, { pushToken: token });
  },

  watch(uid: string, cb: (u: UserProfile | null) => void): () => void {
    return userRepository.watch(uid, cb);
  },

  watchMany(uids: string[], cb: (u: Record<string, UserSummary>) => void): () => void {
    return userRepository.watchMany(uids, cb);
  },
};
