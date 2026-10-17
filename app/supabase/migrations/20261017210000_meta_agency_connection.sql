BEGIN;
CREATE TABLE IF NOT EXISTS public.meta_agency_connection (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  authorized_by uuid NOT NULL REFERENCES auth.users(id),
  tokens_encrypted text NOT NULL,
  token_context text NOT NULL DEFAULT 'meta-agency',
  scopes text[] NOT NULL DEFAULT '{}',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.meta_brand_accounts (
  marca_id uuid PRIMARY KEY REFERENCES public.marcas(id) ON DELETE CASCADE,
  ad_account_id text CHECK(ad_account_id ~ '^[0-9]+$'),
  facebook_page_id text CHECK(facebook_page_id ~ '^[0-9]+$'),
  instagram_user_id text CHECK(instagram_user_id ~ '^[0-9]+$'),
  display_data jsonb NOT NULL DEFAULT '{}',
  configured_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.meta_agency_oauth_states (
  state_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  verifier_encrypted text NOT NULL,
  expires_at timestamptz NOT NULL
);
ALTER TABLE public.meta_agency_connection ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_brand_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meta_agency_oauth_states ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.meta_agency_connection,public.meta_brand_accounts,public.meta_agency_oauth_states FROM PUBLIC,anon,authenticated;
GRANT ALL ON public.meta_agency_connection,public.meta_brand_accounts,public.meta_agency_oauth_states TO service_role;
-- Adopt the only existing encrypted grant without requesting another login or
-- widening its permissions. Preserve its AAD until the next authorized refresh.
INSERT INTO public.meta_agency_connection(id,authorized_by,tokens_encrypted,token_context,scopes,expires_at,created_at,updated_at)
SELECT true,authorized_by,tokens_encrypted,'meta-mcp:'||marca_id::text,scopes,expires_at,created_at,updated_at
FROM public.meta_mcp_connections WHERE (SELECT count(*) FROM public.meta_mcp_connections)=1
ON CONFLICT(id) DO NOTHING;
INSERT INTO public.meta_brand_accounts(marca_id,ad_account_id,configured_by)
SELECT marca_id,ad_account_id,authorized_by FROM public.meta_mcp_connections WHERE ad_account_id IS NOT NULL
ON CONFLICT(marca_id) DO NOTHING;
COMMENT ON TABLE public.meta_agency_connection IS 'Single agency Meta OAuth grant, encrypted; no credentials per brand.';
COMMENT ON TABLE public.meta_brand_accounts IS 'Brand-selected Meta assets only. No tokens or independent OAuth grants.';
COMMIT;
