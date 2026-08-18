import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LoginForm } from '@/components/login-form';
import { AUTH_REDIRECT_PATH } from '@/lib/site';

/**
 * Example of testing a client auth component. We mock at the *manager* boundary
 * (the only thing that touches Supabase) and let the real `useAuth` hook run, so
 * this exercises the component's loading/error/redirect wiring — not Supabase.
 */
const push = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

const signIn = vi.fn();
vi.mock('@/lib/managers/auth-manager', () => ({
  authManager: {
    signIn: (...args: unknown[]) => signIn(...args),
  },
}));

describe('LoginForm', () => {
  beforeEach(() => {
    push.mockReset();
    signIn.mockReset();
  });

  it('signs in and redirects to the auth landing route on success', async () => {
    signIn.mockResolvedValue({ ok: true });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'pw');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(signIn).toHaveBeenCalledWith('a@b.com', 'pw');
    expect(push).toHaveBeenCalledWith(AUTH_REDIRECT_PATH);
  });

  it('shows the normalized error and does not redirect on failure', async () => {
    signIn.mockResolvedValue({
      ok: false,
      error: 'Incorrect email or password.',
    });
    render(<LoginForm />);

    await userEvent.type(screen.getByLabelText('Email'), 'a@b.com');
    await userEvent.type(screen.getByLabelText('Password'), 'bad');
    await userEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(
      await screen.findByText('Incorrect email or password.'),
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });
});
