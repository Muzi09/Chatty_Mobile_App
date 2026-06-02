// ============================================================================
// Username validation + normalization.
// ----------------------------------------------------------------------------
// Usernames are unique across the app. They're lowercase, 3-20 chars,
// letters/digits/underscore only. Display form preserves the user's chosen
// casing, but every comparison and reservation uses the lowercased form.
// ============================================================================

const USERNAME_REGEX = /^[a-z0-9_]{3,20}$/;

export type UsernameValidationError =
  | 'empty'
  | 'too-short'
  | 'too-long'
  | 'invalid-characters';

/** Returns null if valid, otherwise an error code. */
export function validateUsername(s: string): UsernameValidationError | null {
  if (!s) return 'empty';
  if (s.length < 3) return 'too-short';
  if (s.length > 20) return 'too-long';
  if (!USERNAME_REGEX.test(s)) return 'invalid-characters';
  return null;
}

export function normalizeUsername(s: string): string {
  return s.trim().toLowerCase();
}

export function isValidUsername(s: string): boolean {
  return validateUsername(s) === null;
}
