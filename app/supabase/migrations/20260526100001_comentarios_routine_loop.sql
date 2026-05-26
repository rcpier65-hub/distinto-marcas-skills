-- Migration 021 — comentarios_inbox columnas para loop con Routine
--
-- Agrega las columnas que el nuevo flow bidireccional necesita:
--  - respuesta_editada: si Pedro modificó el texto sugerido antes de
--    aprobar, su versión vive acá. Se prioriza sobre respuesta_sugerida.
--  - approved_at: timestamp de cuándo Pedro aprobó. Sirve para FIFO
--    (procesar los aprobados más antiguos primero) y para SLA tracking.
--  - sent_at: timestamp del POST exitoso a Metricool.
--  - metricool_reply_id: ID del reply en Metricool. Permite borrar
--    la respuesta más tarde si hace falta.
--  - sugerencia_at / sugerencia_fuente / sugerencia_metadata: tracking
--    de la Routine generadora (cuándo, qué modelo, cuántos tokens).
--  - last_error / last_error_at / retry_count: tracking de fallos
--    en posteo a Metricool. Permite reintentos progresivos sin
--    perder el contexto del error.
--
-- Todas las columnas son NULLABLE para no romper rows existentes.

ALTER TABLE comentarios_inbox
  ADD COLUMN IF NOT EXISTS respuesta_editada     TEXT,
  ADD COLUMN IF NOT EXISTS approved_at           TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at               TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS metricool_reply_id    TEXT,
  ADD COLUMN IF NOT EXISTS sugerencia_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sugerencia_fuente     TEXT,
  ADD COLUMN IF NOT EXISTS sugerencia_metadata   JSONB,
  ADD COLUMN IF NOT EXISTS last_error            TEXT,
  ADD COLUMN IF NOT EXISTS last_error_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS retry_count           INTEGER DEFAULT 0;

-- Index para queries del cron process-approvals:
-- "comentarios approved con respuesta lista, ordenados por aprobación"
CREATE INDEX IF NOT EXISTS idx_comentarios_inbox_approved_ready
  ON comentarios_inbox (status, approved_at)
  WHERE status = 'approved' AND respuesta_sugerida IS NOT NULL;

-- Index para el endpoint marcar-enviado (lookup por id con status check):
-- Postgres ya tiene PK por id, este compuesto ayuda solo si hay muchos
-- rows pero el plan QUERY es trivial. Lo dejamos como nice-to-have.
CREATE INDEX IF NOT EXISTS idx_comentarios_inbox_id_status
  ON comentarios_inbox (id, status);

COMMENT ON COLUMN comentarios_inbox.respuesta_editada IS
  'Texto editado por Pedro antes de aprobar. Si NULL, se usa respuesta_sugerida tal cual';
COMMENT ON COLUMN comentarios_inbox.approved_at IS
  'Timestamp del momento exacto que Pedro aprobó. FIFO para process-approvals';
COMMENT ON COLUMN comentarios_inbox.sent_at IS
  'Timestamp del POST exitoso a Metricool';
COMMENT ON COLUMN comentarios_inbox.metricool_reply_id IS
  'ID del reply en Metricool. Permite borrar la respuesta si hace falta';
COMMENT ON COLUMN comentarios_inbox.retry_count IS
  'Cuántas veces falló el posteo. Sirve para circuit breaker manual';
