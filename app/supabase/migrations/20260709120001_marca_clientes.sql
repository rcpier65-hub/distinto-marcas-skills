-- Portal de clientes: cada marca puede tener uno o más usuarios "cliente" que
-- entran desde su celular a ver sus publicaciones y reciben push cuando se
-- publica su video. Pedro 09-jul-2026: prueba con Mil Ideas.
--
-- El cliente es un usuario de Supabase Auth (lo crea Pedro con un botón de
-- admin) vinculado a una marca. NO es team_member — el ruteo lo detecta y lo
-- manda a /cliente en vez del sistema interno.

CREATE TABLE IF NOT EXISTS public.marca_clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id uuid UNIQUE,          -- usuario de Supabase Auth
  marca_id uuid REFERENCES public.marcas(id) ON DELETE CASCADE,
  nombre text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS marca_clientes_marca_idx ON public.marca_clientes (marca_id);

-- Soporte de push para clientes: una suscripción push puede ser de un cliente
-- (marca_id) además de un miembro (team_member_id). Al publicar, se notifica a
-- los clientes de esa marca.
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS marca_id uuid REFERENCES public.marcas(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS push_subscriptions_marca_idx ON public.push_subscriptions (marca_id) WHERE marca_id IS NOT NULL;
