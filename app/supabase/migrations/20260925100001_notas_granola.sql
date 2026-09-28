-- Notas y reuniones "estilo Granola". Pedro 24-sep-2026: "Granola graba,
-- transcribe y te dice los pasos a seguir; la quiero tal cual integrada en
-- Notas y reuniones, para Meet y en persona".
--
-- Cada nota puede quedar ligada a una reunión del calendario (marca_reuniones
-- o evento de Google) y a una marca. Al terminar, la IA "mejora" las notas
-- (resumen + decisiones + próximos pasos) y propone tareas con responsable;
-- el usuario las aprueba y se crean en Tareas.
--
-- Aditiva: solo agrega columnas (todas opcionales).

ALTER TABLE public.notas_reuniones
  ADD COLUMN IF NOT EXISTS marca_id          uuid REFERENCES public.marcas(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS marca_reunion_id  uuid,
  ADD COLUMN IF NOT EXISTS google_event_id   text,
  ADD COLUMN IF NOT EXISTS reunion_inicio    timestamptz,
  ADD COLUMN IF NOT EXISTS meet_link         text,
  ADD COLUMN IF NOT EXISTS modalidad         text CHECK (modalidad IN ('presencial', 'virtual')),
  ADD COLUMN IF NOT EXISTS plantilla         text NOT NULL DEFAULT 'general',
  -- Notas mejoradas por IA (markdown simple: ## títulos y - viñetas)
  ADD COLUMN IF NOT EXISTS resumen           text,
  -- Tareas propuestas: [{id, texto, responsableId, responsableNombre, fecha, tareaId}]
  ADD COLUMN IF NOT EXISTS acciones          jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS enhanced_at       timestamptz;

CREATE INDEX IF NOT EXISTS notas_reuniones_marca_idx ON public.notas_reuniones (marca_id);
CREATE INDEX IF NOT EXISTS notas_reuniones_mr_idx ON public.notas_reuniones (marca_reunion_id) WHERE marca_reunion_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS notas_reuniones_gev_idx ON public.notas_reuniones (google_event_id) WHERE google_event_id IS NOT NULL;
