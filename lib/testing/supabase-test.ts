import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Integration-test helpers for the local Supabase stack. **Test-only** — nothing
 * here belongs in app code (the admin client bypasses RLS).
 *
 * Safety model: these helpers use the service-role key, which can read and delete
 * any row. {@link assertLocalSupabase} refuses to run against anything but the
 * local Docker stack, so a stray/hosted URL can never be wiped by a test.
 */

/** Throw unless `url` points at the local Docker stack (127.0.0.1 / localhost). */
export function assertLocalSupabase(url: string): void {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Invalid Supabase URL for integration tests: ${url}`);
  }
  const isLocal =
    host === '127.0.0.1' || host === 'localhost' || host === '::1';
  if (!isLocal) {
    throw new Error(
      `Refusing to run integration tests against non-local Supabase: ${url}\n` +
        'These tests use the service-role key and are destructive — local Docker only. ' +
        'Run them via `pnpm run test:integration`.',
    );
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing ${name}. Integration tests must be launched via \`pnpm run test:integration\`, ` +
        'which sources local credentials from `supabase status`.',
    );
  }
  return value;
}

/**
 * Service-role client for the local stack — **bypasses RLS**. Use only for test
 * setup/teardown (creating and deleting users, seeding rows), never to assert the
 * behavior under test. Guarded to local URLs.
 */
export function adminClient(): SupabaseClient {
  const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  assertLocalSupabase(url);
  return createClient(url, requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

let seq = 0;

/**
 * Create a confirmed auth user via the admin API. The `handle_new_user` trigger
 * auto-populates `public.userprofiles`. Returns the user id and a matching set of
 * sign-in credentials. Emails are unique per call so tests don't collide across
 * runs (no DB reset needed between local runs).
 */
export async function createTestUser(
  admin: SupabaseClient,
  meta: { first_name?: string; last_name?: string } = {},
): Promise<{ id: string; email: string; password: string }> {
  const email = `it-${Date.now()}-${seq++}@example.com`;
  // Satisfies config.toml's password policy (length >= 8, lower+upper+digits).
  const password = 'Test-Password-123';
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: meta,
  });
  if (error) throw error;
  if (!data.user) {
    throw new Error(`createUser succeeded but returned no user for ${email}.`);
  }
  return { id: data.user.id, email, password };
}
