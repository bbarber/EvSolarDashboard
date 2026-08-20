-- The house's own load, in watts, recorded alongside the production reading it shares a timestamp
-- with. Both come from one Enphase call (latest_telemetry), so this costs no extra API budget.
--
-- Nullable on purpose: readings taken before the consumption meter was being read carry no house
-- figure, and inventing one would draw a fabricated line on the chart.
--
-- The stored value is already corrected. The consumption CTs on this site sit in the net position
-- with the direction of flow lost, so the meter reports the magnitude of grid flow and counts
-- exported solar as though the house had consumed it; the VM applies the sign flip before writing.
alter table solar_readings add column house_watts double precision;
