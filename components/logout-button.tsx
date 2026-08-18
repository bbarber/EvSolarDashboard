'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function LogoutButton() {
  const { signOut, loading, error } = useAuth();
  const router = useRouter();

  const logout = async () => {
    if (await signOut()) {
      router.push('/auth/login');
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={logout} disabled={loading}>
        {loading ? 'Logging out...' : 'Logout'}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
