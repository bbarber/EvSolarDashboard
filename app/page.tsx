import { AuthButton } from '@/components/auth-button';
import { EventsList } from '@/components/dashboard/events-list';
import { SolarChart } from '@/components/dashboard/solar-chart';
import { VehicleCard } from '@/components/dashboard/vehicle-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { fetchToday } from '@/lib/data/today';
import { SITE_NAME } from '@/lib/site';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Suspense } from 'react';

// cacheComponents rules: anything touching cookies or the database renders inside
// <Suspense>, so the static shell streams instantly and the data fills in. The auth
// check lives with the data — both are per-request.
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center">
      <nav className="flex h-16 w-full justify-center border-b border-b-foreground/10">
        <div className="flex w-full max-w-5xl items-center justify-between p-3 px-5 text-sm">
          <Link href="/" className="font-semibold">
            {SITE_NAME}
          </Link>
          <div className="flex min-w-0 items-center gap-3">
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
            Loading today…
          </div>
        }
      >
        <DashboardContent />
      </Suspense>
    </main>
  );
}

async function DashboardContent() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) {
    redirect('/auth/login');
  }

  const { vehicles, solar, charge, events, errors } = await fetchToday();
  const latest = solar.at(-1);

  return (
    <div className="flex w-full max-w-5xl flex-col gap-6 p-5">
      {errors.length > 0 && (
        <p className="rounded border border-destructive/40 px-3 py-2 text-sm text-destructive">
          Some data failed to load; showing what arrived.
        </p>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-sm text-muted-foreground">
              No vehicle data has been mirrored yet. The VM forwarder fills this
              in as telemetry arrives.
            </CardContent>
          </Card>
        ) : (
          vehicles.map((v) => <VehicleCard key={v.vin} vehicle={v} />)
        )}
      </section>

      <Card>
        <CardHeader className="flex flex-row items-baseline justify-between space-y-0">
          <CardTitle className="text-base">Solar today</CardTitle>
          <span className="text-sm tabular-nums text-muted-foreground">
            {latest
              ? `${Math.round(latest.watts)} W (${latest.amps.toFixed(1)} A) latest`
              : 'no readings yet'}
          </span>
        </CardHeader>
        <CardContent>
          <SolarChart readings={solar} charge={charge} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Today&apos;s events</CardTitle>
        </CardHeader>
        <CardContent>
          <EventsList events={events} />
        </CardContent>
      </Card>
    </div>
  );
}
