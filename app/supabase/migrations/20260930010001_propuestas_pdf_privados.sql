INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('propuestas-comerciales', 'propuestas-comerciales', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Aunque existan políticas generales en otros módulos, estas propuestas solo
-- se gestionan desde el servidor. El cliente recibe enlaces firmados temporales.
CREATE POLICY propuestas_storage_server_only ON storage.objects
AS RESTRICTIVE FOR ALL TO anon, authenticated
USING (bucket_id <> 'propuestas-comerciales')
WITH CHECK (bucket_id <> 'propuestas-comerciales');
