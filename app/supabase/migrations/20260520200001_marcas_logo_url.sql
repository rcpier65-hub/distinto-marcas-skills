-- Migración 014 — Agregar logo_url a marcas
-- Pedro pega aquí la URL pública del logo (Drive, Imgur, o cualquier CDN).
-- Si está NULL, el renderer hace fallback a /marcas/{slug}/logo.png o .svg local.

ALTER TABLE marcas
  ADD COLUMN IF NOT EXISTS logo_url text;

COMMENT ON COLUMN marcas.logo_url IS
  'URL pública del logo de la marca. Si es Drive, usar formato de descarga directa: https://drive.google.com/uc?export=download&id=FILE_ID. Si es NULL, el renderer cae al placeholder local en /marcas/{slug}/logo.{png,svg}.';
