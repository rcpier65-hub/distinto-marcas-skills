-- Migración 002 — Tabla marcas (catálogo de los 9 clientes)
-- Aplicada: 2026-05-18 (Task 7 Plan 1)

CREATE TABLE marcas (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                  text UNIQUE NOT NULL,
  nombre                text NOT NULL,
  decisor_nombre        text,
  decisor_tratamiento   text,
  decisor_whatsapp      text,
  grupo_whatsapp_nombre text,
  grupo_whatsapp_alias  text,
  tono_voz              jsonb,
  color_primario_hex    text,
  emoji_marca           text,
  activa                boolean NOT NULL DEFAULT true,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_marcas_slug ON marcas(slug);
CREATE INDEX idx_marcas_activa ON marcas(activa);

-- Trigger para auto-actualizar updated_at
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_timestamp_marcas
BEFORE UPDATE ON marcas
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE marcas IS 'Marcas activas que gestiona Agencia Distinto';
COMMENT ON COLUMN marcas.slug IS 'Identificador URL-safe (ej: manrique, little-joe)';
COMMENT ON COLUMN marcas.tono_voz IS 'Resumen estructurado de voz de marca para AI';
