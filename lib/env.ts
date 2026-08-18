import { createEnv } from '@t3-oss/env-nextjs';
import { z } from 'zod';

/**
 * Typed, validated environment variables.
 *
 * Import `env` instead of reading `process.env` directly — access is type-safe and
 * misconfiguration fails fast at startup/build instead of as a vague runtime error.
 *
 * - `server`: server-only secrets (never exposed to the browser).
 * - `client`: must be prefixed `NEXT_PUBLIC_` to be inlined into client bundles.
 *
 * Set `SKIP_ENV_VALIDATION=1` to bypass (e.g. Docker builds without real values).
 */
export const env = createEnv({
  server: {},
  client: {
    NEXT_PUBLIC_SUPABASE_URL: z.url(),
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  },
  // Next.js inlines NEXT_PUBLIC_* at build time, so client vars must be listed
  // explicitly rather than destructured from a runtime process.env.
  runtimeEnv: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  },
  emptyStringAsUndefined: true,
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
});
