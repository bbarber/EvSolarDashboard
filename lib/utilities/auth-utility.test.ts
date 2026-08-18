import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the Supabase browser client so we can exercise the claim-handling logic.
const getClaims = vi.fn();
vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({ auth: { getClaims } }),
}));

import { AuthUtility } from '@/lib/utilities/auth-utility';

describe('AuthUtility.getCurrentUserId', () => {
  beforeEach(() => getClaims.mockReset());

  it('returns the sub claim when present', async () => {
    getClaims.mockResolvedValue({
      data: { claims: { sub: 'user-123' } },
      error: null,
    });
    expect(await new AuthUtility().getCurrentUserId()).toBe('user-123');
  });

  it('returns null on error', async () => {
    getClaims.mockResolvedValue({ data: null, error: new Error('boom') });
    expect(await new AuthUtility().getCurrentUserId()).toBeNull();
  });

  it('returns null when there are no claims', async () => {
    getClaims.mockResolvedValue({ data: { claims: null }, error: null });
    expect(await new AuthUtility().getCurrentUserId()).toBeNull();
  });
});
