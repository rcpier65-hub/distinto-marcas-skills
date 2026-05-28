-- Migration 024 — author_display_name + author_avatar_url
--
-- Facebook devuelve solo el user_id numérico (ej 27376424491951608) como
-- "owner" del comentario, NO un username público (porque FB no tiene
-- @handles universales como Instagram).
--
-- El nombre legible ("Deysi Espinal") vive en participants[].name de la
-- respuesta de Metricool, pero el wrapper actual NO lo extraía.
--
-- Esta migration agrega 2 columnas para guardar lo legible:
--   - author_display_name: nombre humano para mostrar en UI (ej "Maria Lopez")
--   - author_avatar_url:   URL de foto de perfil (también viene en participants)
--
-- Ambas nullable porque en Instagram el username YA es legible y no necesitamos
-- el campo extra. Backfill se hace via MCP de Distinto + endpoint debug.

ALTER TABLE comentarios_inbox
  ADD COLUMN IF NOT EXISTS author_display_name TEXT,
  ADD COLUMN IF NOT EXISTS author_avatar_url   TEXT;

COMMENT ON COLUMN comentarios_inbox.author_display_name IS
  'Nombre humano del autor (extraído de participants[].name). Para FB es necesario porque "owner" es solo el user_id. Para IG suele coincidir con author_username.';

COMMENT ON COLUMN comentarios_inbox.author_avatar_url IS
  'URL de foto de perfil (extraída de participants[].imageProfileUrl). Para enriquecer la UI con avatars.';
