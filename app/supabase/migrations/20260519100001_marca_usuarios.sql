-- Migración 010 — Tabla marca_usuarios (relación user → marcas que puede ver)
-- Aplicada: 2026-05-19 (Plan 5)

CREATE TABLE marca_usuarios (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id         uuid NOT NULL REFERENCES marcas(id) ON DELETE CASCADE,
  usuario_id       uuid,  -- FK soft a auth.users (puede ser null si solo hay invitación pendiente)
  email_invitacion text,  -- email antes de que se cree el usuario
  rol              rol_usuario NOT NULL DEFAULT 'cliente',
  invitado_por     uuid,
  invitado_at      timestamptz NOT NULL DEFAULT now(),
  aceptado_at      timestamptz,

  CONSTRAINT unique_marca_usuario UNIQUE (marca_id, usuario_id),
  CONSTRAINT user_or_email CHECK (usuario_id IS NOT NULL OR email_invitacion IS NOT NULL)
);

CREATE INDEX idx_marca_usuarios_marca ON marca_usuarios(marca_id);
CREATE INDEX idx_marca_usuarios_usuario ON marca_usuarios(usuario_id);
CREATE INDEX idx_marca_usuarios_email ON marca_usuarios(email_invitacion);

ALTER TABLE marca_usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios ven sus propias relaciones"
ON marca_usuarios FOR SELECT TO authenticated
USING (usuario_id = auth.uid());

CREATE POLICY "Service role full"
ON marca_usuarios FOR ALL TO service_role
USING (true) WITH CHECK (true);

COMMENT ON TABLE marca_usuarios IS 'Mapeo de usuarios a marcas que pueden ver/aprobar';
