-- Rendimiento del equipo (Pedro 30-sep-2026): horario y costo de cada persona
-- (para la carga / utilización) y pago mensual de cada marca (rentabilidad).
alter table public.team_members
  add column if not exists horas_dia numeric not null default 8,
  add column if not exists dias_laborales int[] not null default '{1,2,3,4,5}',
  add column if not exists costo_hora numeric;
alter table public.marcas
  add column if not exists fee_mensual numeric;
