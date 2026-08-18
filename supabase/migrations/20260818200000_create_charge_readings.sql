-- The car's draw over time, one sample per telemetry fold. Zero-amp rows are the step-closers:
-- they mark the moment charging stopped. Written only by the VM's service key.
create table charge_readings (
  vin        text not null,
  reading_at timestamptz not null,
  amps       integer not null,
  watts      double precision not null,
  primary key (vin, reading_at)
);

create index charge_readings_at_idx on charge_readings (reading_at desc);

alter table charge_readings enable row level security;
create policy "authenticated can read charge_readings"
  on charge_readings for select to authenticated using (true);
