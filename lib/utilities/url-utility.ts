/** URL helpers with a security bent. */

/**
 * Guard against open-redirect attacks. Returns `candidate` only when it is a
 * safe *same-origin relative* path; otherwise returns `fallback`.
 *
 * A value is considered safe when it starts with a single `/` and cannot be
 * coerced into an absolute or protocol-relative URL — so `https://evil.com`,
 * `//evil.com`, and backslash tricks like `/\evil.com` are all rejected.
 *
 * @param candidate - Untrusted redirect target (e.g. a `next` query param).
 * @param fallback - Where to send the user when `candidate` is unsafe.
 */
export function safeRedirectPath(
  candidate: string | null | undefined,
  fallback = '/',
): string {
  if (!candidate) return fallback;

  const isSafeRelativePath =
    candidate.startsWith('/') &&
    !candidate.startsWith('//') &&
    !candidate.includes('\\') &&
    !candidate.includes('://');

  return isSafeRelativePath ? candidate : fallback;
}
