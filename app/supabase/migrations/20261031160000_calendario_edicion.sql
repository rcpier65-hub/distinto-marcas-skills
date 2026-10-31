BEGIN;
-- Conserva título/Meet y los datos específicos al corregir el tipo sin duplicar eventos.
ALTER TABLE public.grabaciones ADD COLUMN IF NOT EXISTS titulo text;
ALTER TABLE public.grabaciones ADD COLUMN IF NOT EXISTS meet_link text;
ALTER TABLE public.grabaciones ADD COLUMN IF NOT EXISTS calendario_datos jsonb NOT NULL DEFAULT '{}';
ALTER TABLE public.marca_reuniones ADD COLUMN IF NOT EXISTS calendario_datos jsonb NOT NULL DEFAULT '{}';
NOTIFY pgrst, 'reload schema';
COMMIT;
