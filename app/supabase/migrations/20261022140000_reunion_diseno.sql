-- Diseños originales dentro de la agenda de reunión; no crea tareas duplicadas.
begin;
alter table public.reunion_temas
  add column publicacion_id uuid references public.publicaciones(id) on delete cascade;
alter table public.reunion_temas drop constraint reunion_temas_check;
alter table public.reunion_temas add constraint reunion_temas_origen_check check (
  num_nonnulls(tarea_id, publicacion_id) <= 1 and
  (tarea_id is not null or publicacion_id is not null or char_length(btrim(texto)) > 0)
);
create unique index reunion_temas_diseno_pendiente
  on public.reunion_temas (marca_id, publicacion_id)
  where estado = 'pendiente' and publicacion_id is not null;
comment on column public.reunion_temas.publicacion_id is
  'Diseño original seleccionado para presentar. Su nombre y estado se consultan en vivo.';
-- Retirar la marca de un diseño retira también su selección pendiente allí.
-- El historial de reuniones ya presentadas se conserva.
create function public.reunion_diseno_cambio_marca() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  delete from public.reunion_temas
    where publicacion_id = new.id and estado = 'pendiente'
      and not (marca_id = any(array_remove(array_append(coalesce(new.marcas_extra, '{}'::uuid[]), new.marca_id), null)));
  return new;
end;
$$;
revoke all on function public.reunion_diseno_cambio_marca() from public, anon, authenticated;
create trigger reunion_diseno_cambio_marca
  after update of marca_id, marcas_extra on public.publicaciones
  for each row execute function public.reunion_diseno_cambio_marca();
notify pgrst, 'reload schema';
commit;
