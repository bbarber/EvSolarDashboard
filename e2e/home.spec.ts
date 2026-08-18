import { test, expect } from '@playwright/test';

test('the login page carries the site identity', async ({ page }) => {
  await page.goto('/auth/login');
  await expect(page).toHaveTitle(/EvSolar Dashboard/);
});
