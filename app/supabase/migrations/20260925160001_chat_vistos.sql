-- Chat: "visto" y doble check como WhatsApp. Pedro 24-sep-2026.
--   ✓   enviado
--   ✓✓  entregado (le llegó a la app de la otra persona) → entregado_at
--   ✓✓ azul: leído → leido_at (ya existía)
-- Grupo: cada miembro guarda "leído hasta" (mensajes_grupo_lecturas); ahora
-- el equipo puede leer esa tabla (y por Realtime) para ver quién ya lo vio.
-- Aditiva.

ALTER TABLE public.mensajes_directos ADD COLUMN IF NOT EXISTS entregado_at timestamptz;

DROP POLICY IF EXISTS mensajes_grupo_lecturas_equipo_select ON public.mensajes_grupo_lecturas;
CREATE POLICY mensajes_grupo_lecturas_equipo_select ON public.mensajes_grupo_lecturas
  FOR SELECT TO authenticated USING (public.soy_miembro_activo());

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mensajes_grupo_lecturas;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
