-- Panel de Publicidad por marca (Pedro 21-oct-2026).
-- marca_pauta: configuración (presupuesto mensual, resultado que se compra,
-- meta de costo) y la última versión consultada a Meta (solo al tocar
-- «Actualizar»; todos ven la misma). pauta_bitacora: qué se cambió y por qué.
create table if not exists public.marca_pauta (
  marca_id uuid primary key references public.marcas(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  datos jsonb,
  datos_at timestamptz,
  datos_por text,
  updated_at timestamptz not null default now()
);

create table if not exists public.pauta_bitacora (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  fecha date not null default ((now() at time zone 'America/Lima')::date),
  texto text not null check (char_length(btrim(texto)) between 1 and 1000),
  autor_id uuid references public.team_members(id) on delete set null,
  autor_nombre text,
  created_at timestamptz not null default now()
);
create index if not exists pauta_bitacora_marca_fecha on public.pauta_bitacora (marca_id, fecha desc, created_at desc);

alter table public.marca_pauta enable row level security;
alter table public.pauta_bitacora enable row level security;
revoke all on public.marca_pauta from anon, authenticated;
revoke all on public.pauta_bitacora from anon, authenticated;

notify pgrst, 'reload schema';
