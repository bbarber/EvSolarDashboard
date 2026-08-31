import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { CONTROLLER_TIME_ZONE } from '@/lib/data/types';

/**
 * The pause switch: while it holds, the VM declines to send any command to the car. Telemetry,
 * solar polling and the decision log all carry on — pausing withholds actions, it does not blind
 * the system.
 *
 * Stored as an instant rather than a boolean so it expires by itself. Nothing runs at midnight to
 * clear it, and a controller that was offline over the boundary comes back willing to charge.
 */

export interface PauseState {
  /** When the pause lapses, or null when the system is running normally. */
  pausedUntil: Date | null;
  paused: boolean;
}

export async function fetchPauseState(): Promise<PauseState> {
  const supabase = await createClient();
  const { data } = await supabase
    .from('system_control')
    .select('paused_until')
    .eq('id', 1)
    .maybeSingle();

  const raw = data?.paused_until ?? null;
  const pausedUntil = raw ? new Date(raw) : null;
  // A lapsed instant reads as running, without anyone having to clear it.
  return {
    pausedUntil,
    paused: pausedUntil != null && pausedUntil.getTime() > Date.now(),
  };
}

/**
 * Midnight tonight in the controller's zone — the moment a pause started now should lapse.
 *
 * Derived from the zone rather than the viewer's clock: the controller decides on America/Chicago,
 * and a pause that ended at the phone's midnight would be an hour early or late from a hotel room.
 */
export function nextMidnight(now = new Date()): Date {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: CONTROLLER_TIME_ZONE,
  }).format(now);
  const [y, m, d] = day.split('-').map(Number);

  // Midnight *after* today, found by round-tripping the zone offset.
  const guess = new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0));
  const zoned = new Date(
    guess.toLocaleString('en-US', { timeZone: CONTROLLER_TIME_ZONE }),
  );
  return new Date(guess.getTime() + (guess.getTime() - zoned.getTime()));
}
