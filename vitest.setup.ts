// Dummy Supabase env so `lib/env` validation passes when a unit test
// transitively imports the Supabase client. Unit tests mock/inject Supabase, so
// these values are never actually used. `??=` keeps real values (e.g. in CI).
process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'http://127.0.0.1:54321';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= 'test-anon-key';

import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Unmount React trees and reset the DOM between tests.
afterEach(() => {
  cleanup();
});
