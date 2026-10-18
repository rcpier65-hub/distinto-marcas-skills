-- Envío del reporte de redes por correo desde team@distintostudio.com
-- (Pedro 18-oct-2026). Configuración por marca (envío automático mensual,
-- apagado por defecto) e historial de envíos. Acceso solo por servidor.
create table if not exists public.social_report_email_settings (
  brand_id uuid primary key references public.marcas(id) on delete cascade,
  auto_enabled boolean not null default false,
  recipients text[] not null default '{}',
  last_auto_month text,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table if not exists public.social_report_email_log (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references public.marcas(id) on delete cascade,
  month text not null,
  recipients text[] not null,
  mode text not null check (mode in ('manual', 'auto')),
  status text not null check (status in ('sent', 'failed')),
  error text,
  sent_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists social_report_email_log_brand_idx on public.social_report_email_log(brand_id, created_at desc);
alter table public.social_report_email_settings enable row level security;
alter table public.social_report_email_log enable row level security;
