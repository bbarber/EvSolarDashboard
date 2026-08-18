-- Sign-up policy, enforced in the database rather than a dashboard toggle: only allow-listed
-- addresses may become users. A toggle can drift or be fat-fingered; a trigger on auth.users
-- cannot be bypassed by any client path (password signup, magic link, OAuth — all insert here).

create table private_user_allowlist (
  email text primary key
);
alter table private_user_allowlist enable row level security;
-- No policies: invisible to anon and authenticated alike. Service role and postgres bypass RLS.

insert into private_user_allowlist (email) values ('branden.barber1@gmail.com');

create or replace function enforce_user_allowlist()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (select 1 from private_user_allowlist where lower(email) = lower(new.email)) then
    raise exception 'signups are restricted';
  end if;
  return new;
end;
$$;

create trigger enforce_user_allowlist
  before insert on auth.users
  for each row execute function enforce_user_allowlist();
