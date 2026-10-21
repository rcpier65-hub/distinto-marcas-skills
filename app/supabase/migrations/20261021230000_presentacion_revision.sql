-- Revisión de la propuesta que escribió la presentación por última vez.
-- Si en Planes se editó después (revisión distinta), la presentación ya no la sobrescribe.
alter table public.presentacion_sesiones add column if not exists propuesta_revision integer;
