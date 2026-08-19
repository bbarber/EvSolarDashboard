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

export interface ChargeReadingRow {
  vin: string;
  reading_at: string;
  amps: number;
  watts: number;
}

/**
 * Vehicle identity for display. Every surface (cards, chart legend, events)
 * uses the same names so a VIN never leaks into the UI.
 */
export const VEHICLE_NICKNAMES: Record<string, string> = {
  '5YJ3E1EA3KF428848': 'Tessie',
  '7SAYGDEEXPA069171': 'Bessie',
};

export function vehicleName(vin: string | null): string {
  if (!vin) return '';
  return VEHICLE_NICKNAMES[vin] ?? vin;
}

/**
 * Per-vehicle series colors, keyed by VIN. These are literal values rather than
 * Tailwind classes because the chart draws to a canvas, which needs a real
 * color — and because a class name only referenced from here is invisible to
 * Tailwind's scanner and gets purged from the stylesheet.
 */
export interface VehicleColors {
  light: string;
  dark: string;
}

export const VEHICLE_COLORS: Record<string, VehicleColors> = {
  '5YJ3E1EA3KF428848': { light: '#ea580c', dark: '#fb923c' }, // orange
  '7SAYGDEEXPA069171': { light: '#0284c7', dark: '#38bdf8' }, // sky
};

export const FALLBACK_VEHICLE_COLORS: VehicleColors = {
  light: '#7c3aed',
  dark: '#a78bfa',
};

export function vehicleColors(vin: string): VehicleColors {
  return VEHICLE_COLORS[vin] ?? FALLBACK_VEHICLE_COLORS;
}
