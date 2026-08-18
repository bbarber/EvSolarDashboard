---
name: supabase-edge-function
description: Use when creating or modifying a Supabase Edge Function in this project — a serverless endpoint for privileged/scheduled server-side work (service-role access, external API calls, cron targets, webhooks). Ensures the thin-entrypoint/_shared split, JWT posture, import-map hygiene, and both test layers.
---

# Build a Supabase Edge Function

Edge Functions (`supabase/functions/`) are this template's home for server-side code the
Next.js app must not hold: service-role operations, external API keys, cron-invoked jobs.
They run on **Deno** — the one part of the repo the Node toolchain doesn't own — so the
conventions below exist to keep them testable with the tools the repo already has.
`hello-user` is the worked example of everything here.

## The golden rules

1. **Thin `index.ts`** — parse → orchestrate → respond, nothing else. Business logic and
   request/response DTOs go in `supabase/functions/_shared/` as **runtime-agnostic** modules
   (no `Deno.*`, no `node:*`, no `npm:` specifiers) so Vitest unit-tests them. A fat
   `index.ts` is a review finding: nothing in it can be unit-tested.
2. **Sharing is one-directional.** App code may import from `_shared/`; a function must never
   import from `lib/` or `app/` — the Deno bundler cannot leave `supabase/functions/`.
3. **Authenticated by default.** `verify_jwt = true` in `config.toml` unless the function is
   deliberately public (an unauthenticated function is an open endpoint on the internet —
   comment why if you turn it off). Inside, bind the client to the caller's JWT so RLS
   applies; use `SUPABASE_SERVICE_ROLE_KEY` only when bypassing RLS *is the point*, and say
   so in a comment.

## Steps

1. **Scaffold** `supabase/functions/<name>/index.ts` (kebab-case name). Start from
   `hello-user/index.ts`: CORS preflight handling (`_shared/cors.ts`), body validation
   against a zod DTO, a client bound to the caller's `Authorization` header.

2. **Register it** in `supabase/config.toml`:

   ```toml
   [functions.<name>]
   enabled = true
   verify_jwt = true
   import_map = "./functions/import_map.json"
   ```

3. **Put the contract and logic in `_shared/`**: a `<name>-dto.ts` with zod schemas for the
   request and response (both sides of the wire import the same schema), and pure logic
   modules beside it. Bare imports only (`zod`, `@supabase/supabase-js`) — they resolve via
   `node_modules` for Node and `import_map.json` for Deno. If you add a dependency, add it to
   `supabase/functions/import_map.json` AND `package.json`, majors in sync.

4. **Unit-test the `_shared/` logic** with ordinary Vitest `*.test.ts` files next to the
   modules — they run in `pnpm run test:unit` like everything else.

5. **Black-box integration test** in `supabase/functions-tests/<name>.integration.test.ts`
   (Node/Vitest — NOT inside `supabase/functions/`, which is Deno's world, and NOT
   `supabase/tests/`, which the CLI reserves for pgTAP). `pnpm run test:integration` serves
   functions automatically. Assert what carries risk:
   - anonymous call → **401** (proves `verify_jwt`);
   - the happy path, parsed with the shared response DTO (**the parse is the contract test**);
   - invalid body → **400**;
   - data access honors the **caller's** RLS (two users each see only their own rows) — and if
     the function uses the service role, prove it can't be abused to read another user's data.

6. **Secrets** (external API keys): locally in `supabase/functions/.env` (gitignored; example
   file documents it); hosted via `supabase secrets set NAME=value` per project. Never in
   Vercel/app env, never in the repo. Read with `Deno.env.get(...)` in `index.ts` and pass
   values INTO `_shared/` logic as arguments (keeps `_shared/` runtime-agnostic).

7. **Gates before PR:**

   ```bash
   pnpm run functions:lint && pnpm run functions:check   # Deno owns the tree
   pnpm run test:unit                                    # _shared logic
   pnpm run test:integration                             # endpoint against Docker
   pnpm run format                                       # Prettier owns formatting here too
   ```

## Cron-invoked functions

For scheduled work, pair the function with `pg_cron` (declared in a migration via the
`supabase-migration` skill) invoking it over HTTP. Such functions typically set
`verify_jwt = false` **plus** a shared-secret header check inside the handler — verify the
secret before doing anything, and integration-test that a missing/wrong secret is rejected.

## Review gate (for humans and AI reviewers)

Flag on sight: logic or fetch calls living in `index.ts` instead of `_shared/`; a function
importing from `lib/`/`app/`; `verify_jwt = false` without a comment justifying it; service-role
usage without a comment and an RLS-abuse test; a new function with no
`supabase/functions-tests/` test; an import-map addition whose major diverges from
`package.json`.
