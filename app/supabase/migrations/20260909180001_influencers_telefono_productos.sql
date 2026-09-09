-- Influencers: teléfono + lista de productos enviados (Pedido Pedro / Distinto APP).
-- Proyecto Supabase: exhmimlehdisonjvedvx
-- Aplica manualmente si el runtime aún no auto-alteró la tabla.

ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS telefono text;

ALTER TABLE public.influencers
  ADD COLUMN IF NOT EXISTS productos_enviados text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.influencers.telefono IS
  'Teléfono de contacto del influencer (texto libre, opcional).';

COMMENT ON COLUMN public.influencers.productos_enviados IS
  'Nombres de productos enviados al influencer (lista libre text[]; sin catálogo master).';

-- Recargar schema cache de PostgREST (best-effort en SQL Editor)
-- NOTIFY pgrst, 'reload schema';
