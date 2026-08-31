'use client';

import { Button } from '@/components/ui/button';
import { disableUntilMidnight, enableNow } from '@/app/actions/pause';
import { CONTROLLER_TIME_ZONE } from '@/lib/data/types';
import { useState, useTransition } from 'react';

/**
 * The pause switch, as two buttons.
 *
 * Deliberately not a toggle. A toggle shows one state and hides the other, and the question being
 * answered here — "is the system allowed to touch my car right now" — is worth stating outright
 * rather than inferring from a switch position.
 */
export function PauseControls({
  paused,
  pausedUntil,
}: {
  paused: boolean;
  /** ISO instant; rendered in the controller's zone, not the viewer's. */
  pausedUntil: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: () => Promise<{ error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
    });
  };

  const until = pausedUntil
    ? new Intl.DateTimeFormat('en-US', {
        timeZone: CONTROLLER_TIME_ZONE,
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date(pausedUntil))
    : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="flex items-center gap-2 text-sm">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${paused ? 'bg-amber-500' : 'bg-emerald-500'}`}
          aria-hidden
        />
        {paused ? (
          <span>
            <span className="font-medium">Paused</span>
            <span className="text-muted-foreground">
              {until ? ` until ${until}` : ''} — no commands are being sent
            </span>
          </span>
        ) : (
          <span>
            <span className="font-medium">Running</span>
            <span className="text-muted-foreground">
              {' '}
              — charging is managed automatically
            </span>
          </span>
        )}
      </span>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={paused ? 'default' : 'outline'}
          disabled={pending || !paused}
          onClick={() => run(enableNow)}
        >
          Enable
        </Button>
        <Button
          size="sm"
          variant={paused ? 'outline' : 'secondary'}
          disabled={pending || paused}
          onClick={() => run(disableUntilMidnight)}
        >
          Disable until midnight
        </Button>
      </div>

      {error && (
        <p className="w-full text-sm text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
