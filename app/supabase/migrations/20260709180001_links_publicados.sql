-- Portal cliente: links del post publicado (TikTok / Instagram) que el
-- trabajador pega y el cliente ve. Pedro 09-jul-2026.
ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS link_tiktok text;
ALTER TABLE publicaciones ADD COLUMN IF NOT EXISTS link_instagram text;
