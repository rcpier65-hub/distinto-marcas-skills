CREATE TABLE IF NOT EXISTS public.propuestas_comerciales (
  id uuid PRIMARY KEY,
  numero bigint GENERATED ALWAYS AS IDENTITY UNIQUE NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS propuestas_comerciales_owner ON public.propuestas_comerciales(created_by, updated_at DESC);
ALTER TABLE public.propuestas_comerciales ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.propuestas_comerciales FROM anon, authenticated;
GRANT ALL ON public.propuestas_comerciales TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.propuestas_comerciales_numero_seq TO service_role;
