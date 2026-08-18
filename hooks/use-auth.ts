'use client';

import { useCallback, useState } from 'react';
import { authManager } from '@/lib/managers/auth-manager';
import type { AuthResult } from '@/lib/managers/auth-manager';

export interface SignUpFields {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  repeatPassword: string;
}

/**
 * Drives auth flows for form components. Components call an action and render
 * `{ loading, error }`; actions resolve to `true` on success so the component
 * can navigate.
 */
export function useAuth() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(
    async (action: () => Promise<AuthResult>): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const result = await action();
        if (!result.ok) {
          setError(result.error);
          return false;
        }
        return true;
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  const signIn = useCallback(
    (email: string, password: string) =>
      run(() => authManager.signIn(email, password)),
    [run],
  );

  const signUp = useCallback(
    (fields: SignUpFields) => run(() => authManager.signUp(fields)),
    [run],
  );

  const requestPasswordReset = useCallback(
    (email: string) => run(() => authManager.requestPasswordReset(email)),
    [run],
  );

  const updatePassword = useCallback(
    (password: string) => run(() => authManager.updatePassword(password)),
    [run],
  );

  const signOut = useCallback(() => run(() => authManager.signOut()), [run]);

  return {
    loading,
    error,
    signIn,
    signUp,
    requestPasswordReset,
    updatePassword,
    signOut,
  };
}
