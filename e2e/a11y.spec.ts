import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Public routes that don't require authentication.
const routes = ['/', '/auth/login', '/auth/sign-up', '/auth/forgot-password'];

for (const route of routes) {
  test(`a11y: ${route} has no detectable WCAG A/AA violations`, async ({
    page,
  }) => {
    await page.goto(route);

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(results.violations).toEqual([]);
  });
}
