-- Carruseles con slides en orden (Pedro 02-oct-2026): al crear la tarea se
-- elige cuántos slides; Ailyn pega un link por slide (Slide 1, 2, 3…) y la
-- publicación muestra el preview con los números para que Paolo publique
-- en el orden correcto.
alter table public.diseno_entregables add column if not exists slides jsonb;
alter table public.publicaciones add column if not exists carrusel_slides jsonb;
