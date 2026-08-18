-- The dashboard's data, mirrored from the controller VM. SQLite on the VM stays authoritative
-- for control; these tables are a view of it, shipped over an outbox so a Supabase outage can
-- never affect charging.
--
-- Writes come exclusively from the VM's service-role key, which bypasses RLS. The policies below
-- therefore only need to answer one question: who may READ. Answer: any authenticated user —
-- and signup is disabled, so that means the allow-listed account(s) only.

create table vehicle_status (
  vin              text primary key,
  charging_state   text not null,
  session          text not null,
  session_since    timestamptz,
  charge_amps      integer,
  reported_max_amps integer,
  battery_level    integer,
  last_set_amps    integer,
  last_set_at      timestamptz,
  online           boolean,
  at_home          boolean,
  fast_charger     boolean,
  last_updated     timestamptz not null,
  mirrored_at      timestamptz not null default now()
);

create table solar_readings (
  reading_at timestamptz primary key,
  watts      double precision not null,
  amps       double precision not null
);

-- One row per interesting moment: decisions, connectivity changes, wakes, commands. The payload
-- carries whatever the kind needs; the typed columns are what the dashboard filters on.
create table events (
  id      bigint generated always as identity primary key,
  at      timestamptz not null,
  vin     text,
  kind    text not null check (kind in ('decision','connectivity','wake','command','error')),
  action  text,
  reason  text,
  payload jsonb
);

create index events_at_idx on events (at desc);
create index events_kind_at_idx on events (kind, at desc);

alter table vehicle_status enable row level security;
alter table solar_readings enable row level security;
alter table events enable row level security;

create policy "authenticated can read vehicle_status"
  on vehicle_status for select to authenticated using (true);
create policy "authenticated can read solar_readings"
  on solar_readings for select to authenticated using (true);
create policy "authenticated can read events"
  on events for select to authenticated using (true);
