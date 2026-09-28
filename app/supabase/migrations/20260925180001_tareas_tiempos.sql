-- Cronómetro de tareas para métricas. Pedro 24-sep-2026: "registra el tiempo:
-- que inicie el segundero en proceso y cuando pone terminado/listo se guarde,
-- para luego hacer métricas".
--
-- tareas.en_proceso_desde: inicio de la sesión que está corriendo (null = parado)
-- tareas.tiempo_seg:       total acumulado de todas las sesiones
-- tareas_tiempos:          una fila por sesión (iniciar → pausar / terminar),
--                          con persona y marca: base para métricas por
--                          persona, marca, día o tipo de tarea.
-- Aditiva.

ALTER TABLE public.tareas
  ADD COLUMN IF NOT EXISTS en_proceso_desde timestamptz,
  ADD COLUMN IF NOT EXISTS tiempo_seg integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.tareas_tiempos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tarea_id       uuid NOT NULL REFERENCES public.tareas(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  categoria      text,
  marca_slug     text,
  inicio         timestamptz NOT NULL,
  fin            timestamptz NOT NULL,
  segundos       integer NOT NULL CHECK (segundos >= 0),
  cierre         text NOT NULL DEFAULT 'pausa' CHECK (cierre IN ('pausa', 'terminada', 'estado')),
  created_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tareas_tiempos_tarea_idx ON public.tareas_tiempos (tarea_id);
CREATE INDEX IF NOT EXISTS tareas_tiempos_miembro_idx ON public.tareas_tiempos (team_member_id, inicio DESC);

ALTER TABLE public.tareas_tiempos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tareas_tiempos_service_all ON public.tareas_tiempos;
CREATE POLICY tareas_tiempos_service_all ON public.tareas_tiempos
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Tareas que YA estaban "en proceso": el cronómetro arranca ahora.
UPDATE public.tareas SET en_proceso_desde = now()
  WHERE estado = 'en_proceso' AND en_proceso_desde IS NULL AND NOT completada;
