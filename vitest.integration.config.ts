import { defineConfig } from 'vitest/config';

// Integration tests run the REAL Supabase stack (local Docker) — no mocks.
// They are intentionally separate from the unit suite:
//   - launched only via `pnpm run test:integration`, which starts from
//     `scripts/test-integration.mjs` (Docker check + localhost guard + real creds).
//   - excluded from `vitest.config.ts` so `pnpm run test:unit` never touches Docker.
//
// jsdom (not node) so `@supabase/ssr`'s browser client has a `document.cookie` to
// store the session in — that's how a test signs a user in and then exercises an
// accessor whose internal client reads the same cookie. `fileParallelism: false`
// because every file shares one database.
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    include: ['**/*.integration.test.ts'],
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // No setupFiles: we want the REAL env the runner exported, not the dummy
    // values in vitest.setup.ts.
  },
});
