-- Traspasar tareas a otra persona (Pedro 30-sep-2026: "pasarme tareas, que
-- ya me pertenezcan y que salga de quién me la traspasó").
alter table public.tareas
  add column if not exists traspasada_de uuid references public.team_members(id) on delete set null,
  add column if not exists traspasada_at timestamptz;
