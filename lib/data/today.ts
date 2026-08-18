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

  const [status, solar, charge, events] = await Promise.all([
    supabase.from('vehicle_status').select('*').order('vin'),
    supabase
      .from('solar_readings')
      .select('*')
      .gte('reading_at', since)
      .order('reading_at'),
    supabase
      .from('charge_readings')
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
    charge: (charge.data ?? []) as ChargeReadingRow[],
    events: (events.data ?? []) as EventRow[],
    errors: [status.error, solar.error, charge.error, events.error].filter(
      Boolean,
    ),
  };
}
