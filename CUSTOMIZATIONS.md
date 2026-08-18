# Template Customizations

A curated checklist of the durable changes that turn the stock **Supabase + Next.js**
starter into this workable template — re-apply (or expect) these when bootstrapping again.

This is **not** a changelog. For the blow-by-blow history — bug fixes, dependency bumps,
wording tweaks, "fixed X" — see `git log`. Entries here describe *what* the customization is
and *why*, not every step taken to land it.

## 1. Stop ESLint from linting the `.next` build directory

- **File:** `eslint.config.mjs`
- **What:** Added a global `ignores` block so build/output dirs are skipped (`.next/**`,
  `node_modules/**`, `out/**`, `build/**`, plus `playwright-report/**`, `test-results/**`).
- **Why:** `lint` is `eslint .`, which otherwise crawls generated files and floods output.
- **Note:** In flat config, an object with *only* `ignores` sets global ignores.

## 2. Playwright MCP server for Claude Code

- **File:** `.mcp.json` (checked in, so it's shared).
  ```json
  { "mcpServers": { "playwright": { "command": "npx", "args": ["@playwright/mcp@latest"] } } }
  ```
- **Why:** Gives Claude browser-automation tools scoped to this project.
- **Note:** Claude Code prompts to approve project MCP servers on first use.

## 3. Playwright E2E scaffolding

- **Install:** `@playwright/test` + `pnpm exec playwright install chromium`.
- **Files:** `playwright.config.ts` (`testDir: ./e2e`, HTML reporter, and a `webServer` that
  runs `pnpm run dev` — reuses a running server locally, fresh in CI); `e2e/home.spec.ts`.
- **Scripts:** `test:e2e`, `test:e2e:ui`.
- **`.gitignore`:** `/test-results`, `/playwright-report`, `/blob-report`, `/playwright/.cache`.
- **Why:** `pnpm run test:e2e` boots the app and tests it with no manual steps.

## 4. Accessibility (a11y) testing with axe-core

- **Install:** `@axe-core/playwright`.
- **File:** `e2e/a11y.spec.ts` — scans public routes (`/`, `/auth/login`, `/auth/sign-up`,
  `/auth/forgot-password`) with `AxeBuilder`, WCAG 2.0/2.1 A & AA, asserting zero violations.
- **Recurring stock-template fix:** `components/theme-switcher.tsx`'s dropdown trigger was an
  icon-only button with no accessible name (axe `button-name`, critical). Added
  `aria-label="Select theme"`. **Expect to re-apply this on a fresh template.**
- **Note:** Automated scans catch ~30–50% only; still do manual keyboard / screen-reader testing.

## 5. Desktop + iPhone viewports

- **Install:** `pnpm exec playwright install webkit` (required for iPhone devices).
- **File:** `playwright.config.ts` — two projects:
  ```ts
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } }, // Chromium, 1280x720
    { name: "iphone",  use: { ...devices["iPhone 15"] } },       // WebKit, 393x659, touch
  ],
  ```
- **Why:** Catches responsive-layout breaks and real Safari/iOS rendering bugs.
- **Note:** Every spec runs once per project. iPhone uses **WebKit** (hence the extra
  install). Run one with `--project=iphone` / `--project=desktop`.

## 6. Unit tests, typecheck, formatting, typed env

New `package.json` scripts: `typecheck`, `format`, `format:check`, `test:unit`, `test:unit:watch`.

### 6a. Vitest + React Testing Library

- **Install:** `vitest @vitejs/plugin-react jsdom @testing-library/react`
  `@testing-library/jest-dom @testing-library/user-event`.
- **Files:** `vitest.config.ts` (jsdom, `setupFiles`, `include: **/*.{test,spec}.{ts,tsx}`,
  **`exclude: ["e2e/**", ...]`** so Vitest and Playwright don't pick up each other's files;
  `resolve: { tsconfigPaths: true }` for the `@/*` alias — no `vite-tsconfig-paths` needed);
  `vitest.setup.ts` (jest-dom + RTL `cleanup()`; also sets dummy `NEXT_PUBLIC_SUPABASE_*` via
  `??=` so tests that transitively import the Supabase client don't trip `lib/env`).
- **Note:** Tests import `{ describe, it, expect }` from `vitest` (globals off).

### 6b. `typecheck` — `tsc --noEmit`

- **Why:** Catches what lint can't. Lint (`next/typescript`) is non-type-aware; Vitest strips
  types without checking (esbuild). This is the only gate verifying type soundness.

### 6c. Prettier + pre-commit hook

- **Install:** `prettier prettier-plugin-tailwindcss eslint-config-prettier husky lint-staged`.
- **Files:** `.prettierrc.json` (single quotes, trailing commas, Tailwind class sorting;
  `prettier-plugin-tailwindcss`); `.prettierignore` (build dirs, lockfile, `*.md`, `*.sql`,
  `*.toml`, `supabase/`); `eslint-config-prettier` appended (last) to `eslint.config.mjs`;
  `.husky/pre-commit` → `pnpm exec lint-staged`; `.lintstagedrc.json` (`eslint --fix` + `prettier
  --write` for `*.{ts,tsx}`, `prettier --write` for other formats); `"prepare": "husky"`.
- **Convention:** Prettier owns formatting; ESLint owns code quality. Format-on-save =
  Prettier only; ESLint `--fix` runs at commit, not on save.

### 6d. Typed env validation — `@t3-oss/env-nextjs` + `zod`

- **File:** `lib/env.ts` — validates `NEXT_PUBLIC_SUPABASE_URL` (`z.url()`) and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (non-empty); stubbed `server` block; bypass with
  `SKIP_ENV_VALIDATION=1`. All Supabase clients import `env`, never `process.env`.
- **Note:** `NEXT_PUBLIC_*` vars must be listed in `runtimeEnv` explicitly.

## 7. Convert to a reusable template

A GitHub **template repository**: clone → `pnpm install` → `pnpm run setup` → working local
project (Supabase backend in Docker via the CLI, Next.js on host).

### 7a. Boilerplate removal

- Deleted the tutorial/marketing components (`hero`, `deploy-button`, `env-var-warning`,
  `next-logo`, `supabase-logo`, the whole `components/tutorial/`); reduced `app/page.tsx` to a
  minimal landing; stripped tutorial/branding from `protected/layout.tsx`, `protected/page.tsx`,
  and `app/layout.tsx` metadata. **Kept** all auth flows/forms, `confirm` route, theme
  switcher, `components/ui/*`.

### 7b. Supabase local dev (Docker via CLI)

- `supabase` dev dependency; `supabase init` → `supabase/config.toml` + `supabase/seed.sql`
  (schema starts empty).
- `scripts/setup.mjs` (`pnpm run setup`): checks Docker, ensures `.env.local`, `supabase start`,
  writes the local API URL + publishable key into `.env.local` (quote-stripped), `db reset`.
- Scripts: `setup`, `db:start`, `db:stop`, `db:reset`, `db:status`, `db:new`.

### 7c. Template-ization

- `package.json` `name` set; `.env.example` rewritten (local auto-fill vs hosted vs
  `SKIP_ENV_VALIDATION`); README replaced with quick-start + "Bring your own Supabase"
  (`supabase link` + `db push`).
- **Manual one-time step:** mark the GitHub repo as a Template Repository in Settings.

### 7d. Claude skill: `supabase-migration`

- `.claude/skills/supabase-migration/SKILL.md` — scaffolds a migration (`db:new`), table DDL,
  **RLS enabled + explicit per-operation policies**, optional seed, then `db reset`. Ships in
  the template so every project inherits it.

### 7e. CI/CD — GitHub Actions

- `.github/workflows/ci.yml`, on push(main)/PR (skips `**/*.md` + `documentation/**` via
  `paths-ignore`):
  - **quality:** `pnpm install --frozen-lockfile` → lint → format:check → typecheck → test:unit → build
    (`SKIP_ENV_VALIDATION=1`).
  - **e2e:** `pnpm run setup` (boots local Supabase + writes a valid `.env.local`, reusing
    `setup.mjs`) → `playwright install --with-deps chromium webkit` → `test:e2e` →
    `pnpm run db:stop` → upload `playwright-report`.

## 8. Pin the toolchain with mise (Node 24)

- `mise.toml` — `[tools] node = "24"` (optional; mise users get it via `mise install`).
- Aligned to Node 24: CI `setup-node`, README prerequisites, `package.json` `engines`.

## 9. Migration deploy workflow (staging auto / prod manual)

- `.github/workflows/deploy-migrations.yml` — `supabase link` + `supabase db push` via
  `supabase/setup-cli@v1`. **staging** on merge to `main` (filtered to `supabase/migrations/**`);
  **production** on `workflow_dispatch`. `concurrency` serializes deploys per target.
- Uses **GitHub Environments** (`staging`/`production`) for per-target `SUPABASE_PROJECT_ID` +
  `SUPABASE_DB_PASSWORD`; `SUPABASE_ACCESS_TOKEN` is a repo secret. Prod can require a reviewer.

## 10. Documentation folder + agent guidance (CLAUDE.md)

- `documentation/` (deeper guides, keeps README trim): `setting-up-with-claude.md` (agent
  runbook, CLI/MCP-first), `local-development.md`, `deployment.md` (human reference,
  portal-first).
- Root **`CLAUDE.md`** — agent entry point: conventions, commands, bootstrap flow, required
  CLIs, and **what needs a human portal click**.

## 11. Vercel MCP + hosting (Git integration)

- `.mcp.json` — **Vercel MCP** (`https://mcp.vercel.com`, remote OAuth, no secret committed).
- **Supabase MCP intentionally NOT committed** — "never connect to production," hosted-only
  (local dev uses the CLI), needs a token. Opt-in (read-only, dev-scoped) is documented.
- **Hosting = native Git integration** (PR previews + prod on `main`); GitHub Actions stays
  scoped to tests + migrations. Preview→staging / Production→prod Supabase.
- **Vercel CLI stays global/`npx`, not a devDep** — it's not in any script/CI (deploys are
  Git-driven), so it stays out of the dependency tree. (Rule: in a script/CI → devDep;
  ad-hoc setup → external.)

## 12. Dependency override: postcss ≥ 8.5.10

- Next bundles an older `postcss` than the rest of the tree, which `pnpm audit` flags
  (GHSA-qx2v-qp2m-jg93). Force it up with a pnpm override. As of pnpm 10+, overrides live in
  `pnpm-workspace.yaml` (no longer the `pnpm` field in `package.json`); keep the range in sync
  with the `postcss` devDependency:
  ```yaml
  # pnpm-workspace.yaml
  overrides:
    postcss: ^8.5.10
  ```
- **Do not** `pnpm audit --fix` your way into downgrading Next. Remove the override once Next
  bundles postcss ≥ 8.5.10.

## 13. Example feature: `userprofiles` table + nickname

- Migration `supabase/migrations/<ts>_create_userprofiles.sql` (built with the
  `supabase-migration` skill):
  - `public.userprofiles` (id → `auth.users(id)` cascade, `nickname`, timestamp); **RLS** with
    select/update policies scoped to `auth.uid() = id`.
  - `handle_new_user()` — **security definer, `set search_path = ''`**, fully-qualified refs —
    auto-creates a profile on signup. Nickname = first initial of `first_name` + full
    `last_name`, **stored lowercase** ("John Smith" → "jsmith"); null-safe with fallbacks
    (last name → first initial → email local-part); `on conflict do nothing`; idempotent trigger.
- `components/sign-up-form.tsx` collects First/Last name → passed as `raw_user_meta_data`.
- The nickname is surfaced on `/protected` (see #14).

## 14. Layered architecture + testing rule

For non-trivial data features (documented as a rule in `CLAUDE.md`):

- `lib/accessors/*` — encapsulate data access; **the only place Supabase/queries live**. Thin,
  interface-backed (e.g. `IUserAccessor`).
- `lib/utilities/*` — cross-cutting helpers; `auth-utility` is where claims/current-user access
  goes.
- `lib/managers/*` — orchestrate utilities + accessors (business logic); depend on **interfaces**
  via constructor injection (default to real impls; export a singleton).
- `hooks/*` — call a **manager** (never an accessor/Supabase); expose `{ data, loading, error }`.
- Flow: component → hook → manager → accessor/utility → Supabase. (`use-user-profile` →
  `UserManager` → `UserAccessor`/`AuthUtility`; `components/user-nickname.tsx` client island on
  the `/protected` server page; page-level auth stays in middleware.)
- **Rule:** doc-comment (JSDoc) and **fully unit-test managers + utilities** (inject fakes);
  accessors are generally exempt (testing them just tests the mocks).

## 15. Security hardening (audit remediation)

- **Open redirect fixed** in `app/auth/confirm/route.ts`: the `next` param is validated by
  `lib/utilities/url-utility.ts#safeRedirectPath` (must be a rooted, same-origin path — rejects
  `//`, `://`, backslashes); error text is `encodeURIComponent`'d before going into a URL.
- **Security response headers** added in `next.config.ts` `headers()`: HSTS, `X-Frame-Options`,
  `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and a **CSP starting point**
  (permissive — allows inline scripts; tighten to a nonce per project; see `deployment.md`).

## 16. Auth flows moved into the layered architecture

- **Was:** the five auth components called `supabase.auth.*` directly and rendered raw Supabase
  error strings — violating the layering the template teaches, and leaking error internals.
- **Now:** component → `hooks/use-auth` → `lib/managers/auth-manager` (password-match validation +
  error normalization; returns a discriminated `AuthResult`) → `lib/utilities/auth-utility` (the
  only caller of `supabase.auth.*`). `lib/utilities/error-utility#normalizeAuthError` maps known
  auth errors to friendly copy with a generic fallback. Post-auth redirect centralized in
  `lib/site.ts#AUTH_REDIRECT_PATH`; the utility owns the Supabase `emailRedirectTo`/`redirectTo`
  URLs so nothing above it deals with them. Unit tests inject shared fakes from
  `lib/testing/fakes.ts` (service-mock factories + a `fakeUserProfile` builder);
  `components/login-form.test.tsx` is the worked component-test example; `e2e/auth.spec.ts`
  covers sign-up → protect → login (Chromium only — WebKit autofill clears synthetic fills).
- Added proper `autoComplete` attributes to the auth inputs (`given-name`, `family-name`,
  `email`, `new-password`/`current-password`) — better password-manager behavior and a11y.

## 17. Generated database types

- `pnpm run db:types` writes the generated types; the Supabase clients are typed `<Database>`
  and `UserProfile` is derived via `Pick<Database['public']['Tables']['userprofiles']['Row'], …>`
  so it can't drift from the schema. Regenerate after every migration.
- Since #20 the generated file is `supabase/functions/_shared/database.types.ts` (inside the
  Deno tree, importable by edge functions); `lib/database.types.ts` is a hand-written re-export
  so app code keeps its stable import path.

## 18. Package manager → pnpm; pinned dependencies

- Migrated npm → **pnpm**: `packageManager` pin in `package.json`, settings in
  `pnpm-workspace.yaml` (`overrides`, and `allowBuilds: {sharp, unrs-resolver}` since pnpm 11
  blocks dependency build scripts by default and fails `--frozen-lockfile` on un-decided ones);
  all CI workflows, `scripts/*.mjs`, and docs use `pnpm`;
  `.husky/pre-commit` → `pnpm exec lint-staged`. (No `.npmrc` — pnpm's defaults already cover
  auto-install-peers / non-strict peers, and stray pnpm keys there make npm/npx warn.)
- Pinned the previously-`latest` deps to the newest release ≥ ~1 month old (a settle window):
  `next@^16.2.7`, `@supabase/supabase-js@^2.106.2`, `@supabase/ssr@^0.10.3`; CI action
  `supabase/setup-cli@v2.1.1` (was floating `@v2` + `version: latest`).

## 19. Next.js 16 (the version the template was written for)

The stock code uses Next **16** conventions — the request interceptor is `proxy.ts` (exporting
`proxy`, the successor to `middleware.ts`) and `next.config.ts` sets top-level
`cacheComponents: true` (Partial Prerendering). Next 16 has been stable since Oct 2025, so the
settle-window pin lands on 16.x rather than the last 15.x. Two things this depends on:

- **The proxy must run.** Verify with `pnpm build`: the output should list `ƒ Proxy (Middleware)`.
  If it doesn't, `/protected` isn't protected and sessions aren't refreshed — `e2e/auth.spec.ts`
  guards exactly this (sign-up → hit `/protected` signed-out → expect redirect to login).
- **ESLint uses eslint-config-next's flat config directly** (`eslint.config.mjs` spreads
  `eslint-config-next/core-web-vitals` + `/typescript`). Next 16 ships flat config natively;
  wrapping it in the old `FlatCompat`/`@eslint/eslintrc` shim throws a circular-structure error,
  so that dep was dropped. Its stricter `react-hooks/set-state-in-effect` rule flags the
  next-themes mount guard in `theme-switcher.tsx` — kept with a targeted `eslint-disable` + reason.

## 20. Supabase Edge Functions (Deno) — structure, testing, CI

- **Layout:** functions in `supabase/functions/<name>/index.ts`; runtime-agnostic shared code
  (business logic, wire DTOs, generated DB types) in `supabase/functions/_shared/`; bare
  specifiers resolved by `supabase/functions/import_map.json` (Deno) and `node_modules` (Node)
  — `deno.json` and `config.toml` both point at that one map. Example function: `hello-user`
  (JWT-verified, caller-scoped RLS read, zod-validated body).
- **Toolchain fencing:** tsc + ESLint exclude `supabase/functions/`; `pnpm run functions:check`
  / `functions:lint` (Deno, installed via `mise`) own it; Prettier still owns formatting
  (deno fmt disabled in `deno.json`; `.prettierignore` narrowed from `supabase/` to just CLI
  temp dirs + the generated types file). Editor LSPs scoped to the tree: VS Code via
  `.vscode/settings.json` `deno.enablePaths`; Zed via nested local settings
  (`supabase/functions/.zed/settings.json` — Deno on, TS servers off, subtree only).
- **Testing (no third runner):** pure logic unit-tested by Vitest inside `_shared/`; endpoints
  black-box-tested over HTTP from `supabase/functions-tests/*.integration.test.ts` —
  `scripts/test-integration.mjs` now starts/stops `supabase functions serve` around the run
  (`supabase start` alone doesn't serve functions). `supabase/tests/` is left free for pgTAP.
- **CI/deploy:** ci.yml quality job runs `deno lint` + `deno check` (via `denoland/setup-deno`);
  deploy-migrations.yml also runs `supabase functions deploy` (guarded no-op when no functions)
  and triggers on `supabase/functions/**` + `config.toml`. Function secrets via
  `supabase secrets set`, never in repo/CI.
- **Why:** functions are the template's home for privileged/scheduled server-side code (service
  role, external APIs, cron targets) — the Next app never holds the service-role key.
- **Skill:** `.claude/skills/supabase-edge-function/` scaffolds new functions per these rules.

---

## Reference: Playwright lifecycle hooks for DB seeding & reset

Design notes for when this is backed by **Supabase** (run locally via Docker) and,
eventually, blob storage (Vercel or Azure — deferred). Not yet scaffolded; captured here
so the plan survives. Hooks listed broadest (once per run) → narrowest (per test).

### 1. Global setup/teardown — once per entire run
Two ways:
- **Project dependencies (recommended).** A `setup` project that other projects list in
  `dependencies`, plus an optional `teardown` project. Runs *as real tests*, so you get
  traces, fixtures, and HTML-report visibility.
  ```ts
  projects: [
    { name: "db setup",    testMatch: /global\.setup\.ts/, teardown: "db teardown" },
    { name: "db teardown", testMatch: /global\.teardown\.ts/ },
    { name: "desktop", use: {/* ... */}, dependencies: ["db setup"] },
    { name: "iphone",  use: {/* ... */}, dependencies: ["db setup"] },
  ]
  ```
- **`globalSetup` / `globalTeardown` config functions.** Simpler, but no tracing/fixtures.

  *Use for:* `supabase db reset` (re-runs migrations + `supabase/seed.sql`) to get a known
  baseline once; create the storage bucket; tear down at the end. `db reset` is slow
  (seconds) — once-per-run only, **never** between tests.

### 2. `webServer` — boots services before the run
Already used for `next dev`. It accepts an array, so additional entries can wait on the
Supabase API being up before tests start (alternatively keep Supabase lifecycle in
`globalSetup`).

### 3. `beforeAll` / `afterAll` — once per worker, per file
`test.beforeAll(...)`. Fine for per-file expensive setup; for cross-file reuse, prefer
fixtures.

### 4. Fixtures — the idiomatic mechanism (`test.extend`)
Code before `await use(x)` is setup; code after is teardown. Two scopes:
- **Worker-scoped** (`{ scope: "worker" }`): runs once per worker, reused across that
  worker's tests. Home for an expensive-per-worker resource — e.g. give each worker its
  own schema/namespace so parallel workers don't collide.
- **Test-scoped** (default): runs around every test. Home for per-test seed data + cleanup.
- `{ auto: true }` applies a fixture to every test without naming it — handy for
  "always start from a clean slate."
  ```ts
  export const test = base.extend<{ seed: SeededData }>({
    seed: async ({}, use) => {
      const data = await seedRows();   // setup: insert
      await use(data);
      await cleanupRows(data);         // teardown: delete what I made
    },
  });
  ```

### 5. `beforeEach` / `afterEach` — around each test
Same timing as a test-scoped fixture. Use a fixture when you want to return a value into
the test and bundle its teardown; use `beforeEach` for plain side effects.

### The caveat that drives the design: parallelism vs. one shared DB
Playwright runs files in parallel across workers (`fullyParallel: true`). A single Supabase
Postgres is **shared mutable state** — parallel tests stomp each other if they all
reset/seed the same tables. Options:
1. **Per-worker isolation (best).** Worker-scoped fixture namespaces data by
   `testInfo.workerIndex` / `parallelIndex` — separate schema, tenant, or row prefix.
   Stays parallel, no collisions.
2. **Per-test cleanup, not full reset.** Each test deletes only the rows it created. Fast,
   but requires discipline. Truncate-between-tests forces serialization.
3. **Serialize the DB project.** `fullyParallel: false` + `workers: 1` for those tests +
   `supabase db reset` between. Simplest, slowest. Fine for a small suite.

Clean common pattern: `supabase db reset` once in **global setup** for baseline
schema/seed → **worker-scoped fixtures** for isolation → **test-scoped fixtures** for
per-test rows with teardown. Never `db reset` between tests (too slow).

### Blob storage (deferred: Vercel or Azure)
Maps onto the same layers: create/empty the bucket in global setup, clean per-test objects
in a test-scoped fixture. Locally, point at an emulator (Azurite for Azure, or Supabase
Storage's S3-compatible endpoint) rather than the real cloud.

### Docs
- Global setup and teardown — https://playwright.dev/docs/test-global-setup-teardown
- Fixtures — https://playwright.dev/docs/test-fixtures
- Parallelism (workers, fullyParallel) — https://playwright.dev/docs/test-parallel
