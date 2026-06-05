-- Migration: tracking del tiempo de edición de cada video
--
-- Pedro pidió medir:
--   1. Videos editados por día (count agrupado por fecha)
--   2. Días editados al mes (count distinct)
--   3. Total editados del mes
--   4. Tiempo medio de edición (cuánto demora una tarea desde que el
--      editor hace clic en "▶ Editando" hasta que el estado pasa a
--      "aprobar")
--
-- Modelado con 2 timestamps simples en publicaciones (en lugar de
-- una tabla `eventos_edicion` separada) porque la escala es chica
-- (~50 tareas/mes/editor) y solo necesitamos 2 puntos en el tiempo
-- por tarea. Si en el futuro queremos "pausó/reanudó/reasignó", se
-- migra a una tabla de eventos.
--
-- iniciado_edicion_at: timestamp cuando el editor hace clic en
--   "▶ Editando" en la tabla. Manual.
-- editado_at: timestamp cuando la publicación cambia de estado
--   'editar' a cualquier estado avanzado (aprobar/programar/...).
--   Se setea AUTOMÁTICAMENTE en updateEditorEntry server action,
--   IF editado_at IS NULL (no se sobreescribe si vuelve a editar
--   y avanza de nuevo — mantenemos el primer momento de "listo").

ALTER TABLE publicaciones
  ADD COLUMN IF NOT EXISTS iniciado_edicion_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS editado_at TIMESTAMPTZ;

-- Index para las queries del reporte (por DATE(editado_at) agrupado).
-- Solo indexamos las filas que tienen valor.
CREATE INDEX IF NOT EXISTS idx_publicaciones_editado_at
  ON publicaciones (editado_at)
  WHERE editado_at IS NOT NULL;

COMMENT ON COLUMN publicaciones.iniciado_edicion_at IS
  'Timestamp cuando el editor marcó "▶ Editando" en /editor. Se compara con editado_at para calcular tiempo de edición.';

COMMENT ON COLUMN publicaciones.editado_at IS
  'Timestamp cuando el estado pasó de "editar" a un estado avanzado por primera vez. Auto-set en server action — NO se sobreescribe si la tarea vuelve a editar.';
