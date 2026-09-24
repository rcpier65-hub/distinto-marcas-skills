-- Mensajes directos entre miembros del equipo (chat 1 a 1, solo texto).
-- Pedro 24-sep-2026: "un chat, solo texto, persona a persona".
--
-- A diferencia del resto de tablas (autorización en la app, RLS abierta), acá
-- la privacidad la garantiza la BASE: cada mensaje solo lo pueden leer quien
-- lo envía y quien lo recibe. Importa porque el navegador se suscribe por
-- Realtime con la sesión del usuario, y Realtime evalúa estas policies — sin
-- esto, cualquier sesión (incluidos clientes del portal) podría escuchar todo.
--
-- Escrituras: van por service client desde server actions (_actions.ts), que
-- fijan de_id con el miembro logueado. Por eso no hay policy de INSERT/UPDATE
-- para `authenticated`.
--
-- Es aditiva: no toca ninguna tabla existente.

CREATE TABLE IF NOT EXISTS public.mensajes_directos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  de_id       uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  para_id     uuid NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
  texto       text NOT NULL CHECK (char_length(btrim(texto)) BETWEEN 1 AND 4000),
  leido_at    timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CHECK (de_id <> para_id)
);

-- Conversación entre dos personas, en orden cronológico.
CREATE INDEX IF NOT EXISTS mensajes_directos_par_idx
  ON public.mensajes_directos (least(de_id, para_id), greatest(de_id, para_id), created_at DESC);
-- Contador de no leídos del destinatario.
CREATE INDEX IF NOT EXISTS mensajes_directos_no_leidos_idx
  ON public.mensajes_directos (para_id) WHERE leido_at IS NULL;

-- id del team_member de la sesión actual. SECURITY DEFINER para que la policy
-- no dependa de las policies de team_members.
CREATE OR REPLACE FUNCTION public.mi_team_member_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.team_members WHERE auth_user_id = auth.uid() LIMIT 1
$$;

REVOKE ALL ON FUNCTION public.mi_team_member_id() FROM public;
GRANT EXECUTE ON FUNCTION public.mi_team_member_id() TO authenticated;

ALTER TABLE public.mensajes_directos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mensajes_directos_service_all ON public.mensajes_directos;
CREATE POLICY mensajes_directos_service_all ON public.mensajes_directos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS mensajes_directos_participantes_select ON public.mensajes_directos;
CREATE POLICY mensajes_directos_participantes_select ON public.mensajes_directos
  FOR SELECT TO authenticated
  USING (public.mi_team_member_id() IN (de_id, para_id));

-- Realtime: los mensajes nuevos llegan al instante al chat abierto.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_directos;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
