BEGIN;
CREATE TABLE IF NOT EXISTS public.finance_debts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), title text NOT NULL,
 owner text NOT NULL CHECK(owner IN ('pedro','nayeli')),
 currency text NOT NULL CHECK(currency IN ('PEN','USD')),
 frequency text NOT NULL CHECK(frequency IN ('once','monthly')),
 total integer CHECK(total>0), installment integer CHECK(installment>0),
 first_due date, estimated boolean NOT NULL DEFAULT false,
 active boolean NOT NULL DEFAULT true, note text NOT NULL DEFAULT '',
 revision integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.finance_debts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_debts FROM anon,authenticated;
ALTER TABLE public.finance_charges ADD COLUMN IF NOT EXISTS debt_id uuid REFERENCES public.finance_debts(id);
ALTER TABLE public.finance_charges ADD COLUMN IF NOT EXISTS debt_period text;
CREATE UNIQUE INDEX IF NOT EXISTS finance_charge_debt_period ON public.finance_charges(debt_id,debt_period) WHERE debt_id IS NOT NULL;
COMMIT;
