-- Migración 006 — Storage bucket para PNGs de grillas
-- Aplicada: 2026-05-18 (Task 11 Plan 1)

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'grillas-png',
  'grillas-png',
  false,  -- privado, accedemos con signed URLs
  10485760,  -- 10 MB max
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- Policy: authenticated users pueden leer
CREATE POLICY "Authenticated users can read grillas"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'grillas-png');

-- Policy: service_role puede insertar (lo hace la routine)
CREATE POLICY "Service role can insert grillas"
ON storage.objects FOR INSERT
TO service_role
WITH CHECK (bucket_id = 'grillas-png');
