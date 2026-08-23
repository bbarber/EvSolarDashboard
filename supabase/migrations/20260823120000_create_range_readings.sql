-- The car's own rated-range figure, from which the dashboard derives the range a day's charging
-- added. Stored in whatever unit the car displays, exactly as reported: converting on a guess
-- between miles and kilometres would be invisible in the value and wrong by 1.6x.
--
-- Range transmits on change, so a parked car writes nothing and a charging one writes a rising
-- series. Written only by the VM's service key.
create table range_readings (
  vin        text not null,
  reading_at timestamptz not null,
  miles      double precision not null,
  primary key (vin, reading_at)
);

create index range_readings_at_idx on range_readings (reading_at desc);

alter table range_readings enable row level security;
create policy "authenticated can read range_readings"
  on range_readings for select to authenticated using (true);
