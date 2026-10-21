-- Presentaciones comerciales (Pedro 21-oct-2026): cada reunión de venta guarda
-- cliente, respuestas, notas y checklist, y el id de la propuesta generada
-- (una sola por sesión, aunque se toque «Generar» dos veces).
create table if not exists public.presentacion_sesiones (
  id uuid primary key default gen_random_uuid(),
  servicio text not null default 'web' check (servicio in ('web')),
  data jsonb not null default '{}'::jsonb,
  propuesta_id uuid,
  created_by uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists presentacion_sesiones_autor on public.presentacion_sesiones (created_by, updated_at desc);

alter table public.presentacion_sesiones enable row level security;
revoke all on public.presentacion_sesiones from anon, authenticated;

notify pgrst, 'reload schema';
