# {{APP_NAME}}

{{APP_DESCRIPTION}}

[![CI](https://github.com/{{OWNER}}/{{REPO}}/actions/workflows/ci.yml/badge.svg)](https://github.com/{{OWNER}}/{{REPO}}/actions/workflows/ci.yml)
[![Deploy migrations](https://github.com/{{OWNER}}/{{REPO}}/actions/workflows/deploy-migrations.yml/badge.svg)](https://github.com/{{OWNER}}/{{REPO}}/actions/workflows/deploy-migrations.yml)

## Environments

| Environment       | App                   | Supabase                            |
| ----------------- | --------------------- | ----------------------------------- |
| Production        | `<production-app-url>` | `<production-supabase-dashboard-url>` |
| Preview / Staging | `<vercel-preview-url>` | `<staging-supabase-dashboard-url>`    |

> Fill these in once your Vercel project and hosted Supabase project(s) exist. See
> [`documentation/deployment.md`](./documentation/deployment.md).

## Local development

**Prerequisites:** Node 24 (pinned in `mise.toml` — run `mise install` if you use
[mise](https://mise.jdx.dev/), otherwise install Node 24 yourself) and a Docker runtime
(Docker Desktop, OrbStack, Rancher, or Podman) running.

```bash
pnpm install        # also installs the git pre-commit hook
pnpm run setup      # local Supabase (Docker) + .env.local + db reset + Playwright browsers
pnpm run dev        # http://localhost:3000
```

Supabase Studio runs at http://127.0.0.1:54323.

## Scripts

| Script                                  | What it does                                       |
| --------------------------------------- | -------------------------------------------------- |
| `pnpm run dev` / `build` / `start`       | Next.js dev / production build / serve             |
| `pnpm run setup`                         | One-shot local bootstrap (Docker + env + db reset) |
| `pnpm run db:start` / `db:stop`          | Start / stop the local Supabase Docker stack       |
| `pnpm run db:reset`                      | Re-apply all migrations + `supabase/seed.sql`      |
| `pnpm run db:new <name>`                 | Create a new timestamped migration                 |
| `pnpm run db:status`                     | Show local stack status + credentials              |
| `pnpm run lint` / `typecheck`            | ESLint / `tsc --noEmit`                            |
| `pnpm run format` / `format:check`       | Prettier write / check                             |
| `pnpm run test:unit` / `test:unit:watch` | Vitest (unit + component)                          |
| `pnpm run test:e2e` / `test:e2e:ui`      | Playwright (desktop + iPhone, incl. a11y)          |

## Database & migrations

Schema lives in `supabase/migrations/` (version-controlled) and seed data in
`supabase/seed.sql`. Create a migration with `pnpm run db:new <name>`, edit the generated
SQL, then `pnpm run db:reset` to apply locally. Every table must have **RLS enabled with
explicit policies** — the `.claude/skills/supabase-migration/` skill scaffolds this for you.

## Deployment

The app deploys on **Vercel** (PR previews + production on `main`); database migrations
deploy via **GitHub Actions** (`.github/workflows/deploy-migrations.yml`). Environment
setup, CI secrets, and the hosted Auth URL configuration are documented in
[`documentation/deployment.md`](./documentation/deployment.md).

## Documentation

- [Local development](./documentation/local-development.md) — Docker/Supabase stack, ports,
  troubleshooting
- [Deployment](./documentation/deployment.md) — environments, CI secrets, migration deploys
- [Credentials & secrets](./documentation/credentials.md) — what each key/token is and where
  it goes

Agent guidance lives in [`CLAUDE.md`](./CLAUDE.md).

---

Created from the Next.js + Supabase template. `TEMPLATE.md` and `CUSTOMIZATIONS.md` describe
how the template was built — safe to delete once you've made this project your own.
