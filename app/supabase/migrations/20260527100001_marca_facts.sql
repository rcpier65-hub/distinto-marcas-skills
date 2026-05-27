-- Migration 022 — marca_facts
--
-- Tabla CANON de datos por marca. El sistema (Routine, app, scripts)
-- consulta acá los datos verificables que NO deben inventarse:
--   - Naming actual (rebrandings, ej Little Joe → Typhouse)
--   - URLs activas (typhouse.pe no littlejoe.pe)
--   - WhatsApp principal
--   - Puntos de venta físicos / próximamente
--   - Datos numéricos de producto (calorías, precios, dimensiones)
--   - Guardrails de voz: qué frases nunca usar / qué frases canon
--
-- Por qué necesitamos esto:
--   En la ronda 1 del ejercicio, el modelo dijo "Little Joe / littlejoe.pe /
--   te escribo al interno con info" cuando la realidad ya era
--   "Typhouse / typhouse.pe / ingresa a la web o escríbenos al WhatsApp".
--   La info estaba en la skill local pero el modelo no la consultaba.
--   Esta tabla resuelve eso: cada corrida de Routine pega un GET acá ANTES
--   de redactar, y obtiene la verdad fresca.
--
-- Estructura:
--   - 1-1 con marcas (marca_id PK, no FK con autoincrement)
--   - Campos simples = columns típicas
--   - Campos variables por marca (productos_datos) = JSONB
--   - Listas (puntos_venta, frases) = TEXT[]
--   - trigger updated_at para tracking

CREATE TABLE IF NOT EXISTS marca_facts (
  marca_id UUID PRIMARY KEY REFERENCES marcas(id) ON DELETE CASCADE,

  -- Naming + canales primarios
  nombre_comercial TEXT,
  web_principal TEXT,
  whatsapp_principal TEXT,

  -- Puntos de venta físicos
  -- Ej Typhouse: ['Sodimac', 'Totus']
  puntos_venta TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Ej Typhouse: ['Rosatel']
  proximamente TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Datos de producto verificables (shape libre por marca)
  -- Ej Warrior: { "barra_warrior_crunch": { "kcal": 100, "proteina_g": 20, "precio_unit": 13, "precio_3x": 30, "precio_caja12": 115, "sabores": ["Banoffee", "Mocha", ...] } }
  productos_datos JSONB DEFAULT '{}'::jsonb,

  -- Guardrails de voz
  -- Frases que NUNCA debe usar el modelo (URLs viejas, frases genéricas)
  frases_prohibidas TEXT[] DEFAULT ARRAY[]::TEXT[],
  -- Frases canon que SI debe usar (CTAs específicos por marca)
  frases_canon TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Notas libres del operador para contexto
  notas TEXT,

  -- Auditoría
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger para updated_at automático
CREATE OR REPLACE FUNCTION trg_marca_facts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS marca_facts_updated_at ON marca_facts;
CREATE TRIGGER marca_facts_updated_at
  BEFORE UPDATE ON marca_facts
  FOR EACH ROW EXECUTE FUNCTION trg_marca_facts_updated_at();

-- RLS: solo service role lee/escribe (consistente con resto de tablas core)
ALTER TABLE marca_facts ENABLE ROW LEVEL SECURITY;

CREATE POLICY marca_facts_service_all ON marca_facts
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permitir SELECT a authenticated (UI Settings lee)
CREATE POLICY marca_facts_authenticated_read ON marca_facts
  FOR SELECT
  TO authenticated
  USING (true);

-- COMENTARIOS para documentación in-DB
COMMENT ON TABLE marca_facts IS
  'Datos canon por marca. Consultados por la Routine antes de redactar respuestas para evitar inventar URLs/precios/naming.';

COMMENT ON COLUMN marca_facts.productos_datos IS
  'JSONB libre por marca. Ej Warrior: { "barra": { "kcal": 100, "precio": 13 } }. La Routine lo lee como contexto adicional.';

COMMENT ON COLUMN marca_facts.frases_prohibidas IS
  'Frases que el modelo NUNCA debe escribir. Ej Typhouse: ["littlejoe.pe", "te escribo al interno con info"]. La Routine las usa como guardrail explícito en el prompt.';

COMMENT ON COLUMN marca_facts.frases_canon IS
  'Frases canon que el modelo PREFIERE usar como CTAs. Ej Typhouse: ["Ingresa a typhouse.pe", "Escríbenos al 📲 912 568 107"].';
