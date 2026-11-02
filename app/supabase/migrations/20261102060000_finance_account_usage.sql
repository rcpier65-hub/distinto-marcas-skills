BEGIN;
ALTER TABLE public.finance_accounts ADD COLUMN IF NOT EXISTS usage text CHECK (usage IN ('agency','personal'));
COMMENT ON COLUMN public.finance_accounts.usage IS 'Uso operativo de la cuenta. Independiente del titular bancario/fiscal; no reclasifica movimientos históricos.';
COMMIT;
