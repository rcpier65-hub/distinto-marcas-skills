-- Conexión de cuentas de TikTok por marca (Login Kit + Display API).
-- Pedro 18-oct-2026. Tokens cifrados (AES-GCM, misma llave que Meta).
-- Acceso solo por servidor (RLS sin políticas).
create table if not exists public.tiktok_brand_accounts (
  brand_id uuid primary key references public.marcas(id) on delete cascade,
  open_id text not null,
  username text,
  display_name text,
  avatar_url text,
  scope text,
  access_token_enc text not null,
  refresh_token_enc text not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  connected_by uuid,
  connected_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.tiktok_oauth_states (
  state text primary key,
  brand_id uuid not null references public.marcas(id) on delete cascade,
  created_by uuid,
  via_link boolean not null default false,
  expires_at timestamptz not null,
  used_at timestamptz
);
create table if not exists public.tiktok_follower_snapshots (
  brand_id uuid not null references public.marcas(id) on delete cascade,
  day date not null,
  followers integer,
  likes bigint,
  videos integer,
  primary key (brand_id, day)
);
alter table public.tiktok_brand_accounts enable row level security;
alter table public.tiktok_oauth_states enable row level security;
alter table public.tiktok_follower_snapshots enable row level security;
