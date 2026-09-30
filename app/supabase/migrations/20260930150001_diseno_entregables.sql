-- Entregables de una tarea de diseño (Pedro 30-sep-2026): una tarea de
-- Historias / Posts / Carruseles puede tener varios entregables, cada uno
-- con su fecha, título y link, y cada uno enlazado a SU publicación del
-- calendario (la que Lorena ya creó, o una nueva creada con la tarea).
create table if not exists public.diseno_entregables (
  id uuid primary key default gen_random_uuid(),
  tarea_id uuid not null references public.publicaciones(id) on delete cascade,
  publicacion_id uuid references public.publicaciones(id) on delete set null,
  orden int not null default 1,
  titulo text not null default '',
  fecha date,
  link text,
  listo_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists diseno_entregables_tarea_idx on public.diseno_entregables(tarea_id, orden);
create index if not exists diseno_entregables_pub_idx on public.diseno_entregables(publicacion_id);
alter table public.diseno_entregables enable row level security;
-- Solo el servidor (service role) lee/escribe; sin políticas para anon/authenticated.
