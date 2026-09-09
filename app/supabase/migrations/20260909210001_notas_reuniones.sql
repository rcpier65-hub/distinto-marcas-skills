-- Módulo «Notas y reuniones» (Granola-style MVP).
-- Tabla notas_reuniones: notas con transcripción (Web Speech API) + chat
-- grounded en transcript/cuerpo. Supabase project exhmimlehdisonjvedvx.
-- NO toca app/app/reunion (WebRTC Meet).

CREATE TABLE IF NOT EXISTS public.notas_reuniones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  titulo text NOT NULL DEFAULT 'Nueva nota',
  cuerpo text NOT NULL DEFAULT '',
  transcript text NOT NULL DEFAULT '',
  chat jsonb NOT NULL DEFAULT '[]'::jsonb,
  estado text NOT NULL DEFAULT 'borrador'
    CHECK (estado IN ('borrador', 'en_curso', 'finalizada')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notas_reuniones IS
  'Notas y reuniones con transcripción (browser Web Speech API) y chat IA grounded en transcript+cuerpo. Ruta /notas-reuniones — independiente de /reunion (WebRTC).';

CREATE INDEX IF NOT EXISTS idx_notas_reuniones_member_updated
  ON public.notas_reuniones(team_member_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notas_reuniones_estado
  ON public.notas_reuniones(estado);
CREATE INDEX IF NOT EXISTS idx_notas_reuniones_created
  ON public.notas_reuniones(created_at DESC);

DROP TRIGGER IF EXISTS notas_reuniones_set_updated_at ON public.notas_reuniones;
CREATE TRIGGER notas_reuniones_set_updated_at
  BEFORE UPDATE ON public.notas_reuniones
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_timestamp();

ALTER TABLE public.notas_reuniones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notas_reuniones_service_all ON public.notas_reuniones;
CREATE POLICY notas_reuniones_service_all ON public.notas_reuniones
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS notas_reuniones_authenticated_read ON public.notas_reuniones;
CREATE POLICY notas_reuniones_authenticated_read ON public.notas_reuniones
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (true);

-- Escrituras van por service client en server actions (autorización en app).
DROP POLICY IF EXISTS notas_reuniones_authenticated_write ON public.notas_reuniones;
CREATE POLICY notas_reuniones_authenticated_write ON public.notas_reuniones
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
