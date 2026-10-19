-- Reporte de redes guardado: se consulta Meta/TikTok SOLO al tocar "Actualizar"
-- y todos ven la misma versión guardada (Pedro 18-oct-2026).
create table if not exists public.social_report_snapshots (
  brand_id uuid not null references public.marcas(id) on delete cascade,
  month text not null,
  kind text not null check (kind in ('report', 'trend', 'posts', 'tiktok')),
  payload jsonb not null,
  fetched_at timestamptz not null default now(),
  fetched_by uuid,
  fetched_by_name text,
  primary key (brand_id, month, kind)
);
alter table public.social_report_snapshots enable row level security;
