-- Migración 012 — Editores como entidad + estado_tarea (sub-estado) + opcion_2
--
-- Cambios:
--   1. Tabla editores (id, nombre, activo)
--   2. Enum estado_tarea
--   3. Columnas en publicaciones: editor_id FK, estado_tarea, opcion_2
--   4. Backfill: extraer editores únicos del campo editor_nombre existente y vincular

-- ============================================================
-- 1. Tabla editores
-- ============================================================
CREATE TABLE IF NOT EXISTS editores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL UNIQUE,
  activo boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

COMMENT ON TABLE editores IS
  'Editores que producen contenido. Se vinculan a publicaciones via publicaciones.editor_id. Sin email ni avatar por ahora — agregar en futuro si hace falta.';

-- Bootstrap: extraer editores únicos del campo viejo editor_nombre
INSERT INTO editores (nombre)
SELECT DISTINCT TRIM(editor_nombre)
FROM publicaciones
WHERE editor_nombre IS NOT NULL AND TRIM(editor_nombre) <> ''
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================
-- 2. Enum estado_tarea
-- ============================================================
DO $$ BEGIN
  CREATE TYPE estado_tarea AS ENUM (
    'sin_empezar',
    'en_progreso',
    'listo'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================
-- 3. Columnas nuevas en publicaciones
-- ============================================================
ALTER TABLE publicaciones
  ADD COLUMN IF NOT EXISTS editor_id uuid REFERENCES editores(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS estado_tarea estado_tarea DEFAULT 'sin_empezar' NOT NULL,
  ADD COLUMN IF NOT EXISTS opcion_2 text;

CREATE INDEX IF NOT EXISTS idx_pub_editor ON publicaciones(editor_id) WHERE editor_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pub_estado_tarea ON publicaciones(estado_tarea);

-- ============================================================
-- 4. Backfill: vincular publicaciones.editor_id usando lookup por nombre
-- ============================================================
UPDATE publicaciones p
SET editor_id = e.id
FROM editores e
WHERE TRIM(p.editor_nombre) = e.nombre
  AND p.editor_id IS NULL;

-- NOTA: dejamos editor_nombre intacto por compatibilidad. El form nuevo usa editor_id.
-- En un futuro cleanup podemos DROP COLUMN editor_nombre cuando confirmemos
-- que todos los flows leen de editor_id.

-- ============================================================
-- 5. RLS para editores
-- ============================================================
ALTER TABLE editores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS editores_service_all ON editores;
CREATE POLICY editores_service_all ON editores
  AS PERMISSIVE FOR ALL TO service_role
  USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS editores_auth_read ON editores;
CREATE POLICY editores_auth_read ON editores
  AS PERMISSIVE FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS editores_auth_insert ON editores;
CREATE POLICY editores_auth_insert ON editores
  AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS editores_auth_update ON editores;
CREATE POLICY editores_auth_update ON editores
  AS PERMISSIVE FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
