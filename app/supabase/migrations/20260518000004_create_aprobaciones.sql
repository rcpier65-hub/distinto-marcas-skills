-- Migración 004 — Tabla aprobaciones (auditoría)
-- Aplicada: 2026-05-18 (Task 9 Plan 1)

CREATE TABLE aprobaciones (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  grilla_id   uuid NOT NULL REFERENCES grillas_pendientes(id) ON DELETE CASCADE,
  usuario_id  uuid,
  accion      accion_aprobacion NOT NULL,
  via         via_aprobacion NOT NULL,
  comentario  text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_aprobaciones_grilla ON aprobaciones(grilla_id);
CREATE INDEX idx_aprobaciones_usuario ON aprobaciones(usuario_id);
CREATE INDEX idx_aprobaciones_created ON aprobaciones(created_at DESC);

COMMENT ON TABLE aprobaciones IS 'Log de auditoría: cada acción de aprobación/rechazo/regen';
