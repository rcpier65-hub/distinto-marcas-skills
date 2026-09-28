-- "¿Quién está transcribiendo ahora?" (Pedro 24-sep-2026). Mientras alguien
-- graba, su navegador renueva grabando_hasta cada 20 s (ahora + 60 s). Si
-- cierra la pestaña, a los 60 s deja de figurar "en vivo" solo.
alter table public.notas_reuniones add column if not exists grabando_hasta timestamptz;
