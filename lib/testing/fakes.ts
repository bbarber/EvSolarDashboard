import { vi } from 'vitest';
import type { IAuthUtility } from '@/lib/utilities/auth-utility';

/**
 * Shared unit-test fakes: service-mock factories and bogus data builders. Import
 * these from `*.test.ts` files so manager/hook tests inject consistent fakes
 * instead of hand-rolling them. (For real-Supabase integration tests, see
 * `supabase-test.ts` instead.)
 */

/** A fake auth utility with every method stubbed. Override per test. */
export function fakeAuthUtility(
  overrides: Partial<IAuthUtility> = {},
): IAuthUtility {
  return {
    getCurrentUserId: vi.fn().mockResolvedValue(null),
    signInWithPassword: vi.fn().mockResolvedValue(undefined),
    signUp: vi.fn().mockResolvedValue(undefined),
    resetPasswordForEmail: vi.fn().mockResolvedValue(undefined),
    updatePassword: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

/** A fake user accessor. Override per test. */
/** Build a bogus user profile for tests. */
/** A fake chat accessor. Override per test. */
/** Build a bogus game state for tests. */
