-- Migración 016 — Tabla `grabaciones` + objetivo mensual por marca
--
-- Concepto: una "grabación" es una SESIÓN donde se graban videos en bloque
-- para una marca. Manrique = 1 sesión/mes con 10 videos. Lozano = 2 sesiones/mes
-- con 12 videos total. La sesión es la unidad operativa (planificada + cumplida).
--
-- Diseño:
--   - grabaciones: cada sesión es 1 row. fecha_planeada NOT NULL (siempre tiene
--     fecha objetivo); fecha_real solo cuando se ejecuta.
--   - estado: 3 valores ('planeada', 'cumplida', 'cancelada') con CHECK constraint.
--   - videos_grabados: opcional. Útil para reportar "Manrique cumplió 10 videos
--     este mes en una sola sesión" vs "Lozano cumplió 12 en 2 sesiones de 6".
--   - marcas.grabaciones_objetivo_mensual: target del mes para calcular cumplimiento.
--     Ej. Manrique=1, Lozano=2, NovaLamps=2. La UI compara real vs objetivo.

CREATE TABLE IF NOT EXISTS grabaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  fecha_planeada date NOT NULL,
  fecha_real date,
  estado text NOT NULL DEFAULT 'planeada' CHECK (estado IN ('planeada', 'cumplida', 'cancelada')),
  videos_grabados integer,
  notas text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index principal: queries por marca dentro de un mes
CREATE INDEX IF NOT EXISTS idx_grabaciones_marca_fecha
  ON grabaciones(marca_id, fecha_planeada DESC);

-- Index para listados globales filtrados por estado (dashboard "pendientes hoy")
CREATE INDEX IF NOT EXISTS idx_grabaciones_estado_fecha
  ON grabaciones(estado, fecha_planeada DESC);

-- Trigger para mantener updated_at fresco
CREATE OR REPLACE FUNCTION trigger_set_grabaciones_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_grabaciones_updated_at ON grabaciones;
CREATE TRIGGER set_grabaciones_updated_at
  BEFORE UPDATE ON grabaciones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_grabaciones_updated_at();

-- Objetivo mensual por marca (cuántas sesiones se esperan al mes)
ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS grabaciones_objetivo_mensual integer NOT NULL DEFAULT 0;

COMMENT ON TABLE grabaciones IS
  'Sesiones de grabación de videos por marca. Cada row = 1 sesión planificada (o cancelada). Las publicaciones son los outputs (1 sesión → N videos publicados).';

COMMENT ON COLUMN grabaciones.fecha_planeada IS
  'Fecha objetivo de la sesión. NOT NULL — siempre se planifica antes de ejecutar.';

COMMENT ON COLUMN grabaciones.fecha_real IS
  'Fecha en la que se ejecutó efectivamente. NULL si todavía no se hizo o si se canceló.';

COMMENT ON COLUMN grabaciones.estado IS
  'planeada (default), cumplida (se ejecutó), cancelada (no se hizo, ver notas para motivo)';

COMMENT ON COLUMN grabaciones.videos_grabados IS
  'Opcional — cantidad de videos producidos en la sesión. Útil para tracking de productividad.';

COMMENT ON COLUMN marcas.grabaciones_objetivo_mensual IS
  'Cuántas sesiones de grabación se esperan al mes para esta marca. Ej. Manrique=1, Lozano=2. Default 0 = sin objetivo definido.';

-- RLS: usuarios autenticados pueden hacer todo (mismo patrón que publicaciones)
ALTER TABLE grabaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth users full access grabaciones" ON grabaciones;
CREATE POLICY "auth users full access grabaciones"
  ON grabaciones
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
