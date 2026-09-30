-- Conservar la vista personal/asignación existentes; delegar solo a Lorena.
UPDATE public.roles_predefinidos
SET permisos_default = jsonb_set(COALESCE(permisos_default, '{}'::jsonb), '{tareas}',
  '{"acceso":true,"puede_asignar":true,"ver_equipo":false}'::jsonb || COALESCE(permisos_default->'tareas', '{}'::jsonb));

DO $$
DECLARE lorena_id uuid; pedro_id uuid; p jsonb;
BEGIN
  SELECT id INTO STRICT lorena_id FROM public.team_members WHERE lower(email) = 'lorena@agenciadistinto.com' AND activo;
  SELECT id INTO STRICT pedro_id FROM public.team_members WHERE lower(email) = 'pedro@agenciadistinto.com' AND activo;
  SELECT COALESCE(permisos_override, '{}'::jsonb) INTO p FROM public.team_members WHERE id = lorena_id FOR UPDATE;
  p := jsonb_set(p, '{tareas}', COALESCE(p->'tareas', '{}'::jsonb)
    || jsonb_build_object('acceso',true,'ver_equipo',true,'puede_asignar',true,
      'excluir_miembros', (SELECT jsonb_agg(DISTINCT v) FROM jsonb_array_elements(COALESCE(p->'tareas'->'excluir_miembros','[]'::jsonb) || jsonb_build_array(pedro_id)) AS x(v))));
  p := jsonb_set(p, '{marcas}', COALESCE(p->'marcas', '{}'::jsonb) || '{"acceso":true,"puede_crear":true}'::jsonb);
  UPDATE public.team_members SET permisos_override = p, updated_at = now() WHERE id = lorena_id;
END $$;

-- También limitar la lectura directa y Realtime: no basta con ocultar tarjetas.
CREATE OR REPLACE FUNCTION public.puede_leer_tarea(asignado uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members tm
    JOIN public.roles_predefinidos r ON r.id = tm.rol_base
    CROSS JOIN LATERAL (SELECT COALESCE(r.permisos_default->'tareas','{}'::jsonb) || COALESCE(tm.permisos_override->'tareas','{}'::jsonb) AS p) permiso
    WHERE tm.auth_user_id = auth.uid() AND tm.activo
      AND COALESCE(permiso.p->>'acceso','true') = 'true'
      AND (lower(tm.email) = 'pedro@agenciadistinto.com'
        OR (asignado IS NOT NULL
          AND NOT (COALESCE(permiso.p->'excluir_miembros','[]'::jsonb) ? asignado::text)
          AND (asignado = tm.id OR permiso.p->>'ver_equipo' = 'true')))
  );
$$;
REVOKE ALL ON FUNCTION public.puede_leer_tarea(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.puede_leer_tarea(uuid) TO authenticated, service_role;
ALTER TABLE public.tareas ENABLE ROW LEVEL SECURITY;
CREATE POLICY tareas_lectura_por_alcance ON public.tareas FOR SELECT TO authenticated
USING (public.puede_leer_tarea(team_member_id));
-- Las escrituras de la app pasan por acciones/API autenticadas con service_role.
