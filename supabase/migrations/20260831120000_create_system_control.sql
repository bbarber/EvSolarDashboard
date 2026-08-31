-- The dashboard's pause switch: one row, one meaningful column.
--
-- Stored as an instant rather than a boolean so the pause expires on its own. Nothing has to run at
-- midnight to clear it, and a controller that was offline over the boundary comes back willing to
-- charge instead of stuck.
--
-- The VM reads this outbound; it never listens. The worst an attacker with dashboard access can do
-- is stop the system commanding the car — they cannot start a session or raise a current.
create table system_control (
  id           smallint primary key default 1,
  paused_until timestamptz,
  updated_at   timestamptz not null default now(),
  updated_by   text,
  -- One row, forever. A second row would give the VM two answers to one question.
  constraint system_control_singleton check (id = 1)
);

insert into system_control (id, paused_until) values (1, null);

alter table system_control enable row level security;

-- Readable and writable by the signed-in user; there is exactly one, enforced by the allow-list
-- trigger on auth.users. The VM uses the service key and bypasses this.
create policy "authenticated can read system_control"
  on system_control for select to authenticated using (true);

create policy "authenticated can set system_control"
  on system_control for update to authenticated using (true) with check (true);
