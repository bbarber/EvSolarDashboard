import { describe, it, expect, vi } from 'vitest';
import { AuthManager } from '@/lib/managers/auth-manager';
import { fakeAuthUtility } from '@/lib/testing/fakes';

describe('AuthManager', () => {
  it('signIn returns ok on success', async () => {
    const signInWithPassword = vi.fn().mockResolvedValue(undefined);
    const result = await new AuthManager(
      fakeAuthUtility({ signInWithPassword }),
    ).signIn('a@b.com', 'pw');
    expect(signInWithPassword).toHaveBeenCalledWith('a@b.com', 'pw');
    expect(result).toEqual({ ok: true });
  });

  it('signIn returns a normalized error (never the raw message)', async () => {
    const auth = fakeAuthUtility({
      signInWithPassword: vi
        .fn()
        .mockRejectedValue(new Error('Invalid login credentials')),
    });
    const result = await new AuthManager(auth).signIn('a@b.com', 'bad');
    expect(result).toEqual({
      ok: false,
      error: 'Incorrect email or password.',
    });
  });

  it('signUp rejects mismatched passwords before calling the utility', async () => {
    const signUp = vi.fn();
    const result = await new AuthManager(fakeAuthUtility({ signUp })).signUp({
      firstName: 'A',
      lastName: 'B',
      email: 'a@b.com',
      password: 'pw1',
      repeatPassword: 'pw2',
    });
    expect(signUp).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: false, error: 'Passwords do not match.' });
  });

  it('signUp forwards metadata and returns ok', async () => {
    const signUp = vi.fn().mockResolvedValue(undefined);
    const result = await new AuthManager(fakeAuthUtility({ signUp })).signUp({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'a@b.com',
      password: 'pw',
      repeatPassword: 'pw',
    });
    expect(signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pw',
      metadata: { first_name: 'Ada', last_name: 'Lovelace' },
    });
    expect(result).toEqual({ ok: true });
  });

  it('requestPasswordReset delegates to the utility', async () => {
    const resetPasswordForEmail = vi.fn().mockResolvedValue(undefined);
    const result = await new AuthManager(
      fakeAuthUtility({ resetPasswordForEmail }),
    ).requestPasswordReset('a@b.com');
    expect(resetPasswordForEmail).toHaveBeenCalledWith('a@b.com');
    expect(result).toEqual({ ok: true });
  });

  it('updatePassword normalizes failures; signOut succeeds', async () => {
    const updateManager = new AuthManager(
      fakeAuthUtility({
        updatePassword: vi.fn().mockRejectedValue(new Error('boom')),
      }),
    );
    expect(await updateManager.updatePassword('pw')).toEqual({
      ok: false,
      error: 'Something went wrong. Please try again.',
    });

    expect(await new AuthManager(fakeAuthUtility()).signOut()).toEqual({
      ok: true,
    });
  });
});
