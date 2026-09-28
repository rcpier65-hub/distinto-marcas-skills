-- Keep recoverable scripts separate from editable batch data so older clients
-- cannot erase them when saving. Existing RLS and service-only grants apply.
ALTER TABLE public.creative_batches
  ADD COLUMN IF NOT EXISTS deleted_scripts jsonb NOT NULL DEFAULT '[]'::jsonb
  CHECK (jsonb_typeof(deleted_scripts) = 'array');
