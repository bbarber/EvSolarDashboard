/**
 * Maps errors from Supabase auth into safe, user-facing copy. Never returns a
 * raw Supabase/DB message — those can leak implementation details and read
 * poorly — falling back to a generic message for anything unrecognized.
 */
export function normalizeAuthError(error: unknown): string {
  const raw = error instanceof Error ? error.message : '';
  const message = raw.toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Incorrect email or password.';
  }
  if (message.includes('already registered')) {
    return 'An account with this email already exists.';
  }
  if (message.includes('email not confirmed')) {
    return 'Please confirm your email address before signing in.';
  }
  if (message.includes('rate limit') || message.includes('too many requests')) {
    return 'Too many attempts. Please wait a moment and try again.';
  }
  if (
    message.includes('password should be') ||
    message.includes('weak password')
  ) {
    return 'Please choose a stronger password.';
  }

  return 'Something went wrong. Please try again.';
}

/**
 * Maps errors from chat operations into safe, user-facing copy. Same contract
 * as {@link normalizeAuthError}: never surfaces a raw Supabase/Postgres message.
 */
export function normalizeChatError(error: unknown): string {
  const raw = error instanceof Error ? error.message : '';
  const message = raw.toLowerCase();

  // An RLS/privilege rejection means the user's can_chat flag is off (or was
  // just revoked) — say so instead of a generic failure.
  if (
    message.includes('row-level security') ||
    message.includes('permission denied')
  ) {
    return 'You do not have access to chat.';
  }
  if (message.includes('check constraint')) {
    return 'That message could not be sent.';
  }

  return 'Something went wrong. Please try again.';
}
