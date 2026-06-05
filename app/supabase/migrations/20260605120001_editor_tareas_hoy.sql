-- Migration: agregar fecha_marcada_para_editar a publicaciones
--
-- Permite al editor marcar una tarea como "voy a editar esto hoy" desde
-- la vista /editor. La columna guarda la FECHA (no timestamp) en la que
-- el editor la marcó. El filtro "Mi trabajo para hoy" muestra solo las
-- que tienen esta columna = CURRENT_DATE.
--
-- Por qué fecha vs boolean: con boolean el editor tendría que limpiar
-- todas las tareas cada mañana. Con fecha, las de ayer "expiran" solas
-- y la vista de hoy queda limpia automáticamente. Pedro eligió esta
-- opción explícitamente (auto-limpia por fecha).

ALTER TABLE publicaciones
ADD COLUMN IF NOT EXISTS fecha_marcada_para_editar DATE;

-- Index parcial: solo indexa las filas marcadas. Es chico (1 vez por
-- editor por día) y acelera mucho el filtro "= CURRENT_DATE" sin
-- penalizar las publicaciones que no están marcadas (que son 99%).
CREATE INDEX IF NOT EXISTS idx_publicaciones_fecha_marcada_para_editar
  ON publicaciones (fecha_marcada_para_editar)
  WHERE fecha_marcada_para_editar IS NOT NULL;

COMMENT ON COLUMN publicaciones.fecha_marcada_para_editar IS
  'Fecha en que el editor marcó esta tarea como "para editar hoy" desde /editor. NULL = no marcada. El filtro "Mi trabajo para hoy" muestra WHERE fecha_marcada_para_editar = CURRENT_DATE.';
