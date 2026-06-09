-- 20260608210001_grabaciones_horas.sql
-- Agrega columnas opcionales de HORA para grabaciones planeadas/reales.
-- Pedro: "aqui quisiera que salga dia esta bien pero falta hora".
--
-- Diseño: columnas TIME separadas (no migrar fecha_planeada de date a
-- timestamptz) porque:
--   - El resto del código asume YYYY-MM-DD (slice(0,10), localeCompare,
--     formatters). Migrar el tipo rompe varios sitios.
--   - Hora es opcional (NULL = "solo día sin hora específica").
--   - Cambio puramente aditivo, idempotente, sin riesgo de data loss.

ALTER TABLE grabaciones
  ADD COLUMN IF NOT EXISTS hora_planeada time DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hora_real     time DEFAULT NULL;

COMMENT ON COLUMN grabaciones.hora_planeada IS
  'Hora opcional de la grabación planeada (HH:MM o HH:MM:SS). NULL = solo día sin hora específica.';
COMMENT ON COLUMN grabaciones.hora_real IS
  'Hora opcional de la grabación realmente realizada.';

NOTIFY pgrst, 'reload schema';
