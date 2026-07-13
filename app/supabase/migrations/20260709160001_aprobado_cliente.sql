-- Portal de clientes Fase 2: el cliente aprueba los videos desde su celular.
-- Al aprobar, se notifica a Lorena (y al equipo). Pedro 09-jul-2026.
ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS aprobado_cliente_at timestamptz;

COMMENT ON COLUMN publicaciones.aprobado_cliente_at IS
  'Cuándo el CLIENTE aprobó el video desde el portal. Notifica a Lorena.';
