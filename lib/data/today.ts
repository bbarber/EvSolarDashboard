import 'server-only';
import { createClient } from '@/lib/supabase/server';
import {
  CONTROLLER_TIME_ZONE,
  type ChargeReadingRow,
  type EventRow,
  type SolarReadingRow,
  type VehicleStatusRow,
} from '@/lib/data/types';

export * from '@/lib/data/types';

/** Today in the controller's zone, as YYYY-MM-DD. en-CA formats that way. */
export function controllerDay(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: CONTROLLER_TIME_ZONE,
  }).format(now);
}

/** Midnight of the given controller day, as an instant. */
export function startOfControllerDay(dayOrNow: string | Date = new Date()) {
  const day = typeof dayOrNow === 'string' ? dayOrNow : controllerDay(dayOrNow);
  // Midnight local: derive the zone offset by round-tripping the timestamp.
  const guess = new Date(`${day}T00:00:00Z`);
  const zoned = new Date(
    guess.toLocaleString('en-US', { timeZone: CONTROLLER_TIME_ZONE }),
  );
  return new Date(guess.getTime() + (guess.getTime() - zoned.getTime()));
}

/** Shifts a YYYY-MM-DD controller day by whole days. */
export function shiftDay(day: string, days: number): string {
  const [y, m, d] = day.split('-').map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + days));
  return shifted.toISOString().slice(0, 10);
}

/** True for a well-formed YYYY-MM-DD that is a real calendar date. */
export function isValidDay(day: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const [y, m, d] = day.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return (
    dt.getUTCFullYear() === y &&
    dt.getUTCMonth() === m - 1 &&
    dt.getUTCDate() === d
  );
}

export async function fetchDay(day: string = controllerDay()) {
  const supabase = await createClient();
  const since = startOfControllerDay(day).toISOString();
  const until = startOfControllerDay(shiftDay(day, 1)).toISOString();

  const [status, solar, charge, events] = await Promise.all([
    supabase.from('vehicle_status').select('*').order('vin'),
    supabase
      .from('solar_readings')
      .select('*')
      .gte('reading_at', since)
      .lt('reading_at', until)
      .order('reading_at'),
    supabase
      .from('charge_readings')
      .select('*')
      .gte('reading_at', since)
      .lt('reading_at', until)
      .order('reading_at'),
    supabase
      .from('events')
      .select('id, at, vin, kind, action, reason')
      .gte('at', since)
      .lt('at', until)
      .order('at', { ascending: false })
      .limit(60),
  ]);

  return {
    vehicles: (status.data ?? []) as VehicleStatusRow[],
    solar: (solar.data ?? []) as SolarReadingRow[],
    charge: (charge.data ?? []) as ChargeReadingRow[],
    events: (events.data ?? []) as EventRow[],
    errors: [status.error, solar.error, charge.error, events.error].filter(
      Boolean,
    ),
  };
}

export const fetchToday = fetchDay;
