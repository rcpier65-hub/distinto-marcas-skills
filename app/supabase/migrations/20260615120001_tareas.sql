-- Módulo /tareas estilo "Notas": tablero con columnas dinámicas.
-- La categoría es texto libre (cliente / marca / persona detectada por IA o
-- por @mención). Si la categoría es un miembro del equipo, la tarea queda
-- asignada a esa persona (team_member_id). El CEO (director) ve todas.
-- Modo focus: focus_lane ∈ {ia, manual, delegar}; null = sigue en el board.

create table if not exists public.tareas (
  id uuid primary key default gen_random_uuid(),
  -- dueño / asignado: en cuyo tablero aparece la tarea
  team_member_id uuid references public.team_members(id) on delete cascade,
  -- quién la creó (para "asignadas por mí" y auditoría)
  created_by uuid references public.team_members(id) on delete set null,
  texto text not null,
  categoria text not null default 'General',
  color text not null default '#5BC0EB',
  completada boolean not null default false,
  completada_at timestamptz,
  -- null = en el board; si está en focus, el carril
  focus_lane text check (focus_lane in ('ia', 'manual', 'delegar')),
  orden double precision not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists tareas_team_member_idx on public.tareas (team_member_id);
create index if not exists tareas_completada_idx on public.tareas (completada);
create index if not exists tareas_categoria_idx on public.tareas (categoria);
