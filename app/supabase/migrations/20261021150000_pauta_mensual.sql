-- Historial mensual de publicidad por marca (Pedro 21-oct-2026): «el ritmo y
-- presupuesto deben estar conectados al módulo de Reportes, ahí está todo el
-- historial». Una fila por marca y mes: presupuesto definido por la agencia y
-- métricas de Meta guardadas al tocar «Actualizar». El panel de Publicidad lee
-- el presupuesto del mes actual de aquí; Reportes muestra el historial.
create table if not exists public.pauta_mensual (
  marca_id uuid not null references public.marcas(id) on delete cascade,
  mes text not null check (mes ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  presupuesto numeric check (presupuesto is null or presupuesto >= 0),
  moneda text,
  resultado text,
  metricas jsonb,
  metricas_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (marca_id, mes)
);

alter table public.pauta_mensual enable row level security;
revoke all on public.pauta_mensual from anon, authenticated;

-- El presupuesto que ya se hubiera definido en el panel pasa al mes actual.
insert into public.pauta_mensual (marca_id, mes, presupuesto)
select marca_id, to_char((now() at time zone 'America/Lima'), 'YYYY-MM'), (config->>'presupuestoMensual')::numeric
from public.marca_pauta
where config ? 'presupuestoMensual' and jsonb_typeof(config->'presupuestoMensual') = 'number'
on conflict (marca_id, mes) do nothing;

notify pgrst, 'reload schema';
