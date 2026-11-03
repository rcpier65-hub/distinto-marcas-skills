-- Envío manual de propuestas con PDF. Reserva persistente contra duplicados.
create table if not exists public.proposal_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references auth.users(id),
  proposal_id uuid not null references public.propuestas_comerciales(id) on delete cascade,
  proposal_revision integer not null check (proposal_revision > 0),
  delivery_key text not null,
  recipient text not null,
  subject text not null,
  sender text not null,
  status text not null check (status in ('preparing', 'sending', 'sent', 'failed', 'uncertain')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,
  unique (created_by, delivery_key)
);
create index if not exists proposal_email_history on public.proposal_email_deliveries (proposal_id, created_at desc);
alter table public.proposal_email_deliveries enable row level security;
revoke all on public.proposal_email_deliveries from anon, authenticated;
grant all on public.proposal_email_deliveries to service_role;
