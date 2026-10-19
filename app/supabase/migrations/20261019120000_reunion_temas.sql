-- Temas para la próxima reunión con cada marca (Pedro 19-oct-2026).
-- Una fila por tema: o una tarea marcada "Para reunión" (tarea_id) o un tema
-- suelto escrito a mano (texto). Al terminar la reunión se marcan como
-- presentados y quedan como historial, ligados a la nota de esa reunión.
-- No modifica la tabla tareas.
create table if not exists public.reunion_temas (
  id uuid primary key default gen_random_uuid(),
  marca_id uuid not null references public.marcas(id) on delete cascade,
  tarea_id uuid references public.tareas(id) on delete cascade,
  texto text not null default '' check (char_length(texto) <= 600),
  estado text not null default 'pendiente' check (estado in ('pendiente', 'presentado')),
  nota_id uuid references public.notas_reuniones(id) on delete set null,
  created_by uuid references public.team_members(id) on delete set null,
  created_at timestamptz not null default now(),
  presentado_at timestamptz,
  check (tarea_id is not null or char_length(btrim(texto)) > 0)
);

-- Una tarea solo puede estar una vez en la lista pendiente.
create unique index if not exists reunion_temas_tarea_pendiente
  on public.reunion_temas (tarea_id) where estado = 'pendiente' and tarea_id is not null;
create index if not exists reunion_temas_marca_estado
  on public.reunion_temas (marca_id, estado, created_at);

-- Acceso solo desde el servidor (service role), igual que las tablas strategy_*.
alter table public.reunion_temas enable row level security;
revoke all on public.reunion_temas from anon, authenticated;

notify pgrst, 'reload schema';
