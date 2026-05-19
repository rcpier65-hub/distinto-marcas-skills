-- Migración 003 — Tabla grillas_pendientes (ciclo de aprobación)
-- Aplicada: 2026-05-18 (Task 8 Plan 1)

CREATE TABLE grillas_pendientes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id            uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  semana_inicio       date NOT NULL,
  semana_fin          date NOT NULL,
  estado              estado_grilla NOT NULL DEFAULT 'pendiente',
  pedida_por          uuid,
  pedida_at           timestamptz NOT NULL DEFAULT now(),
  procesada_at        timestamptz,
  aprobada_at         timestamptz,
  enviada_at          timestamptz,
  cancelada_at        timestamptz,
  png_url             text,
  png_storage_path    text,
  caption             text,
  mensaje_id_pedro    text,
  mensaje_id_cliente  text,
  publicaciones_count integer,
  notion_grilla_ids   jsonb,
  notas               text,
  error               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_grilla_marca_semana UNIQUE (marca_id, semana_inicio),
  CONSTRAINT check_fechas CHECK (semana_fin >= semana_inicio)
);

CREATE INDEX idx_grillas_marca ON grillas_pendientes(marca_id);
CREATE INDEX idx_grillas_estado ON grillas_pendientes(estado);
CREATE INDEX idx_grillas_semana ON grillas_pendientes(semana_inicio DESC);
CREATE INDEX idx_grillas_pedida_at ON grillas_pendientes(pedida_at DESC);

CREATE TRIGGER set_timestamp_grillas
BEFORE UPDATE ON grillas_pendientes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

COMMENT ON TABLE grillas_pendientes IS 'Grillas semanales en el ciclo de aprobación';
COMMENT ON COLUMN grillas_pendientes.notion_grilla_ids IS 'Array JSON de IDs Notion de las publicaciones incluidas en esta grilla';
