-- Planificador de historias compartido (Instagram/TikTok Stories).
-- Ticket soporte e7e50df4-92ac-4855-8fc5-23171a14ed5f (PEDRO).
-- Ailyn (diseño) + Lorena (publicaciones) + directores/admin gestionan CRUD.
-- Las historias se reflejan en el calendario de Publicaciones como chips cortos.

CREATE TABLE IF NOT EXISTS public.historias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  marca_id uuid NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  titulo text NOT NULL,
  fecha date NOT NULL,
  hora time without time zone,
  plataformas text[] NOT NULL DEFAULT ARRAY['Instagram']::text[],
  copy text,
  nota text,
  estado text NOT NULL DEFAULT 'planificada'
    CHECK (estado IN ('planificada', 'lista', 'publicada', 'cancelada')),
  created_by uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.historias IS
  'Stories planificadas (IG/TikTok) compartidas entre Diseño y Publicaciones. Se muestran compactas en el calendario de /publicaciones.';

CREATE INDEX IF NOT EXISTS idx_historias_fecha ON public.historias(fecha);
CREATE INDEX IF NOT EXISTS idx_historias_marca_fecha ON public.historias(marca_id, fecha);
CREATE INDEX IF NOT EXISTS idx_historias_estado ON public.historias(estado);

DROP TRIGGER IF EXISTS historias_set_updated_at ON public.historias;
CREATE TRIGGER historias_set_updated_at
  BEFORE UPDATE ON public.historias
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE public.historias ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS historias_service_all ON public.historias;
CREATE POLICY historias_service_all ON public.historias
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS historias_authenticated_read ON public.historias;
CREATE POLICY historias_authenticated_read ON public.historias
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Escrituras van por service client en server actions (autorización en app).
DROP POLICY IF EXISTS historias_authenticated_write ON public.historias;
CREATE POLICY historias_authenticated_write ON public.historias
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
