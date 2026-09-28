-- Public visitors never receive database access. Only server-side service_role.
create table public.booking_settings (
  id integer primary key check (id = 1),
  enabled boolean not null default true,
  duration_min integer not null default 60 check (duration_min between 15 and 180),
  notice_hours integer not null default 24 check (notice_hours between 1 and 720),
  horizon_days integer not null default 45 check (horizon_days between 1 and 90),
  start_hour integer not null default 9 check (start_hour between 0 and 22),
  end_hour integer not null default 18 check (end_hour between 1 and 23),
  weekdays integer[] not null default '{1,2,3,4,5}',
  calendar_id text not null default 'primary',
  check (end_hour > start_hour),
  check (weekdays <@ array[0,1,2,3,4,5,6] and cardinality(weekdays) > 0)
);
insert into public.booking_settings(id) values (1);
create table public.web_bookings (
  id uuid primary key,
  request_hash text not null,
  nombre text not null,
  email text not null,
  empresa text not null default '',
  motivo text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  status text not null default 'pending' check (status in ('pending','confirmed','cancelled','review')),
  google_event_id text not null unique,
  calendar_id text not null,
  meet_link text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at),
  exclude using gist (tstzrange(starts_at, ends_at, '[)') with &&)
    where (status in ('pending','confirmed','review'))
);
create index web_bookings_created on public.web_bookings(created_at);
create table public.booking_rate_limits (
  key text primary key,
  hits integer not null,
  expires_at timestamptz not null
);
alter table public.booking_settings enable row level security;
alter table public.web_bookings enable row level security;
alter table public.booking_rate_limits enable row level security;
revoke all on public.booking_settings, public.web_bookings, public.booking_rate_limits from anon, authenticated;
grant all on public.booking_settings, public.web_bookings, public.booking_rate_limits to service_role;
create function public.booking_rate_limit(p_key text, p_limit integer, p_seconds integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare n integer;
begin
  delete from public.booking_rate_limits where expires_at < now();
  insert into public.booking_rate_limits(key,hits,expires_at)
  values(p_key,1,now()+make_interval(secs => p_seconds))
  on conflict(key) do update set hits = public.booking_rate_limits.hits + 1
  returning hits into n;
  return n <= p_limit;
end;
$$;
revoke all on function public.booking_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.booking_rate_limit(text,integer,integer) to service_role;
notify pgrst, 'reload schema';
