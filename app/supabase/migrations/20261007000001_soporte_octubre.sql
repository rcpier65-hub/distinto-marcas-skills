-- Reportes de soporte desde el 5 de octubre. Cambios aditivos.
ALTER TABLE public.publicaciones ADD COLUMN IF NOT EXISTS hora_publicacion time;
ALTER TABLE public.publicaciones ADD COLUMN IF NOT EXISTS indicaciones_edicion text;
CREATE TABLE IF NOT EXISTS public.recordatorios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  texto text NOT NULL CHECK (length(trim(texto)) BETWEEN 1 AND 500),
  listo boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.recordatorios ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'recordatorios' AND policyname = 'recordatorios_propios') THEN
    CREATE POLICY recordatorios_propios ON public.recordatorios FOR ALL TO authenticated USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());
  END IF;
END $$;
CREATE INDEX IF NOT EXISTS recordatorios_usuario ON public.recordatorios(auth_user_id, listo, created_at DESC);
NOTIFY pgrst, 'reload schema';
