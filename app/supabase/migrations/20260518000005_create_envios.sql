-- Migración 005 — Tabla envios (log de mensajes enviados)
-- Aplicada: 2026-05-18 (Task 10 Plan 1)

CREATE TABLE envios (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grilla_id     uuid NOT NULL REFERENCES grillas_pendientes(id) ON DELETE CASCADE,
  marca_id      uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  tipo          tipo_envio NOT NULL,
  destino       text NOT NULL,
  caption       text,
  mensaje_id    text,
  success       boolean NOT NULL DEFAULT false,
  error         text,
  metadata      jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_envios_grilla ON envios(grilla_id);
CREATE INDEX idx_envios_marca ON envios(marca_id);
CREATE INDEX idx_envios_success ON envios(success);
CREATE INDEX idx_envios_created ON envios(created_at DESC);

COMMENT ON TABLE envios IS 'Log de cada envío realizado (WhatsApp grupo, DM, email)';
