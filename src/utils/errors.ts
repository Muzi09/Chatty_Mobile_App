// ============================================================================
// AppError — typed error wrapper for the service layer.
// ----------------------------------------------------------------------------
// Firebase throws `FirebaseError` with `code` strings like
// 'auth/invalid-credential'. We catch those in repositories, normalize
// them to `AppError` with our own codes (ErrorCode), and let the UI layer
// map to user-facing copy. This keeps "permission-denied" and "wrong
// password" decisions out of the screens.
// ============================================================================

import { FirebaseError } from 'firebase/app';
import { ErrorCode, ErrorCodeValue } from '../constants/firebase';

export class AppError extends Error {
  readonly code: ErrorCodeValue;
  readonly original?: unknown;

  constructor(code: ErrorCodeValue, message?: string, original?: unknown) {
    super(message ?? code);
    this.code = code;
    this.original = original;
    this.name = 'AppError';
  }
}

/** Map a Firebase error to our domain error. */
export function toAppError(err: unknown, fallback: ErrorCodeValue = ErrorCode.Unknown): AppError {
  if (err instanceof AppError) return err;
  if (err instanceof FirebaseError) {
    // Auth errors
    if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password') {
      return new AppError(ErrorCode.PermissionDenied, 'Invalid email or password', err);
    }
    if (err.code === 'auth/user-not-found') {
      return new AppError(ErrorCode.UserNotFound, 'No account for that email', err);
    }
    if (err.code === 'auth/email-already-in-use') {
      return new AppError(ErrorCode.PermissionDenied, 'Email already in use', err);
    }
    if (err.code === 'auth/network-request-failed') {
      return new AppError(ErrorCode.NetworkOffline, 'Network error', err);
    }
    // Firestore errors
    if (err.code === 'permission-denied') {
      return new AppError(ErrorCode.PermissionDenied, 'Permission denied', err);
    }
    if (err.code === 'unavailable' || err.code === 'unauthenticated') {
      return new AppError(ErrorCode.NotAuthenticated, 'Not authenticated', err);
    }
    return new AppError(fallback, err.message, err);
  }
  return new AppError(fallback, err instanceof Error ? err.message : 'Unknown error', err);
}
