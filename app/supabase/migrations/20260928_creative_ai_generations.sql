CREATE TABLE IF NOT EXISTS public.creative_generations (
 id uuid PRIMARY KEY,
 batch_id uuid NOT NULL REFERENCES public.creative_batches(id) ON DELETE CASCADE,
 script_id uuid NOT NULL,
 created_by uuid NOT NULL REFERENCES auth.users(id),
 kind text NOT NULL CHECK(kind IN ('suggest', 'assess')),
 step integer NOT NULL CHECK(step BETWEEN 0 AND 8),
 request_key text NOT NULL UNIQUE,
 context_key text NOT NULL,
 input jsonb NOT NULL,
 result jsonb,
 model text NOT NULL,
 token_usage jsonb,
 estimated_cost_usd numeric(14,8),
 pricing_version text,
 status text NOT NULL CHECK(status IN ('pending', 'complete', 'error')),
 error text,
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz
);
CREATE INDEX IF NOT EXISTS creative_generations_script ON public.creative_generations(batch_id,script_id,created_at DESC);
ALTER TABLE public.creative_generations ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.creative_generations FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.creative_generations TO service_role;
