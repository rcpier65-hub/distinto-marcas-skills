-- Chat grupal "Equipo Distinto" (todo el equipo en una conversación).
-- Pedro 24-sep-2026: "me falta una opción para enviar un mensaje general para
-- todos; si quiero algo tengo que escribir uno por uno".
--
-- mensajes_grupo: los mensajes (texto y/o imagen, igual que los directos).
-- mensajes_grupo_lecturas: hasta cuándo leyó cada miembro (para el contador
-- de no leídos).
-- Lectura (y Realtime): solo miembros ACTIVOS del equipo. Escritura: server
-- actions con service client. Aditiva.

CREATE TABLE IF NOT EXISTS public.mensajes_grupo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  de_id          uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  texto          text NOT NULL DEFAULT '',
  adjunto_path   text,
  adjunto_tipo   text,
  adjunto_ancho  int,
  adjunto_alto   int,
  adjunto_bytes  int,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (char_length(texto) <= 4000 AND (char_length(btrim(texto)) >= 1 OR adjunto_path IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS mensajes_grupo_created_idx ON public.mensajes_grupo (created_at DESC);

CREATE TABLE IF NOT EXISTS public.mensajes_grupo_lecturas (
  team_member_id uuid PRIMARY KEY REFERENCES public.team_members(id) ON DELETE CASCADE,
  leido_hasta    timestamptz NOT NULL DEFAULT now()
);

-- ¿La sesión actual es un miembro activo del equipo? (SECURITY DEFINER para
-- no depender de las policies de team_members.)
CREATE OR REPLACE FUNCTION public.soy_miembro_activo()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.team_members WHERE auth_user_id = auth.uid() AND activo)
$$;
REVOKE ALL ON FUNCTION public.soy_miembro_activo() FROM public;
GRANT EXECUTE ON FUNCTION public.soy_miembro_activo() TO authenticated;

ALTER TABLE public.mensajes_grupo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mensajes_grupo_lecturas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mensajes_grupo_service_all ON public.mensajes_grupo;
CREATE POLICY mensajes_grupo_service_all ON public.mensajes_grupo
  FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS mensajes_grupo_equipo_select ON public.mensajes_grupo;
CREATE POLICY mensajes_grupo_equipo_select ON public.mensajes_grupo
  FOR SELECT TO authenticated USING (public.soy_miembro_activo());

DROP POLICY IF EXISTS mensajes_grupo_lecturas_service_all ON public.mensajes_grupo_lecturas;
CREATE POLICY mensajes_grupo_lecturas_service_all ON public.mensajes_grupo_lecturas
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_grupo;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
