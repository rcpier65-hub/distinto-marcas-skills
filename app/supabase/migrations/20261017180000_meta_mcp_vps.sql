BEGIN;
CREATE TABLE IF NOT EXISTS public.meta_mcp_connections (
  marca_id uuid PRIMARY KEY REFERENCES public.marcas(id) ON DELETE CASCADE,
  authorized_by uuid NOT NULL REFERENCES auth.users(id),
  tokens_encrypted text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  ad_account_id text,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.meta_mcp_oauth_states (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  marca_id uuid NOT NULL REFERENCES public.marcas(id) ON DELETE CASCADE,
  verifier_encrypted text NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.meta_mcp_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_mcp_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_mcp_connections, public.meta_mcp_oauth_states FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.meta_mcp_connections, public.meta_mcp_oauth_states TO service_role;
COMMENT ON TABLE public.meta_mcp_connections IS 'Meta Ads MCP authorizations by brand, encrypted in the server. No browser grants.';
COMMIT;
