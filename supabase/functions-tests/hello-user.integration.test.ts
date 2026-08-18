import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createClient,
  FunctionsHttpError,
  type SupabaseClient,
} from '@supabase/supabase-js';
import { adminClient, createTestUser } from '@/lib/testing/supabase-test';
import { helloUserResponseSchema } from '@/supabase/functions/_shared/hello-user-dto';

/**
 * Black-box integration tests for the `hello-user` Edge Function against the
 * REAL local stack — `scripts/test-integration.mjs` serves the functions for
 * the run. Why this directory exists (and not `supabase/functions/` or
 * `supabase/tests/`): documentation/testing.md → "Edge Function tests".
 *
 * Asserted here because it's what carries the risk:
 *   - JWT verification actually rejects anonymous callers (config.toml);
 *   - the function's DB reads run under the CALLER's RLS;
 *   - the response parses against the shared DTO — the parse IS the
 *     contract test.
 */
describe('hello-user edge function (integration)', () => {
  const admin = adminClient();
  const createdUserIds: string[] = [];

  async function makeSignedInClient(meta: {
    first_name: string;
    last_name: string;
  }): Promise<{ client: SupabaseClient; nickname: string }> {
    const user = await createTestUser(admin, meta);
    createdUserIds.push(user.id);
    const client = anonClient();
    const { error } = await client.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });
    if (error) throw error;
    // Trigger-computed: first initial + last name, lowercased.
    const nickname =
      `${meta.first_name[0] ?? ''}${meta.last_name}`.toLowerCase();
    return { client, nickname };
  }

  function anonClient(): SupabaseClient {
    return createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );
  }

  beforeAll(async () => {
    // Fail early and clearly if the stack isn't up (mirrors the accessor tests).
    const { error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) {
      throw new Error(
        `Local Supabase stack not reachable (${error.message}). ` +
          'Run via `pnpm run test:integration` with the stack started.',
      );
    }
  });

  afterAll(async () => {
    const results = await Promise.all(
      createdUserIds.map((id) => admin.auth.admin.deleteUser(id)),
    );
    const failures = results.filter((r) => r.error);
    if (failures.length > 0) {
      throw new Error(
        `Failed to clean up ${failures.length} test user(s): ` +
          failures.map((r) => r.error?.message).join('; '),
      );
    }
  });

  it('rejects unauthenticated calls with 401 (verify_jwt)', async () => {
    const { data, error } = await anonClient().functions.invoke('hello-user');

    expect(data).toBeNull();
    expect(error).toBeInstanceOf(FunctionsHttpError);
    const status = (error as FunctionsHttpError).context.status;
    expect(status).toBe(401);
  });

  it('greets the signed-in caller with their trigger-computed nickname', async () => {
    const { client, nickname } = await makeSignedInClient({
      first_name: 'John',
      last_name: 'Smith',
    });

    const { data, error } = await client.functions.invoke('hello-user');

    expect(error).toBeNull();
    // Parsing with the shared DTO is the contract assertion: if the function's
    // response shape drifts from `_shared/hello-user-dto.ts`, this throws.
    const body = helloUserResponseSchema.parse(data);
    expect(body).toEqual({
      message: `Hello, ${nickname}.`,
      nickname,
    });
  });

  it('honors the validated request body (loud: true)', async () => {
    const { client, nickname } = await makeSignedInClient({
      first_name: 'Alice',
      last_name: 'Adams',
    });

    const { data, error } = await client.functions.invoke('hello-user', {
      body: { loud: true },
    });

    expect(error).toBeNull();
    const body = helloUserResponseSchema.parse(data);
    expect(body.message).toBe(`HELLO, ${nickname.toUpperCase()}.`);
  });

  it('rejects a body that fails DTO validation with 400', async () => {
    const { client } = await makeSignedInClient({
      first_name: 'Bob',
      last_name: 'Baker',
    });

    const { error } = await client.functions.invoke('hello-user', {
      body: { loud: 'yes' },
    });

    expect(error).toBeInstanceOf(FunctionsHttpError);
    const status = (error as FunctionsHttpError).context.status;
    expect(status).toBe(400);
  });

  it('scopes the profile read to the caller (RLS isolation)', async () => {
    // Two users; each invocation must see only its own profile row.
    const alice = await makeSignedInClient({
      first_name: 'Ada',
      last_name: 'Lovelace',
    });
    const bob = await makeSignedInClient({
      first_name: 'Blaise',
      last_name: 'Pascal',
    });

    const [aliceRes, bobRes] = await Promise.all([
      alice.client.functions.invoke('hello-user'),
      bob.client.functions.invoke('hello-user'),
    ]);

    expect(helloUserResponseSchema.parse(aliceRes.data).nickname).toBe(
      alice.nickname,
    );
    expect(helloUserResponseSchema.parse(bobRes.data).nickname).toBe(
      bob.nickname,
    );
  });
});
