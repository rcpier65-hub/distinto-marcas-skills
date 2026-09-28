-- Imágenes en el chat interno (capturas, fotos del celular).
-- Pedro 24-sep-2026: "enviar emojis, capturas de pantalla arrastrando, o
-- poniendo desde el cel, cópiate de Telegram".
--
-- El archivo vive en un bucket PRIVADO (`chat`), comprimido en el navegador
-- (~200 KB). En la fila guardamos la ruta con prefijo de proveedor
-- ('sb:' Supabase Storage hoy; 'r2:' Cloudflare R2 cuando se configure) para
-- poder cambiar de proveedor sin romper imágenes viejas. Se leen con URLs
-- firmadas que genera el servidor solo para los participantes.
--
-- Aditiva: agrega columnas y relaja el CHECK de texto (un mensaje puede ser
-- solo una imagen).

ALTER TABLE public.mensajes_directos
  ADD COLUMN IF NOT EXISTS adjunto_path  text,
  ADD COLUMN IF NOT EXISTS adjunto_tipo  text,
  ADD COLUMN IF NOT EXISTS adjunto_ancho int,
  ADD COLUMN IF NOT EXISTS adjunto_alto  int,
  ADD COLUMN IF NOT EXISTS adjunto_bytes int;

ALTER TABLE public.mensajes_directos DROP CONSTRAINT IF EXISTS mensajes_directos_texto_check;
ALTER TABLE public.mensajes_directos ADD CONSTRAINT mensajes_directos_texto_check CHECK (
  char_length(texto) <= 4000
  AND (char_length(btrim(texto)) >= 1 OR adjunto_path IS NOT NULL)
);

-- Bucket privado, máx. 5 MB por archivo, solo imágenes. Sin policies para
-- anon/authenticated: todo pasa por URLs firmadas del servidor.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('chat', 'chat', false, 5242880, ARRAY['image/webp', 'image/jpeg', 'image/png', 'image/gif'])
ON CONFLICT (id) DO NOTHING;
