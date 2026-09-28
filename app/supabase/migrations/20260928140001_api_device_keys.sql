-- Claves de dispositivo (PAT) para Nay/Kairos.
-- Idempotente: si la tabla ya existe en Supabase (deploy del 27-sep), no la recrea.
-- El plaintext (dst_live_ + secreto) se muestra una sola vez al crear.
-- Acá solo se guarda SHA-256 hex. El service role de las API routes lee el hash;
-- el dueño autenticado puede ver metadata de sus filas y nunca key_hash.
-- Proyecto: SISTEMA DE GRILLA (exhmimlehdisonjvedvx).

CREATE TABLE IF NOT EXISTS public.api_device_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_member_id uuid REFERENCES public.team_members(id) ON DELETE SET NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  key_prefix text NOT NULL CHECK (key_prefix ~ '^dst_live_[A-Za-z0-9_-]{8}$'),
  key_hash text NOT NULL CHECK (key_hash ~ '^[0-9a-f]{64}$'),
  scopes text[] NOT NULL DEFAULT ARRAY['tareas:read']::text[] CHECK (cardinality(scopes) >= 1),
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  last_used_at timestamptz
);

COMMENT ON TABLE public.api_device_keys IS
  'PAT por dispositivo. key_hash es SHA-256 hex del token dst_live_…. No devolver el hash al cliente.';

COMMENT ON COLUMN public.api_device_keys.key_hash IS
  'SHA-256 hex (UTF-8) del token completo. Sin GRANT para authenticated.';

COMMENT ON COLUMN public.api_device_keys.team_member_id IS
  'Membresía al crear la clave. NULL = alcance CEO (sin fila en team_members). El alcance en GET /api/v1/tareas se resuelve en vivo, igual que el JWT.';

COMMENT ON COLUMN public.api_device_keys.key_prefix IS
  'dst_live_ + 8 caracteres del secreto, para identificar la clave en la UI.';

CREATE UNIQUE INDEX IF NOT EXISTS api_device_keys_key_hash_uidx
  ON public.api_device_keys (key_hash);

CREATE INDEX IF NOT EXISTS api_device_keys_user_created_idx
  ON public.api_device_keys (user_id, created_at DESC);

ALTER TABLE public.api_device_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.api_device_keys FROM PUBLIC;
REVOKE ALL ON TABLE public.api_device_keys FROM anon;
REVOKE ALL ON TABLE public.api_device_keys FROM authenticated;

GRANT ALL ON TABLE public.api_device_keys TO service_role;

GRANT SELECT (
  id,
  user_id,
  team_member_id,
  name,
  key_prefix,
  scopes,
  created_at,
  revoked_at,
  last_used_at
) ON public.api_device_keys TO authenticated;

DROP POLICY IF EXISTS api_device_keys_owner_select ON public.api_device_keys;
CREATE POLICY api_device_keys_owner_select
  ON public.api_device_keys
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS api_device_keys_service_all ON public.api_device_keys;
CREATE POLICY api_device_keys_service_all
  ON public.api_device_keys
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

NOTIFY pgrst, 'reload schema';
