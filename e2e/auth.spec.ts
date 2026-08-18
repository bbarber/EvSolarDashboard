import { test, expect } from '@playwright/test';

/**
 * Auth against the real local stack. This app has no self-signup — the
 * allow-list trigger on auth.users rejects any address not seeded — so the
 * flow under test is: the proxy guards the dashboard, the login form rejects
 * an unknown account with honest copy, and an allow-listed user created the
 * way production creates them (admin-side) can sign in and reach the
 * dashboard.
 */

const E2E_EMAIL = 'e2e@example.com';
const E2E_PASSWORD = 'e2e-password-1234';

test('signed out, the dashboard redirects to login', async ({ page }) => {
  await page.goto('/');
  await page.waitForURL('**/auth/login');
  await expect(page.getByRole('button', { name: /login/i })).toBeVisible();
});

test('an unknown account is rejected with honest copy', async ({ page }) => {
  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill('nobody@example.com');
  await page.getByLabel(/password/i).fill('not-a-real-password');
  await page.getByRole('button', { name: /login/i }).click();
  await expect(page.getByText(/incorrect email or password/i)).toBeVisible();
});

test('an allow-listed user can log in and see the dashboard', async ({
  page,
  browserName,
  request,
}) => {
  test.skip(
    browserName === 'webkit',
    'WebKit autofill clears synthetic form fills; rendering covered by a11y.spec',
  );

  // Create the user the way production does: admin API, service key. The local
  // stack's service key is the well-known demo JWT written by `supabase start`.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

  // Allow-list, then create; both idempotent enough for reruns.
  const allow = await request.post(
    `${supabaseUrl}/rest/v1/private_user_allowlist`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates',
      },
      data: { email: E2E_EMAIL },
    },
  );
  expect(allow.ok(), `allowlist insert: ${await allow.text()}`).toBe(true);

  const created = await request.post(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
    data: { email: E2E_EMAIL, password: E2E_PASSWORD, email_confirm: true },
  });
  const createdBody = await created.text();
  expect(
    created.ok() || createdBody.includes('already been registered'),
    `admin create: ${createdBody}`,
  ).toBe(true);

  // Split "GoTrue rejects the account" from "the form mishandles it": if this direct grant
  // fails, its body names the real reason; if it passes and the form still fails, the bug is ours.
  const grant = await request.post(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      headers: { apikey: serviceKey, 'Content-Type': 'application/json' },
      data: { email: E2E_EMAIL, password: E2E_PASSWORD },
    },
  );
  expect(grant.ok(), `direct password grant: ${await grant.text()}`).toBe(true);

  await page.goto('/auth/login');
  await page.getByLabel(/email/i).fill(E2E_EMAIL);
  await page.getByLabel(/password/i).fill(E2E_PASSWORD);
  await page.getByRole('button', { name: /login/i }).click();

  await page.waitForURL('**/');
  await expect(page.getByText(/solar today/i)).toBeVisible();
});
