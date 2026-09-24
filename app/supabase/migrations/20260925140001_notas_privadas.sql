-- Notas privadas del super admin + notas compartidas con todo el equipo.
-- Pedro 24-sep-2026: "necesito tomar notas privadas solo para mi usuario super
-- admin; y cuando deben salir para todo el equipo, que salgan a todos".
--
-- privada = true  → solo la ve su autor (ni otros directores).
-- privada = false → la ve todo el equipo (antes cada miembro solo veía las suyas).
-- La visibilidad se aplica en las server actions/páginas (service client).

ALTER TABLE public.notas_reuniones
  ADD COLUMN IF NOT EXISTS privada boolean NOT NULL DEFAULT false;
