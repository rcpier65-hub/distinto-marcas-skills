-- Migration 025 — video_sin_musica_url + video_con_musica_url
--
-- Cada publicación tiene 2 versiones del video editado:
--   1. Sin música (para Instagram que no permite pista propia en algunos
--      tipos, o cuando Pedro quiere agregar trending audio manualmente)
--   2. Con música (versión "final" lista para subir tal cual)
--
-- El editor sube AMBOS al Drive y pega los URLs acá. Pedro entra a la
-- publicación desde su celular y descarga el que necesite en el momento.

ALTER TABLE publicaciones
  ADD COLUMN IF NOT EXISTS video_sin_musica_url TEXT,
  ADD COLUMN IF NOT EXISTS video_con_musica_url TEXT;

COMMENT ON COLUMN publicaciones.video_sin_musica_url IS
  'URL Drive del video editado SIN música — para subir a IG con audio trending manual';
COMMENT ON COLUMN publicaciones.video_con_musica_url IS
  'URL Drive del video editado CON música — versión final lista para subir tal cual';
