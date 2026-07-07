-- Migración: flujo de diseño de Aylin — completar/tiempo, estado "enviado",
-- y puente Tareas ↔ Diseños ("que su trabajo viva en ambas").
--
-- Pedro (07-jul-2026): Aylin anota rápido en el tablero "Tareas" pero ahí no
-- puede ponerle marca/estado/link ni medir tiempo; su flujo real es "Mis
-- diseños para hoy". Quiere que su trabajo esté en AMBAS: nota rápida en
-- Tareas que se pueda mandar a Diseños con el flujo completo, medir tiempo,
-- estados (avanza/no avanza/termina/enviado) y que aparezca en el reporte.
--
-- Todo ADITIVO (no borra ni cambia datos existentes).

-- ──────────────────────────────────────────────────────────────────
-- 1) publicaciones.diseno_terminado_at
--    Timestamp de cuándo se terminó el diseño. Sirve para:
--      - el Reporte del día (contar diseños terminados, como editado_at
--        cuenta videos), y
--      - medir la DURACIÓN del diseño (started_at → diseno_terminado_at).
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE publicaciones
  ADD COLUMN IF NOT EXISTS diseno_terminado_at timestamptz;

COMMENT ON COLUMN publicaciones.diseno_terminado_at IS
  'Cuándo se terminó el diseño (estado_tarea → listo/enviado). Reporte + duración con started_at.';

-- ──────────────────────────────────────────────────────────────────
-- 2) Estado "enviado" en el enum estado_tarea
--    Pedro: "si se envió o no". Flujo: sin_empezar → en_progreso →
--    (pausada) → listo → enviado.
--    ALTER TYPE ADD VALUE es idempotente con IF NOT EXISTS.
-- ──────────────────────────────────────────────────────────────────
ALTER TYPE estado_tarea ADD VALUE IF NOT EXISTS 'enviado';

-- ──────────────────────────────────────────────────────────────────
-- 3) Puente Tareas ↔ Diseños
--    marca_slug: marca elegida rápido al anotar la tarea (para agrupar
--      por marca y para pre-llenar el diseño).
--    diseno_id: si la nota se mandó a "Diseños para hoy", apunta a la
--      publicacion creada. Así la tarea muestra "🎨 En diseños" y no se
--      duplica el trabajo (una sola fuente de verdad del diseño).
-- ──────────────────────────────────────────────────────────────────
ALTER TABLE tareas
  ADD COLUMN IF NOT EXISTS marca_slug text,
  ADD COLUMN IF NOT EXISTS diseno_id uuid REFERENCES publicaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tareas_diseno_id_idx ON tareas (diseno_id) WHERE diseno_id IS NOT NULL;
