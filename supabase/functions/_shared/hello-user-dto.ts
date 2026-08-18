import { z } from 'zod';

/**
 * Request/response contract for the `hello-user` Edge Function — imported by
 * both the Deno function and app-side code/tests, so one schema owns the
 * wire. Bare `zod` resolves via `node_modules` (Node) and `import_map.json`
 * (Deno; keep majors in sync with `package.json`). Sharing rules:
 * CLAUDE.md → Edge Functions.
 */
export const helloUserRequestSchema = z.object({
  /** When true, the greeting is returned uppercased. */
  loud: z.boolean().optional(),
});

export type HelloUserRequest = z.infer<typeof helloUserRequestSchema>;

export const helloUserResponseSchema = z.object({
  message: z.string(),
  /** The caller's `userprofiles.nickname`, read under their own RLS. */
  nickname: z.string().nullable(),
});

export type HelloUserResponse = z.infer<typeof helloUserResponseSchema>;
