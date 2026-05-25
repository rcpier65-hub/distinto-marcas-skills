-- Migración 020 — Tabla `integraciones` (singleton)
--
-- Configuración de integraciones externas (API tokens, OAuth refresh tokens, etc).
-- Singleton row enforced con CHECK (id = 1) — solo existe 1 fila en la tabla.
-- Esto modela el hecho de que la app tiene UNA cuenta Metricool, UNA Google Calendar
-- vinculada, etc.
--
-- Si en el futuro tu equipo tiene múltiples cuentas (1 Metricool por workspace),
-- migramos a tabla con workspace_id.
--
-- SEGURIDAD: RLS estricto (solo authenticated users via service client).
-- Los tokens nunca salen del server — UI muestra masked ('••••••••') excepto
-- el momento del save.

CREATE TABLE IF NOT EXISTS integraciones (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),  -- singleton
  metricool_user_id text,
  metricool_user_token text,
  google_calendar_refresh_token text,         -- futuro P19-G4
  google_calendar_id text,                     -- futuro P19-G4 (calendar destino)
  notion_token text,                           -- futuro
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by_user_id uuid REFERENCES auth.users(id)
);

-- Insertar la única fila si no existe
INSERT INTO integraciones (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- RLS estricto
ALTER TABLE integraciones ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "auth select integraciones" ON integraciones;
CREATE POLICY "auth select integraciones" ON integraciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "auth update integraciones" ON integraciones;
CREATE POLICY "auth update integraciones" ON integraciones FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
-- No DELETE, no INSERT — el row siempre existe (id=1)

CREATE OR REPLACE FUNCTION trigger_set_integraciones_updated_at()
RETURNS trigger AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS set_integraciones_updated_at ON integraciones;
CREATE TRIGGER set_integraciones_updated_at BEFORE UPDATE ON integraciones
  FOR EACH ROW EXECUTE FUNCTION trigger_set_integraciones_updated_at();

COMMENT ON TABLE integraciones IS
  'Configuración de integraciones externas (singleton row, id=1). Tokens nunca exposed al cliente — UI muestra masked.';
