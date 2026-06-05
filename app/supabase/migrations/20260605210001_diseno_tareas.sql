-- Migración: descripcion + fecha_entrega + estado archivado
--
-- Pedro pidió rediseño del módulo /diseno con:
--   1. Tareas independientes (Manual de marca, Banner web) que NO son
--      publicaciones de redes — marca_id puede ser NULL
--   2. Descripción larga de la tarea (para que Ailyn lea el brief)
--   3. Fecha de entrega = deadline del rango (distinta de fecha_diseno
--      que es el día que se trabaja)
--   4. Estado "archivado" para sacar la tarea del kanban sin borrarla

-- ──────────────────────────────────────────────────────────────────
-- 1. Ampliar ENUM estado_tarea con 'archivado'
-- ──────────────────────────────────────────────────────────────────
-- IMPORTANT: ALTER TYPE ADD VALUE no se puede ejecutar dentro de un
-- transaction en Postgres < 13. Aplicamos con DO $$ + EXCEPTION para
-- que sea idempotente (si ya se aplicó, no falla).
DO $$
BEGIN
  ALTER TYPE estado_tarea ADD VALUE IF NOT EXISTS 'archivado';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN others THEN
    RAISE NOTICE 'ALTER TYPE estado_tarea: % — continuando', SQLERRM;
END $$;

-- ──────────────────────────────────────────────────────────────────
-- 2. Columnas nuevas en publicaciones
-- ──────────────────────────────────────────────────────────────────
-- descripcion: brief largo de la tarea (lo que Ailyn lee antes de
--   empezar). Markdown/texto plano, sin límite estricto.
-- fecha_entrega: deadline del rango. fecha_diseno es CUÁNDO se hace
--   la tarea; fecha_entrega es CUÁNDO debe estar lista.
ALTER TABLE publicaciones
  ADD COLUMN IF NOT EXISTS descripcion text,
  ADD COLUMN IF NOT EXISTS fecha_entrega date;

-- ──────────────────────────────────────────────────────────────────
-- 3. Hacer marca_id NULLABLE para tareas independientes
-- ──────────────────────────────────────────────────────────────────
-- Las tareas tipo "Manual de marca", "Banner web", "Brochure" no son
-- publicaciones de redes. Pedro pidió poder crearlas desde /diseno
-- SIN obligar a asignarle marca. Sin embargo, MUCHAS queries existentes
-- (RLS, joins, índices) asumen marca_id NOT NULL.
--
-- Estrategia conservadora: dejarlo NOT NULL pero crear marca "virtual"
-- de DISEÑO INTERNO. Cualquier tarea sin marca se asigna a ella, así
-- las RLS y joins siguen funcionando.
--
-- Slug 'interno' = bucket para tareas internas de la agencia.
INSERT INTO marcas (slug, nombre, emoji_marca, color_primario_hex, estado)
SELECT 'interno', 'Distinto · Interno', '🎨', '#a78bfa', 'activa'
WHERE NOT EXISTS (SELECT 1 FROM marcas WHERE slug = 'interno');

-- ──────────────────────────────────────────────────────────────────
-- 4. Índice para excluir archivadas rápido
-- ──────────────────────────────────────────────────────────────────
-- El módulo /diseno hace `WHERE estado_tarea != 'archivado'` casi
-- siempre. Índice parcial para que ese filtro sea instantáneo.
CREATE INDEX IF NOT EXISTS publicaciones_no_archivadas_idx
  ON publicaciones (fecha_diseno)
  WHERE estado_tarea <> 'archivado' AND fecha_diseno IS NOT NULL;
