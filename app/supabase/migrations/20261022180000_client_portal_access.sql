-- Private credentials for explicitly linked client resources. No client SQL access.
create table if not exists public.client_portal_access (
  marca_id uuid not null references public.marcas(id) on delete cascade,
  resource text not null check (resource in ('catalogos', 'reclamos')),
  ciphertext text not null,
  pin_hash text not null,
  updated_at timestamptz not null default now(),
  primary key (marca_id, resource)
);
alter table public.client_portal_access enable row level security;
revoke all on public.client_portal_access from public, anon, authenticated;
grant all on public.client_portal_access to service_role;
notify pgrst, 'reload schema';
