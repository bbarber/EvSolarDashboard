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

/** Tailwind class fragments per vehicle series on the chart, keyed by VIN. */
export const VEHICLE_CHART_CLASSES: Record<
  string,
  { stroke: string; fill: string; chip: string; text: string }
> = {
  '5YJ3E1EA3KF428848': {
    stroke: 'stroke-orange-500 dark:stroke-orange-400',
    fill: 'fill-orange-500 dark:fill-orange-400',
    chip: 'bg-orange-500 dark:bg-orange-400',
    text: 'text-orange-600 dark:text-orange-400',
  },
  '7SAYGDEEXPA069171': {
    stroke: 'stroke-sky-500 dark:stroke-sky-400',
    fill: 'fill-sky-500 dark:fill-sky-400',
    chip: 'bg-sky-500 dark:bg-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
  },
};

export const FALLBACK_CHART_CLASSES = {
  stroke: 'stroke-violet-500 dark:stroke-violet-400',
  fill: 'fill-violet-500 dark:fill-violet-400',
  chip: 'bg-violet-500 dark:bg-violet-400',
  text: 'text-violet-600 dark:text-violet-400',
};
