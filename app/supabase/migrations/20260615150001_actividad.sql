-- Historial de actividad por persona (Pedro 15-jun-2026).
-- Registra cada acción que hace cada miembro en el sistema, para el reporte
-- diario "qué hizo y cuánto" por persona (Lorena, Pieer, Helin, etc.).
--
-- Cómo activarlo: Supabase Dashboard → SQL Editor → pegar TODO esto → Run.
-- Antes de correrlo, el logger de la app no escribe nada (no rompe). Después,
-- empieza a guardar la actividad desde ese momento.

create table if not exists public.actividad (
  id uuid primary key default gen_random_uuid(),
  team_member_id uuid references public.team_members(id) on delete set null,
  actor_nombre   text not null default 'Sistema',
  rol            text,
  accion         text not null,        -- ej. 'actualizó publicación', 'mandó a aprobar'
  entidad_tipo   text,                 -- 'publicacion' | 'comentario' | 'grilla' | ...
  entidad_id     text,
  marca_slug     text,
  detalle        text,                 -- texto libre legible para el reporte
  created_at     timestamptz not null default now()
);

create index if not exists idx_actividad_created_at on public.actividad (created_at desc);
create index if not exists idx_actividad_actor      on public.actividad (actor_nombre);
create index if not exists idx_actividad_member     on public.actividad (team_member_id);
