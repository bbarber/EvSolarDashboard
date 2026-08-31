import { AuthButton } from '@/components/auth-button';
import { DayNav } from '@/components/dashboard/day-nav';
import { EventsList } from '@/components/dashboard/events-list';
import { PauseControls } from '@/components/dashboard/pause-controls';
import { RefreshButton } from '@/components/dashboard/refresh-button';
import { SolarChart } from '@/components/dashboard/solar-chart';
import { VehicleCard } from '@/components/dashboard/vehicle-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { fetchPauseState } from '@/lib/data/pause';
import { rangeAddedByVin } from '@/lib/data/range-added';
import { controllerDay, fetchDay, isValidDay } from '@/lib/data/today';
import { SITE_NAME } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// cacheComponents rules: anything touching cookies or the database renders inside
// <Suspense>, so the static shell streams instantly and the data fills in. The auth
// check lives with the data — both are per-request.
export default function Home({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
        <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
          <Link href="/" className="font-semibold">
            {SITE_NAME}
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <RefreshButton />
            <ThemeSwitcher />
            <Suspense>
              <AuthButton />
            </Suspense>
          </div>
        </div>
      </nav>

      <Suspense
        fallback={
          <div className="w-full max-w-5xl p-5 text-sm text-muted-foreground">
            Loading…
          </div>
        }
      >
        <DashboardContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}

async function DashboardContent({
  searchParams,
}: {
  searchParams: Promise<{ d?: string }>;
}) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect('/auth/login');
  }

  const today = controllerDay();
  const asked = (await searchParams).d;
  // An unparseable or future day falls back to today rather than showing an
  // empty chart for a date that cannot have data.
  const day = asked && isValidDay(asked) && asked <= today ? asked : today;
  const isToday = day === today;

  const [{ vehicles, solar, charge, ranges, events, errors }, pauseState] =
    await Promise.all([fetchDay(day), fetchPauseState()]);
  const rangeAdded = rangeAddedByVin(ranges);
  const latest = solar.at(-1);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 p-5">
      {errors.length > 0 && (
        <p className="rounded border border-destructive/40 px-3 py-2 text-sm text-destructive">
          Some data failed to load; showing what arrived.
        </p>
      )}

      {/* Above the cars on purpose: whether the system is allowed to act at all is the first
          thing worth knowing, and it frames everything below it. */}
      <Card>
        <CardContent className="pt-6">
          <PauseControls
            paused={pauseState.paused}
            pausedUntil={pauseState.pausedUntil?.toISOString() ?? null}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2">
        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No vehicle data has been mirrored yet. The VM forwarder fills this
              in as telemetry arrives.
            </CardContent>
          </Card>
        ) : (
          vehicles.map((v) => (
            <VehicleCard
              key={v.vin}
              vehicle={v}
              rangeAdded={rangeAdded.get(v.vin)}
            />
          ))
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-baseline justify-between gap-x-3 gap-y-1 space-y-0">
          <CardTitle className="text-base">
            <DayNav day={day} today={today} />
          </CardTitle>
          <span className="text-sm tabular-nums text-muted-foreground">
            {latest
              ? `${Math.round(latest.watts)} W (${latest.amps.toFixed(1)} A) ${isToday ? 'latest' : 'last'}`
              : 'no readings'}
          </span>
        </CardHeader>
        <CardContent>
          <SolarChart readings={solar} charge={charge} isToday={isToday} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {isToday ? "Today's events" : 'Events'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EventsList events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
