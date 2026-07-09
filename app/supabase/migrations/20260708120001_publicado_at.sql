-- Rediseño de "Publicar hoy": registrar CUÁNDO se confirmó la publicación.
-- Pedro 08-jul-2026: botón "Confirmar publicación" → marca publicado y notifica.
-- publicado_at sirve para el historial de la semana y para saber la hora real
-- en que se publicó (distinto de fecha_publicacion, que es el día agendado).
-- Aditivo, no toca datos.

ALTER TABLE publicaciones
  ADD COLUMN IF NOT EXISTS publicado_at timestamptz;

COMMENT ON COLUMN publicaciones.publicado_at IS
  'Cuándo se confirmó la publicación en "Publicar hoy" (estado → publicado).';
