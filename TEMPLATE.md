# Next.js + Supabase Template

An opinionated starter for building apps with **Next.js (App Router)** and **Supabase**,
with local development fully on Docker via the Supabase CLI. Batteries included: typed env
validation, auth flows, unit + e2e + accessibility tests, linting, formatting, and
pre-commit hooks.

> **Created from a template?** Run `pnpm run init` once to name your project: it rewrites the
> placeholders (`package.json`, `lib/site.ts`), swaps this README for a project skeleton with
> status badges + an environments table, and moves this template-about content to
> `TEMPLATE.md`. After that, follow the quick start below.

## Quick start

**Prerequisites:** Node 24 and Deno 2 (both pinned in `mise.toml` — run `mise install` if you
use [mise](https://mise.jdx.dev/), otherwise install them yourself; Deno is only needed for
Supabase Edge Functions in `supabase/functions/`), **pnpm** (this repo pins it via
`package.json`'s `packageManager` field — enable it with `corepack enable pnpm`, or get it
from `mise install`), and a Docker runtime (Docker Desktop, OrbStack, Rancher, or Podman)
running.

```bash
# 1. Create your repo from this template ("Use this template" on GitHub), then clone it.
git clone <your-new-repo-url> && cd <your-new-repo>

# 2. Install dependencies (also installs the git pre-commit hook).
pnpm install

# 3. Name your project (once): rewrites placeholders + generates a project README.
pnpm run init                  # or: pnpm run init -- "My App"

# 4. Bootstrap local Supabase + .env.local (Docker, migrations + seed, Playwright browsers).
pnpm run setup

# 5. Run the app.
pnpm run dev        # http://localhost:3000
```

`pnpm run setup` starts the local Supabase stack in Docker, writes the local API URL +
publishable key into `.env.local`, and runs `db reset`. Supabase Studio is at
http://127.0.0.1:54323.

## Scripts

| Script | What it does |
| --- | --- |
| `pnpm run dev` / `build` / `start` | Next.js dev / production build / serve |
| `pnpm run setup` | One-shot local bootstrap (Docker + env + db reset) |
| `pnpm run db:start` / `db:stop` | Start / stop the local Supabase Docker stack |
| `pnpm run db:reset` | Re-apply all migrations + `supabase/seed.sql` |
| `pnpm run db:new <name>` | Create a new timestamped migration |
| `pnpm run db:types` | Regenerate `lib/database.types.ts` from the local schema |
| `pnpm run db:status` | Show local stack status + credentials |
| `pnpm run lint` / `typecheck` | ESLint / `tsc --noEmit` |
| `pnpm run format` / `format:check` | Prettier write / check |
| `pnpm run test:unit` / `test:unit:watch` | Vitest (unit + component) |
| `pnpm run test:e2e` / `test:e2e:ui` | Playwright (desktop + iPhone, incl. a11y) |

## Database & migrations

Schema lives in `supabase/migrations/` (version-controlled) and seed data in
`supabase/seed.sql`. Create a migration with `pnpm run db:new <name>`, edit the generated
SQL, then `pnpm run db:reset` to apply locally.

> **Tip:** this repo ships a Claude Code skill at `.claude/skills/supabase-migration/` that
> scaffolds a migration **with RLS enabled and policies** — ask Claude to "add a migration
> for a `notes` table".

## Edge Functions

Server-side code that must not live in the app (service-role operations, external API keys,
cron targets) goes in **Supabase Edge Functions** under `supabase/functions/` (Deno). Business
logic and DTOs live in `supabase/functions/_shared/` where Vitest unit-tests them; endpoints
get black-box integration tests in `supabase/functions-tests/`. Serve locally with
`pnpm run functions:serve`; `hello-user` is the worked example.

> **Tip:** the `.claude/skills/supabase-edge-function/` skill scaffolds a function with the
> right JWT posture, DTO split, and both test layers.

## Bring your own Supabase (hosted)

For staging/production you use a hosted Supabase project:

1. Create a project at https://app.supabase.com.
2. Copy **Project URL** and **Publishable (anon) key** from Project Settings → API into
   `.env.local` (or your host's env vars).
3. Link and push your local schema to the hosted DB:
   ```bash
   pnpm exec supabase link --project-ref <your-project-ref>
   pnpm exec supabase db push
   ```

Building without real credentials (e.g. a CI image build)? Set `SKIP_ENV_VALIDATION=1`.

### Deploying migrations (staging / production)

`.github/workflows/deploy-migrations.yml` runs `supabase db push` against hosted projects:

- **Staging** — automatically on merge to `main` (when `supabase/migrations/**` changes).
- **Production** — manually via **Actions → Deploy migrations → Run workflow**
  (`workflow_dispatch`).

It uses **GitHub Environments** so each target has its own credentials. One-time setup:

1. Repo secret (Settings → Secrets and variables → Actions): `SUPABASE_ACCESS_TOKEN`
   (a Supabase personal access token from https://app.supabase.com/account/tokens).
2. Create two Environments (Settings → Environments): `staging` and `production`. In each,
   add secrets `SUPABASE_PROJECT_ID` (project ref) and `SUPABASE_DB_PASSWORD`.
3. (Recommended) On the `production` environment, add a **required reviewer** so prod
   migration deploys wait for approval.

## Environment variables

Validated in `lib/env.ts` (via `@t3-oss/env-nextjs` + zod) — import `env` instead of
reading `process.env` directly. See `.env.example` for the full list.

## Documentation

Deeper guides live in [`documentation/`](./documentation/):

- [Setting up with Claude](./documentation/setting-up-with-claude.md) — agent runbook for
  spinning up a new project (CLIs, what's automatable, what needs a human)
- [Local development](./documentation/local-development.md) — Docker/Supabase stack, ports,
  troubleshooting
- [Deployment](./documentation/deployment.md) — environments, CI secrets, migration deploys
- [Credentials & secrets](./documentation/credentials.md) — what each key/token is and where
  it goes

Agent guidance lives in [`CLAUDE.md`](./CLAUDE.md).

## What else is set up

See [`CUSTOMIZATIONS.md`](./CUSTOMIZATIONS.md) for the full log of how this template was
built (tooling decisions, Playwright DB-lifecycle notes, and the rationale behind each
addition) — useful when re-bootstrapping or extending.

## Security

Security-relevant settings you should review per project (CSP, email confirmations, RLS) are
documented in [`.github/SECURITY.md`](./.github/SECURITY.md).
