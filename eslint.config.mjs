import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'build/**',
      'playwright-report/**',
      'test-results/**',
      // Next.js-generated; contains triple-slash refs it manages itself.
      'next-env.d.ts',
      // Deno's world: linted by `pnpm run functions:lint` (deno lint), not
      // ESLint. Prettier still owns formatting there (deno fmt is disabled
      // in supabase/functions/deno.json).
      'supabase/functions/**',
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Turn off ESLint rules that conflict with Prettier. Keep last.
  eslintConfigPrettier,
];

export default eslintConfig;
