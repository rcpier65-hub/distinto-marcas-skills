-- Mapa de marca (Pedro 21-oct-2026): posicionamiento, propuesta de valor y las
-- 7 maletas de la persuasión (Sean D'Souza, The Brain Audit) por marca, para que
-- quien entra a trabajar una marca la entienda rápido. Un documento por marca.
create table if not exists public.marca_mapas (
  marca_id uuid primary key references public.marcas(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_by uuid references public.team_members(id) on delete set null,
  updated_by_name text,
  updated_at timestamptz not null default now()
);

alter table public.marca_mapas enable row level security;
revoke all on public.marca_mapas from anon, authenticated;

notify pgrst, 'reload schema';
