-- Etiquetas de marca múltiples en una sola tarea de diseño (Pedro 15-jun-2026:
-- "en una sola tarea etiquetar varias marcas", NO replicar en N tareas).
-- marca_id sigue siendo la marca PRINCIPAL; marcas_extra son etiquetas extra.
--
-- Activar: Supabase Dashboard → SQL Editor → pegar → Run.
-- Antes de correrlo, el código cae a modo degradado (solo marca principal),
-- no se rompe nada.

ALTER TABLE publicaciones
  ADD COLUMN IF NOT EXISTS marcas_extra uuid[] NOT NULL DEFAULT '{}';
