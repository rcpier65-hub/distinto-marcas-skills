-- Módulo "Checklist de video" — flujo propio de Erick (solo él).
--
-- Pedro (07-jul-2026): Erick maneja la cuenta personal de Pedro y la de la
-- agencia. En SU propia interfaz se auto-organiza: crea la tarea "hoy grabé X,
-- tengo que editar Y", la marca como editada, y con la CHECKLIST (la Guía de
-- Ganchos, sus 7 secciones) verifica si el video está apto. Solo si cumple los
-- 12 requisitos puede APROBARLO → se agenda una fecha y se programa
-- automáticamente en la grilla de Distinto Agencia. Nadie le asigna videos:
-- Erick hace todo el trabajo.
--
-- Tabla independiente (no es publicacion hasta que se aprueba). Al aprobar se
-- crea la publicacion en la grilla y se guarda su id en publicacion_id.

CREATE TABLE IF NOT EXISTS public.videos_erick (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- dueño del video (Erick). Para escalar, no se hardcodea el nombre.
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  titulo text NOT NULL,
  -- cuenta/marca destino donde se publicará (default Distinto Agencia).
  cuenta_slug text NOT NULL DEFAULT 'distinto-agencia',
  -- por_editar → editado → aprobado
  estado text NOT NULL DEFAULT 'por_editar',
  -- {r1..r12: true} — qué requisitos de la checklist están marcados.
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb,
  fecha_grabado date,
  aprobado_at timestamptz,
  -- fecha que se agenda al aprobar (se refleja en la grilla).
  fecha_publicacion date,
  -- publicacion creada en la grilla al aprobar (para no duplicar / poder abrirla).
  publicacion_id uuid REFERENCES public.publicaciones(id) ON DELETE SET NULL,
  created_by uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS videos_erick_owner_idx ON public.videos_erick (team_member_id);
CREATE INDEX IF NOT EXISTS videos_erick_estado_idx ON public.videos_erick (estado);
