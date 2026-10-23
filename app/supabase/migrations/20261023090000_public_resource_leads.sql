-- Resultados consentidos de los recursos públicos 05 y 06.
-- Solo el backend con service_role puede escribir o leer estos contactos.
create table if not exists public.public_resource_leads (
  id uuid primary key default gen_random_uuid(),
  resource text not null check (resource in ('decision-contenido', 'madurez-digital')),
  nombre text not null check (char_length(nombre) between 2 and 120),
  email text not null check (char_length(email) <= 254),
  empresa text not null check (char_length(empresa) between 2 and 160),
  telefono text check (telefono is null or char_length(telefono) <= 40),
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists public_resource_leads_created_idx on public.public_resource_leads(created_at desc);
create index if not exists public_resource_leads_resource_idx on public.public_resource_leads(resource, created_at desc);

alter table public.public_resource_leads enable row level security;
revoke all on public.public_resource_leads from public, anon, authenticated;
grant all on public.public_resource_leads to service_role;

comment on table public.public_resource_leads is 'Contactos que consienten guardar los diagnósticos públicos de Distinto.';
