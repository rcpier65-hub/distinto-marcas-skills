-- Migración 017 — Cadencia de grabaciones + colores + Google Calendar mapping
--
-- Modela cómo se planifica cada marca (semanal vs mensual vs quincenal) +
-- cantidad por unidad. Lozano = ('semanal', 1) → 1 grabación cada semana.
-- Manrique = ('mensual', 2) → 2 grabaciones por mes.
-- Esto reemplaza el modelo anterior de "objetivo_mensual fijo" porque para
-- Lozano (1/semana) hay meses con 4 y otros con 5 semanas.
--
-- color_calendario: hex usado en la UI calendario (chips por marca) y en
-- Google Calendar (cada evento se pinta del color de su marca).
--
-- grabaciones.google_event_id: cuando push sync está activo, guardamos el
-- ID del evento en GCal para poder hacer update/delete sin re-crear.

ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS cadencia text DEFAULT 'mensual'
    CHECK (cadencia IN ('semanal', 'mensual', 'quincenal')),
  ADD COLUMN IF NOT EXISTS cadencia_cantidad integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS color_calendario text DEFAULT '#6366F1';

ALTER TABLE grabaciones
  ADD COLUMN IF NOT EXISTS google_event_id text;

CREATE INDEX IF NOT EXISTS idx_grabaciones_google_event
  ON grabaciones(google_event_id) WHERE google_event_id IS NOT NULL;

COMMENT ON COLUMN marcas.cadencia IS
  'Frecuencia de grabaciones: semanal | mensual | quincenal. Default mensual.';
COMMENT ON COLUMN marcas.cadencia_cantidad IS
  'Cuántas grabaciones por unidad de cadencia. Ej. (semanal, 1) = 1/semana. (mensual, 2) = 2/mes.';
COMMENT ON COLUMN marcas.color_calendario IS
  'Hex color para chips de calendar UI y eventos GCal. Default indigo #6366F1.';
COMMENT ON COLUMN grabaciones.google_event_id IS
  'ID del evento mapeado en Google Calendar (cuando push sync activo). NULL si la grabación nunca fue sincronizada.';

-- Seed cadencias por marca (info de Pedro, 23 may 2026)
UPDATE marcas SET cadencia='mensual', cadencia_cantidad=2, color_calendario='#3B82F6', grabaciones_objetivo_mensual=2 WHERE slug='manrique';
UPDATE marcas SET cadencia='semanal', cadencia_cantidad=1, color_calendario='#10B981', grabaciones_objetivo_mensual=4 WHERE slug='lozano';
UPDATE marcas SET cadencia='mensual', cadencia_cantidad=2, color_calendario='#EAB308', grabaciones_objetivo_mensual=2 WHERE slug='novalamps';
UPDATE marcas SET cadencia='mensual', cadencia_cantidad=2, color_calendario='#F97316', grabaciones_objetivo_mensual=2 WHERE slug='distribuidora-fitness';
UPDATE marcas SET cadencia='mensual', cadencia_cantidad=1, color_calendario='#84CC16', grabaciones_objetivo_mensual=1 WHERE slug='kintu';
UPDATE marcas SET cadencia='mensual', cadencia_cantidad=2, color_calendario='#92400E', grabaciones_objetivo_mensual=2 WHERE slug='la-victoria';
UPDATE marcas SET cadencia='mensual', cadencia_cantidad=2, color_calendario='#1FB3E8', grabaciones_objetivo_mensual=2 WHERE slug='little-joe';
