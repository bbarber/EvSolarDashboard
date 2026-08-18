---
name: supabase-migration
description: Use when the user wants to add or change the database schema in this Supabase project — create a table, add a column, write a migration, or add/modify Row Level Security (RLS) policies. Ensures every new table ships with RLS enabled and explicit policies.
---

# Scaffold a Supabase migration (with RLS)

Follow these steps to add schema changes the right way for this project. The golden rule:
**every table in a public schema must have RLS enabled and explicit policies** — a table
with RLS off (or on with no policies) is a security bug.

## Steps

1. **Create the migration file.** Use a descriptive snake_case name:

   ```bash
   pnpm run db:new <name>     # e.g. pnpm run db:new create_notes
   ```

   This creates `supabase/migrations/<timestamp>_<name>.sql`. Edit that file.

2. **Write the table DDL** in the `public` schema. Prefer a `uuid` primary key, an owner
   column tying rows to the authenticated user, and timestamps:

   ```sql
   create table public.notes (
     id uuid primary key default gen_random_uuid(),
     user_id uuid not null references auth.users (id) on delete cascade,
     title text not null,
     created_at timestamptz not null default now()
   );
   ```

3. **Enable RLS** on the new table — always:

   ```sql
   alter table public.notes enable row level security;
   ```

4. **Add explicit policies.** Do not stop at enabling RLS — a table with RLS on and no
   policies denies all access. Add one policy per operation you intend to allow. For
   owner-scoped data:

   ```sql
   create policy "Users can read their own notes"
     on public.notes for select
     using (auth.uid() = user_id);

   create policy "Users can insert their own notes"
     on public.notes for insert
     with check (auth.uid() = user_id);

   create policy "Users can update their own notes"
     on public.notes for update
     using (auth.uid() = user_id)
     with check (auth.uid() = user_id);

   create policy "Users can delete their own notes"
     on public.notes for delete
     using (auth.uid() = user_id);
   ```

   For public-read data, use `using (true)` on the `select` policy instead. Match the
   policies to the access the feature actually needs — don't over-grant.

5. **Grant table privileges.** RLS decides *which rows* a role sees; `GRANT`s decide
   whether the role may touch the table **at all**. Both are required. Tables created by
   a migration are owned by `postgres` and do **not** inherit DML grants for the
   PostgREST roles (`anon` / `authenticated`), so a table with RLS + policies but no
   grants returns `permission denied` on every request — before RLS is even evaluated.
   Grant only the operations your policies allow; RLS still restricts the rows:

   ```sql
   grant select, insert, update, delete on public.notes to authenticated;
   -- add `anon` only if unauthenticated access is intended (RLS still applies):
   -- grant select on public.notes to anon;
   ```

   Skip operations that go through a trigger/function instead of the client (e.g. an
   insert done by a `security definer` signup trigger needs no insert grant).

6. **(Optional) Seed sample rows** in `supabase/seed.sql` so local/test DBs have data.
   Note: seed rows that reference `auth.users` need a user to exist first.

7. **Apply and verify:**

   ```bash
   pnpm run db:reset          # re-runs all migrations + seed against the local DB
   ```

   Confirm in Supabase Studio (http://127.0.0.1:54323) that the table exists, RLS is
   **enabled**, and the policies are listed.

8. **Add a database test if the migration adds testable behavior — this is a gate,
   not a nicety.** Ask: *does this migration do anything a test could catch regressing?*
   If yes, it must ship with an integration test (`*.integration.test.ts`, run via
   `pnpm run test:integration` against the local Docker stack — see
   `documentation/testing.md`). Things that **need** a test:

   - **RLS policies** — the highest-value case. Assert both directions: the owner can
     see/act on their row, *and* another user (or anon) cannot. A wrong `using`/`with
     check` clause is a silent data leak that no unit test or typecheck will catch.
   - **Triggers** (e.g. `handle_new_user`) — assert the derived/side-effect rows.
   - **Functions, `check` constraints, defaults, generated columns** — assert the
     computed/enforced values.

   Purely structural changes (adding a nullable column, renaming, comments) generally
   need no DB test — say so explicitly rather than skipping silently.

## Review gate (for humans and AI reviewers)

When reviewing a diff that touches `supabase/migrations/**`, treat missing tests as a
review finding: **if the migration introduces RLS policies, a trigger, a function, or a
constraint and there is no accompanying `*.integration.test.ts`, flag it and say which
behavior is untested.** CI runs `scripts/check-migration-tests.mjs` as a coarse,
non-blocking backstop (it only knows "migration changed, no test changed"); the judgment
of *whether a test is warranted* is yours. Don't rubber-stamp a policy change with no test
proving who can and can't see the data.

## Reminders

- `using` controls which existing rows are visible/affected; `with check` validates new or
  updated row values. `insert` needs `with check`; `select`/`delete` use `using`;
  `update` typically uses both.
- Migrations are immutable history — to change something already applied, add a **new**
  migration rather than editing an old one. (`pnpm run db:reset` locally re-runs from
  scratch, but hosted/teammates only get forward migrations via `supabase db push`.)
- Keep one logical change per migration; name it for what it does.
