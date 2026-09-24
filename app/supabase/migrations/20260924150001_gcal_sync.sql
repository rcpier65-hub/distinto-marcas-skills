-- Sincronización automática del Calendario con Google Calendar.
-- Pedro 24-sep-2026: "el calendario debe sincronizar todos los eventos con
-- google calendar" — desde el mes actual en adelante + todo lo que se agende.
--
-- gcal_sync: qué evento de Google corresponde a cada cosa de la app
-- (publicaciones y fechas importantes). `firma` = fecha|título|… con la que se
-- escribió el evento: si la fila cambia, la firma deja de coincidir y el
-- sincronizador actualiza el evento. Si la fila se borra/archiva, el
-- sincronizador borra el evento. `error` guarda el último fallo (antes se
-- perdían en silencio).
--
-- gcal_sync_estado: una sola fila. Evita que dos sincronizaciones corran a la
-- vez y guarda el resultado de la última.
--
-- Solo service_role (server). Aditiva: no toca tablas existentes.

CREATE TABLE IF NOT EXISTS public.gcal_sync (
  tipo       text NOT NULL CHECK (tipo IN ('publicacion', 'fecha')),
  ref_id     uuid NOT NULL,
  event_id   text,
  firma      text,
  error      text,
  synced_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tipo, ref_id)
);

CREATE TABLE IF NOT EXISTS public.gcal_sync_estado (
  id               int PRIMARY KEY CHECK (id = 1),
  corriendo_desde  timestamptz,
  ultimo_fin       timestamptz,
  ultimo_resultado jsonb
);
INSERT INTO public.gcal_sync_estado (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.gcal_sync ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gcal_sync_estado ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gcal_sync_service_all ON public.gcal_sync;
CREATE POLICY gcal_sync_service_all ON public.gcal_sync
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS gcal_sync_estado_service_all ON public.gcal_sync_estado;
CREATE POLICY gcal_sync_estado_service_all ON public.gcal_sync_estado
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Toma el turno de sincronizar si nadie lo tiene (o si el último quedó
-- colgado > 5 min) y si pasó el intervalo mínimo desde la última vez.
-- Devuelve true si este proceso debe correr.
CREATE OR REPLACE FUNCTION public.gcal_sync_tomar_turno(intervalo_min_seg int)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.gcal_sync_estado
     SET corriendo_desde = now()
   WHERE id = 1
     AND (corriendo_desde IS NULL OR corriendo_desde < now() - interval '5 minutes')
     AND (ultimo_fin IS NULL OR ultimo_fin < now() - make_interval(secs => intervalo_min_seg))
  RETURNING true
$$;

REVOKE ALL ON FUNCTION public.gcal_sync_tomar_turno(int) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gcal_sync_tomar_turno(int) TO service_role;
