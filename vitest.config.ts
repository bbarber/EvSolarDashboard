import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Resolve the "@/*" tsconfig path alias natively (no vite-tsconfig-paths plugin needed).
  resolve: { tsconfigPaths: true },
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // Unit/component tests live next to source as *.test.ts(x).
    // Playwright owns e2e/ — keep the two runners from picking up each other's files.
    include: ['**/*.{test,spec}.{ts,tsx}'],
    // Integration tests (*.integration.test.ts) need the real Docker stack and are
    // run separately via `pnpm run test:integration` (vitest.integration.config.ts).
    exclude: [
      'e2e/**',
      'node_modules/**',
      '.next/**',
      '**/*.integration.test.ts',
    ],
    css: true,
  },
});
