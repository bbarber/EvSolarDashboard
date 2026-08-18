import { test, expect } from '@playwright/test';

/**
 * End-to-end auth flow against the real local stack: sign up, verify the
 * proxy guards the game, then log in and land on the daily puzzle.
 *
 * Relies on `enable_confirmations = false` in supabase/config.toml (local), so a
 * freshly signed-up account can log in without an email round-trip.
 *
 * Runs on Chromium only: WebKit's password-autofill heuristic asynchronously
 * clears synthetic form fills, making programmatic sign-up flaky (a real Safari
 * user typing is unaffected). The auth flow logic is browser-agnostic, and
 * WebKit rendering/a11y of the auth pages is covered by `a11y.spec.ts`.
 */
test('sign up, get redirected off the game while signed out, then log in', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'WebKit autofill clears synthetic form fills; rendering covered by a11y.spec',
  );

  // Unique per test so reruns never collide on "already registered".
  const email = `e2e-${crypto.randomUUID()}@example.com`;
  const password = 'Password123!';

  // --- Sign up ---
  await page.goto('/auth/sign-up');
  await page.getByLabel('First name').fill('E2E');
  await page.getByLabel('Last name').fill('Tester');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Repeat Password').fill(password);
  await page.getByRole('button', { name: 'Sign up' }).click();

  await expect(page.getByText('Thank you for signing up!')).toBeVisible();

  // --- The proxy guards /game when signed out ---
  await page.context().clearCookies();
  await page.goto('/game');
  await expect(page).toHaveURL(/\/auth\/login/);

  // --- Log in and land on the daily puzzle ---
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Login' }).click();

  await expect(page).toHaveURL(/\/game/);
  await expect(page.getByLabel('Your guess')).toBeVisible();
});
