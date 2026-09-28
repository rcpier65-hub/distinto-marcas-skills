-- Duración real de grabaciones y reuniones (Pedro 26-sep-2026: "agendo de 10
-- a 2 y el bloque del calendario no refleja las horas hasta que lo estiro").
-- El código ya intentaba guardar duracion_min pero la columna no existía y
-- se descartaba en silencio.
alter table public.grabaciones     add column if not exists duracion_min int;
alter table public.marca_reuniones add column if not exists duracion_min int;
