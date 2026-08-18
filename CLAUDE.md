# CLAUDE.md

Guidance for AI agents (and humans) working in projects created from this Next.js +
Supabase template. Keep this file high-signal; put depth in `documentation/`.

## What this is

A template repo. Local dev runs the **Supabase backend in Docker via the CLI**; the Next.js
app runs on the host. Devs bring their own hosted Supabase project for staging/production.

## Stack & conventions (follow these)

- **Next.js** App Router, React 19, TypeScript, Tailwind + shadcn/ui (`components/ui/`).
- **Package manager: pnpm** (pinned via `packageManager` in `package.json`). Use `pnpm`, not
  npm/yarn. Settings like `overrides`/`allowBuilds` live in `pnpm-workspace.yaml`.
- **Auth proxy**: `proxy.ts` (root) → `lib/supabase/proxy.ts#updateSession` refreshes the
  session and guards non-public routes. This is Next.js 16's request-interceptor convention
  (the successor to `middleware.ts`); it must stay named `proxy.ts` exporting `proxy`.
- **Env vars**: validated in `lib/env.ts` (`@t3-oss/env-nextjs` + zod). Import `env`, never
  read `process.env` directly.
- **Database**: changes go through migrations in `supabase/migrations/`, and **every table
  must have RLS enabled with explicit policies**. Use the `supabase-migration` skill
  (`.claude/skills/supabase-migration/`) to scaffold them correctly. **A migration that adds
  testable DB behavior (RLS policies, triggers, functions, constraints) must ship with an
  integration test** (`*.integration.test.ts`, `pnpm run test:integration`) — for RLS
  especially, prove who *can* and *cannot* see the data. Treat a missing test as a review
  finding.
- **Edge Functions** (`supabase/functions/`) are **Deno's world** — the one part of the repo
  the Node toolchain doesn't own. Use the `supabase-edge-function` skill
  (`.claude/skills/supabase-edge-function/`) when creating or changing one. The rules:
  - **Thin `index.ts`** (parse → orchestrate → respond). Business logic and wire DTOs live in
    `supabase/functions/_shared/` as **runtime-agnostic** modules (no Deno/Node APIs, no
    `npm:` specifiers) so Vitest unit-tests them like any other code. A fat `index.ts` is a
    review finding.
  - **Sharing is one-directional**: app code may import from `_shared/`; functions must never
    import from `lib/`/`app/` (the Deno bundler can't leave `supabase/functions/`). This is
    why `pnpm run db:types` generates into `_shared/database.types.ts` and
    `lib/database.types.ts` is a hand-written re-export — never regenerate over the re-export.
  - Bare imports (`zod`, `@supabase/supabase-js`) resolve via `node_modules` for Node and via
    `supabase/functions/import_map.json` for Deno — keep the map's majors in sync with
    `package.json`.
  - **`verify_jwt = true`** in `supabase/config.toml` unless a function is deliberately
    public; inside, bind the DB client to the caller's `Authorization` header so RLS applies.
    Reach for the service-role key only when bypassing RLS is the point, and treat that as an
    API surface to integration-test.
  - **Tests**: pure logic → Vitest unit tests in `_shared/`; the endpoint itself → black-box
    `*.integration.test.ts` in `supabase/functions-tests/` (Node/Vitest — to a test, a
    function is just HTTP; `pnpm run test:integration` serves functions automatically).
  - Toolchain fencing: tsc/ESLint exclude `supabase/functions/`; `pnpm run functions:check` /
    `functions:lint` (Deno) own it instead. Prettier still owns formatting (deno fmt is
    disabled). Editors scope the Deno LSP to that tree: `.vscode/settings.json`
    (`deno.enablePaths`) and the nested `supabase/functions/.zed/settings.json`.
- **Formatting vs linting**: Prettier owns formatting (single quotes); ESLint owns code
  quality. Don't add formatting rules to ESLint. Format-on-save = Prettier only.
- **Types**: `pnpm run typecheck` (`tsc --noEmit`) is the source of truth for types — lint
  and the test runner do not type-check.
- **Tests**: Vitest (`*.test.ts(x)`, unit/component, no real Supabase) and Playwright
  (`e2e/`, e2e + axe a11y, desktop + iPhone). Keep the runners' files separate. **Integration
  tests** (`*.integration.test.ts`) run against the real local Supabase Docker stack via
  `pnpm run test:integration` — local-only, guarded to `127.0.0.1`. See
  `documentation/testing.md`.
- **Layered architecture** (follow for any non-trivial data feature):
  - `lib/accessors/*` — encapsulate data access; **the only place Supabase/queries live**.
    Thin, no business logic. Define an interface (e.g. `IUserAccessor`) for injection.
  - `lib/managers/*` — orchestrate utilities + accessors; hold the business logic. Depend on
    accessor/utility **interfaces** (constructor injection, defaulting to the real impls).
  - `lib/utilities/*` — cross-cutting helpers (e.g. `auth-utility` for claims + auth actions,
    `error-utility` for normalizing errors). Anything touching the current user/claims or
    Supabase auth goes through `auth-utility`, not Supabase directly.
  - `hooks/*` — React hooks that call a manager (never an accessor/Supabase) and expose
    `{ data, loading, error }` to components (e.g. `use-auth` → `auth-manager`).
  - Flow: component → hook → manager → accessor/utility → Supabase.
  - **Auth flows follow the same layering:** components call `use-auth` → `auth-manager`
    (validation + error normalization) → `auth-utility` (the only caller of `supabase.auth.*`).
    Components never touch the Supabase client or surface raw Supabase error strings.
  - **Rule:** doc-comment (JSDoc) and **fully unit-test managers and utilities** (inject
    fakes — no real Supabase). Accessors are *generally* exempt from unit tests (testing them
    mostly tests the mocks); add tests only when an accessor grows real logic.

## Common commands

| Command | Purpose |
| --- | --- |
| `pnpm run setup` | Bootstrap local dev (Docker + Supabase + `.env.local` + db reset) |
| `pnpm run dev` | Start the app (http://localhost:3000) |
| `pnpm run db:new <name>` / `db:reset` / `db:start` / `db:stop` / `db:status` | Migrations + local stack |
| `pnpm run db:types` | Regenerate `supabase/functions/_shared/database.types.ts` from the local schema (run after migrations; `lib/database.types.ts` re-exports it) |
| `pnpm run functions:serve` | Serve edge functions locally (hot reload; needs the stack up) |
| `pnpm run functions:check` / `functions:lint` | Deno type-check / lint for `supabase/functions/` |
| `pnpm run test:unit` / `test:e2e` | Tests |
| `pnpm run lint` / `typecheck` / `format` | Quality gates |

## Bootstrapping a project from this template

Short version: `pnpm install` → `pnpm run setup` (needs Docker) → `pnpm run dev`.

Full agent runbook (clone via `gh`, create hosted Supabase projects, wire CI secrets):
**`documentation/setting-up-with-claude.md`**.

## MCP servers

`.mcp.json` ships **Playwright** and **Vercel** (`https://mcp.vercel.com`, remote OAuth —
run `/mcp` to authorize). The **Supabase MCP is intentionally omitted** (Supabase says never
point it at prod; it's hosted-only — use the `supabase` CLI locally). Opt-in instructions
(read-only, dev project) are in `documentation/setting-up-with-claude.md`.

## What needs a human (not CLI-automatable)

Surface these to the user instead of trying to script them:

- Creating a Supabase **personal access token** (portal): https://app.supabase.com/account/tokens
- First-time CLI/OAuth auth: `gh auth login`, `supabase login`, `vercel login`
- Org/billing selection, prod-environment **required reviewers**, custom domains
- Vercel uses **native Git integration** (PR previews + prod on `main`); connect via
  `vercel link` + `vercel git connect` or the dashboard. See `documentation/deployment.md`.

## Deeper docs

- `documentation/setting-up-with-claude.md` — agent runbook + required CLIs
- `documentation/local-development.md` — Docker/Supabase local stack, ports, troubleshooting
- `documentation/deployment.md` — hosted envs, CI secrets, migration deploys
- `documentation/testing.md` — unit vs integration vs e2e, the local-only safety model, the migration→test gate
- `CUSTOMIZATIONS.md` — how/why the template was built (running log)
