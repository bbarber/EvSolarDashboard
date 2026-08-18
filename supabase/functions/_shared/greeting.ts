/**
 * Pure greeting logic for the `hello-user` Edge Function. `_shared/` modules
 * must stay runtime-agnostic (no Deno/Node APIs, bare imports only) — see
 * CLAUDE.md → Edge Functions.
 */
export function buildGreeting(
  nickname: string | null | undefined,
  options: { loud?: boolean } = {},
): string {
  const name = nickname?.trim();
  const greeting = name ? `Hello, ${name}.` : 'Hello.';
  return options.loud ? greeting.toUpperCase() : greeting;
}
