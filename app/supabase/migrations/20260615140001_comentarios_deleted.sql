-- Migración: status 'deleted' para comentarios_inbox + auditoría
--
-- Pedro pidió botón "Eliminar" en /comentarios para borrar hate
-- directamente de la red social (FB/IG/TikTok vía Metricool DELETE) y
-- sacarlo de su inbox.
--
-- Por qué un status NUEVO ('deleted') y no reusar 'skipped':
--   El fetch desde Metricool (fetchComentariosFromMetricool) REACTIVA
--   los 'skipped' a 'pending' si el comentario sigue sin responder en
--   la red. Si un comentario de hate eliminado quedara como 'skipped',
--   reaparecería en el inbox en la próxima carga. Con un status propio
--   'deleted' — que ningún loop de fetch/reconcile toca — el comentario
--   queda fuera para siempre.
--
-- deleted_at / deleted_by_user_id dejan rastro de auditoría (quién y
-- cuándo borró), útil si Pedro quiere revisar moderación después.

-- 1. Ampliar el CHECK constraint de status para incluir 'deleted'.
ALTER TABLE comentarios_inbox DROP CONSTRAINT IF EXISTS comentarios_inbox_status_check;
ALTER TABLE comentarios_inbox ADD CONSTRAINT comentarios_inbox_status_check
  CHECK (status IN ('pending', 'approved', 'responded', 'skipped', 'failed', 'deleted'));

-- 2. Columnas de auditoría del borrado.
ALTER TABLE comentarios_inbox
  ADD COLUMN IF NOT EXISTS deleted_at          timestamptz,
  ADD COLUMN IF NOT EXISTS deleted_by_user_id  uuid REFERENCES auth.users(id);

COMMENT ON COLUMN comentarios_inbox.deleted_at IS
  'Timestamp cuando se eliminó el comentario (hate). El row se conserva como rastro de moderación pero no aparece en el inbox.';
COMMENT ON COLUMN comentarios_inbox.deleted_by_user_id IS
  'Usuario que eliminó el comentario. Auditoría de moderación.';
