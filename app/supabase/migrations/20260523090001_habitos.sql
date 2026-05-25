-- Migración 018 — Hábitos diarios + tracking de completion
--
-- Modelo:
--   habitos              — la lista de hábitos activos (CRUD configurable)
--   habitos_completados  — 1 row por hábito x día completado (UNIQUE constraint)
--
-- Esto permite:
--   - Marcar/desmarcar (delete del row para "undo")
--   - Heatmap de últimos N días (LEFT JOIN con generate_series)
--   - % cumplimiento histórico (rows / días esperados según dias_activos)
--   - Tracking opcional con nota por completion
--
-- Días activos: ISO standard (1=lun, 7=dom). Default [1,2,3,4,5] = lun-vie.
-- Pedro configurable por hábito (algunos pueden ser 7-días tipo "tomar agua").

CREATE TABLE IF NOT EXISTS habitos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  icono text NOT NULL DEFAULT '✅',
  color text NOT NULL DEFAULT '#6366F1',
  dias_activos smallint[] NOT NULL DEFAULT ARRAY[1,2,3,4,5]::smallint[],
  orden integer NOT NULL DEFAULT 0,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_habitos_activo_orden ON habitos(activo, orden) WHERE activo = true;

CREATE TABLE IF NOT EXISTS habitos_completados (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habito_id uuid NOT NULL REFERENCES habitos(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  completado_at timestamptz NOT NULL DEFAULT now(),
  nota text,
  UNIQUE (habito_id, fecha)
);

CREATE INDEX IF NOT EXISTS idx_habitos_completados_habito_fecha
  ON habitos_completados(habito_id, fecha DESC);
CREATE INDEX IF NOT EXISTS idx_habitos_completados_fecha
  ON habitos_completados(fecha DESC);

-- RLS
ALTER TABLE habitos ENABLE ROW LEVEL SECURITY;
ALTER TABLE habitos_completados ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth full habitos" ON habitos;
CREATE POLICY "auth full habitos" ON habitos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "auth full habitos_completados" ON habitos_completados;
CREATE POLICY "auth full habitos_completados" ON habitos_completados FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Trigger updated_at en habitos
CREATE OR REPLACE FUNCTION trigger_set_habitos_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_habitos_updated_at ON habitos;
CREATE TRIGGER set_habitos_updated_at BEFORE UPDATE ON habitos
  FOR EACH ROW EXECUTE FUNCTION trigger_set_habitos_updated_at();

COMMENT ON COLUMN habitos.dias_activos IS
  'Array de días ISO (1=lun..7=dom) en que el hábito está activo. Default lun-vie [1,2,3,4,5]. Hábitos de fin de semana o todos los días configuran su propio array.';
COMMENT ON COLUMN habitos_completados.fecha IS
  'Fecha del día completado (no timestamp del momento — eso es completado_at). UNIQUE con habito_id evita doble-marca.';

-- Seed inicial (4 hábitos que Pedro mencionó: responder comentarios, etc.)
INSERT INTO habitos (nombre, icono, color, dias_activos, orden)
SELECT v.nombre, v.icono, v.color, v.dias::smallint[], v.orden FROM (VALUES
  ('Responder comentarios', '💬', '#3B82F6', ARRAY[1,2,3,4,5], 10),
  ('Revisar tendencias',    '📈', '#F97316', ARRAY[1,2,3,4,5], 20),
  ('Publicar historias',    '📸', '#EC4899', ARRAY[1,2,3,4,5], 30),
  ('Informar al grupo',     '📢', '#10B981', ARRAY[1,2,3,4,5], 40)
) v (nombre, icono, color, dias, orden)
WHERE NOT EXISTS (SELECT 1 FROM habitos WHERE habitos.nombre = v.nombre);
