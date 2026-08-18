import 'server-only';
import { createClient } from '@/lib/supabase/server';

/**
 * Everything the "today" dashboard shows, fetched in one place.
 *
 * "Today" means the controller's day — America/Chicago — not the viewer's or the
 * server's. The VM polls, decides and stops on that clock, so the dashboard must
 * slice time identically or midnight rows will drift between the two views.
 */
export const CONTROLLER_TIME_ZONE = 'America/Chicago';

export interface VehicleStatusRow {
  vin: string;
  charging_state: string;
  session: string;
  session_since: string | null;
  charge_amps: number | null;
  reported_max_amps: number | null;
  battery_level: number | null;
  last_set_amps: number | null;
  last_set_at: string | null;
  online: boolean | null;
  at_home: boolean | null;
  fast_charger: boolean | null;
  last_updated: string;
}

export interface SolarReadingRow {
  reading_at: string;
  watts: number;
  amps: number;
}

export interface EventRow {
  id: number;
  at: string;
  vin: string | null;
  kind: string;
  action: string | null;
  reason: string | null;
}

export function startOfControllerDay(now = new Date()): Date {
  // en-CA formats as YYYY-MM-DD, which parses unambiguously.
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: CONTROLLER_TIME_ZONE,
  }).format(now);
  // Midnight local: derive the zone offset by round-tripping the timestamp.
  const guess = new Date(`${day}T00:00:00Z`);
  const zoned = new Date(
    guess.toLocaleString('en-US', { timeZone: CONTROLLER_TIME_ZONE }),
  );
  return new Date(guess.getTime() + (guess.getTime() - zoned.getTime()));
}

export async function fetchToday() {
  const supabase = await createClient();
  const since = startOfControllerDay().toISOString();

  const [status, solar, events] = await Promise.all([
    supabase.from('vehicle_status').select('*').order('vin'),
    supabase
      .from('solar_readings')
      .select('*')
      .gte('reading_at', since)
      .order('reading_at'),
    supabase
      .from('events')
      .select('id, at, vin, kind, action, reason')
      .gte('at', since)
      .order('at', { ascending: false })
      .limit(60),
  ]);

  return {
    vehicles: (status.data ?? []) as VehicleStatusRow[],
    solar: (solar.data ?? []) as SolarReadingRow[],
    events: (events.data ?? []) as EventRow[],
    errors: [status.error, solar.error, events.error].filter(Boolean),
  };
}
