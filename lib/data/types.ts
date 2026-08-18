/**
 * Shared shapes and constants for the dashboard's data — importable from client
 * components. Anything that touches Supabase or `server-only` lives in
 * `today.ts` instead; a client component importing a runtime value from there
 * drags the server client into the browser bundle and breaks the build.
 */

/**
 * "Today" means the controller's day — America/Chicago — not the viewer's or
 * the server's. The VM polls, decides and stops on that clock, so the dashboard
 * must slice and label time identically.
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
