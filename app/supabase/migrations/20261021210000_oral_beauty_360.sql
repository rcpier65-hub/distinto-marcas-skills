-- Reporte 360 Oral Beauty (Pedro 21-oct-2026): gasto de Meta por anuncio
-- (app) + embudo de WhatsApp por anuncio (sistema de la clínica), unidos por
-- ad_id. Solo se actualiza con el botón «Actualizar». Sin datos personales.
create table if not exists public.ob_reporte_360 (
  mes text primary key check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  gasto jsonb not null default '[]'::jsonb,
  embudo jsonb not null default '[]'::jsonb,
  tipo_cambio numeric,
  embudo_generado_at text,
  actualizado_at timestamptz not null default now(),
  actualizado_por text
);
-- Registro de cada sincronización con la clínica (sin cuerpos).
create table if not exists public.ob_sync_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  mes text,
  por text,
  ok boolean not null,
  status int,
  filas int,
  ms int,
  error text
);
alter table public.ob_reporte_360 enable row level security;
alter table public.ob_sync_log enable row level security;
revoke all on public.ob_reporte_360 from anon, authenticated;
revoke all on public.ob_sync_log from anon, authenticated;
notify pgrst, 'reload schema';
