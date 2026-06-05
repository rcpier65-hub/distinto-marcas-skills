-- Migración: tabla disenadores + columnas disenador_* en publicaciones
--
-- Pedro pidió módulo de Diseño separado del de Edición, similar al de
-- /editor. La estrategia:
--   - REUSA `publicaciones` (mismo flow que editor — no creo tabla
--     paralela de "tareas de diseño"). Las columnas fecha_diseno y
--     portada_lista ya existen desde la migración 019120001.
--   - Agrega tabla `disenadores` (espejo de `editores`) + columnas FK
--     en publicaciones. Confirmé con Pedro que por ahora solo hay
--     Ailyn pero quiere estructura escalable.

-- ──────────────────────────────────────────────────────────────────
-- Tabla disenadores
-- ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS disenadores (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre     text NOT NULL,
  activo     boolean DEFAULT true NOT NULL,
  color_hex  text,           -- color para chip; UI auto-asigna si null
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Unique parcial (solo activos) por nombre case-insensitive, para
-- evitar duplicados ("Ailyn" vs "ailyn") pero permitir reactivar.
CREATE UNIQUE INDEX IF NOT EXISTS disenadores_nombre_unique
  ON disenadores (lower(nombre)) WHERE activo;

-- Seed Ailyn (única diseñadora confirmada). INSERT idempotente:
-- si el seed ya corrió, no falla.
INSERT INTO disenadores (nombre, color_hex)
SELECT 'Ailyn', '#a78bfa'
WHERE NOT EXISTS (
  SELECT 1 FROM disenadores WHERE lower(nombre) = 'ailyn'
);

-- ──────────────────────────────────────────────────────────────────
-- Columnas en publicaciones para asignar diseñador
-- ──────────────────────────────────────────────────────────────────
-- Patrón espejo de editor_id + editor_nombre:
--   - disenador_id: FK al disenador asignado (si está dado de alta)
--   - disenador_nombre: denormalizado para casos donde el sync de
--     Notion trae el nombre pero todavía no hay match con disenadores
--     (mismo bug que tuvimos con editor_nombre)
--   - fecha_marcada_para_disenar: día específico que Ailyn (o quien
--     sea) se compromete a trabajar esa tarea. Igual a
--     fecha_marcada_para_editar del editor.

ALTER TABLE publicaciones
  ADD COLUMN IF NOT EXISTS disenador_id uuid REFERENCES disenadores(id),
  ADD COLUMN IF NOT EXISTS disenador_nombre text,
  ADD COLUMN IF NOT EXISTS fecha_marcada_para_disenar date;

-- Índices para los queries más frecuentes del módulo /diseno:
--   - lookup por diseñador (filtro "Mi trabajo")
--   - sort/filter por fecha de diseño (vista por mes)
CREATE INDEX IF NOT EXISTS publicaciones_disenador_id_idx
  ON publicaciones (disenador_id)
  WHERE disenador_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS publicaciones_fecha_diseno_idx
  ON publicaciones (fecha_diseno)
  WHERE fecha_diseno IS NOT NULL;
