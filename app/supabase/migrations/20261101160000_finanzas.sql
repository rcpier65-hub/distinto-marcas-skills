BEGIN;
CREATE TABLE IF NOT EXISTS public.finance_access (member_id uuid PRIMARY KEY REFERENCES public.team_members(id));
CREATE TABLE IF NOT EXISTS public.finance_accounts (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_key text UNIQUE, name text NOT NULL,
 owner text CHECK(owner IN ('agency','pedro','nayeli')), currency text CHECK(currency IN ('PEN','USD')),
 opening integer, opening_date date, note text NOT NULL DEFAULT '', created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.finance_rules (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_key text UNIQUE, title text NOT NULL,
 kind text NOT NULL CHECK(kind IN ('income','expense')), scope text NOT NULL CHECK(scope IN ('agency','personal')),
 owner text NOT NULL CHECK(owner IN ('agency','pedro','nayeli')), currency text NOT NULL CHECK(currency IN ('PEN','USD')),
 base integer NOT NULL CHECK(base>0), tax integer NOT NULL DEFAULT 0 CHECK(tax>=0),
 frequency text NOT NULL CHECK(frequency IN ('monthly','weekly')), day integer NOT NULL,
 starts date NOT NULL, ends date, active boolean NOT NULL DEFAULT true, note text NOT NULL DEFAULT '',
 period_mode text NOT NULL DEFAULT 'other', member_id uuid REFERENCES public.team_members(id), brand_id uuid REFERENCES public.marcas(id),
 CHECK((frequency='monthly' AND day BETWEEN 1 AND 31) OR (frequency='weekly' AND day BETWEEN 0 AND 6))
);
CREATE TABLE IF NOT EXISTS public.finance_charges (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), external_key text UNIQUE, rule_id uuid REFERENCES public.finance_rules(id),
 title text NOT NULL, kind text NOT NULL CHECK(kind IN ('income','expense')),
 scope text NOT NULL CHECK(scope IN ('agency','personal')), owner text NOT NULL CHECK(owner IN ('agency','pedro','nayeli')),
 currency text NOT NULL CHECK(currency IN ('PEN','USD')), base integer NOT NULL CHECK(base>0), tax integer NOT NULL DEFAULT 0 CHECK(tax>=0),
 prior_credit integer NOT NULL DEFAULT 0 CHECK(prior_credit>=0), due date NOT NULL,
 state text NOT NULL DEFAULT 'review' CHECK(state IN ('review','confirmed','void')), note text NOT NULL DEFAULT '',
 member_id uuid REFERENCES public.team_members(id), brand_id uuid REFERENCES public.marcas(id), created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(rule_id,due), CHECK(prior_credit<=base+tax)
);
CREATE INDEX IF NOT EXISTS finance_charges_due ON public.finance_charges(due);
CREATE TABLE IF NOT EXISTS public.finance_movements (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), kind text NOT NULL CHECK(kind IN ('income','expense','transfer')),
 scope text NOT NULL CHECK(scope IN ('agency','personal')), owner text NOT NULL CHECK(owner IN ('agency','pedro','nayeli')),
 currency text NOT NULL CHECK(currency IN ('PEN','USD')), amount integer NOT NULL CHECK(amount>=0),
 credit integer NOT NULL DEFAULT 0 CHECK(credit>=0), credit_kind text NOT NULL DEFAULT 'none' CHECK(credit_kind IN ('none','retention','detraction')),
 account_id uuid REFERENCES public.finance_accounts(id), destination_id uuid REFERENCES public.finance_accounts(id),
 charge_id uuid REFERENCES public.finance_charges(id), title text NOT NULL, date date NOT NULL,
 created_by uuid NOT NULL REFERENCES public.team_members(id), created_at timestamptz NOT NULL DEFAULT now(), void_reason text,
 CHECK(amount+credit>0), CHECK(amount=0 OR account_id IS NOT NULL),
 CHECK((kind='transfer' AND destination_id IS NOT NULL AND destination_id<>account_id AND credit=0 AND charge_id IS NULL) OR (kind<>'transfer' AND destination_id IS NULL)),
 CHECK((credit=0 AND credit_kind='none') OR (credit>0 AND credit_kind<>'none'))
);
CREATE INDEX IF NOT EXISTS finance_movements_charge ON public.finance_movements(charge_id);
CREATE TABLE IF NOT EXISTS public.finance_requests (
 id uuid PRIMARY KEY, member_id uuid NOT NULL REFERENCES public.team_members(id), hash text NOT NULL, result jsonb NOT NULL DEFAULT '{}', created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.finance_audit (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES public.team_members(id), action text NOT NULL, record_id uuid, detail jsonb NOT NULL DEFAULT '{}', created_at timestamptz DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.finance_settings(key text PRIMARY KEY, value jsonb NOT NULL);
CREATE TABLE IF NOT EXISTS public.finance_notes(id text PRIMARY KEY,title text NOT NULL,body text NOT NULL);
CREATE TABLE IF NOT EXISTS public.finance_documents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), member_id uuid NOT NULL REFERENCES public.team_members(id),
 kind text NOT NULL CHECK(kind IN ('rh','expense')), number text NOT NULL, period date NOT NULL,
 gross integer NOT NULL CHECK(gross>0), withholding integer NOT NULL DEFAULT 0 CHECK(withholding BETWEEN 0 AND gross), currency text NOT NULL CHECK(currency IN ('PEN','USD')),
 filename text NOT NULL, mime text NOT NULL, bytes bytea NOT NULL CHECK(octet_length(bytes)<=8388608), hash text NOT NULL,
 status text NOT NULL DEFAULT 'received' CHECK(status IN ('received','reviewed','rejected')), review_note text NOT NULL DEFAULT '',
 created_at timestamptz DEFAULT now(), UNIQUE(member_id,kind,number), UNIQUE(member_id,hash)
);
ALTER TABLE public.finance_documents ADD COLUMN IF NOT EXISTS charge_id uuid REFERENCES public.finance_charges(id);
-- No browser role can read or modify financial records, including via PostgREST.
DO $$ DECLARE t text; BEGIN FOREACH t IN ARRAY ARRAY['finance_settings','finance_access','finance_accounts','finance_rules','finance_charges','finance_movements','finance_requests','finance_audit','finance_notes','finance_documents'] LOOP
 EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
 EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated',t);
END LOOP; END $$;
COMMIT;
