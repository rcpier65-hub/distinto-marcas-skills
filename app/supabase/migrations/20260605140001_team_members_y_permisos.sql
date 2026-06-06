-- Migration: sistema de team_members + roles + permisos personalizables
--
-- Decisión Pedro:
-- 1. Supabase Auth (email + password) para login
-- 2. Híbrido: rol_base predefinido + override individual por miembro
-- 3. Migrar editores existentes a team_members (preservando referencias FK)
--
-- Esquema:
--   roles_predefinidos: catalog estable con permisos por defecto por rol
--   team_members: 1 fila por persona del equipo. Si tiene auth_user_id
--     es porque aceptó la invitación. Si está null, está "pre-creado"
--     (vos creaste el miembro pero todavía no se logueó).
--   team_invitations: tokens únicos para que cada persona acepte y se
--     creen el account de Supabase Auth con su password.
--
-- Permisos: JSONB granular por módulo. Se calculan en runtime como
-- merge(rol_base.permisos, team_member.permisos_override) donde el
-- override gana sobre el base para los campos definidos. Ver
-- lib/team/permisos.ts en el código para el helper de merge.

-- =========================================================
-- 1. Roles predefinidos (catálogo)
-- =========================================================

CREATE TABLE IF NOT EXISTS roles_predefinidos (
  id text PRIMARY KEY,             -- 'admin' | 'editor' | etc. (slug estable)
  nombre text NOT NULL,            -- Nombre humano: "Editor de video"
  descripcion text,                -- "Edita videos asignados a su nombre"
  permisos_default jsonb NOT NULL, -- ver shape abajo en seed
  orden int NOT NULL DEFAULT 0,    -- para ordenar en dropdowns
  created_at timestamptz DEFAULT now()
);

-- Seed inicial. Los permisos siguen el shape:
--   {
--     "inbox":         {"acceso": bool},
--     "publicaciones": {"acceso": bool, "puede_crear": bool, "puede_editar": bool, "puede_borrar": bool},
--     "editor":        {"acceso": bool, "solo_propias": bool},
--     "diseno":        {"acceso": bool},
--     "grilla":        {"acceso": bool, "puede_enviar": bool},
--     "comentarios":   {"acceso": bool, "puede_responder": bool},
--     "metricas":      {"acceso": bool},
--     "settings":      {"acceso": bool},
--     "equipo":        {"acceso": bool, "puede_invitar": bool, "puede_resetear_passwords": bool},
--     "finanzas":      {"acceso": bool}
--   }

INSERT INTO roles_predefinidos (id, nombre, descripcion, permisos_default, orden) VALUES
  ('admin', 'Administrador', 'Acceso completo a todo el sistema', '{
    "inbox":         {"acceso": true},
    "publicaciones": {"acceso": true, "puede_crear": true, "puede_editar": true, "puede_borrar": true},
    "editor":        {"acceso": true, "solo_propias": false},
    "diseno":        {"acceso": true},
    "grilla":        {"acceso": true, "puede_enviar": true},
    "comentarios":   {"acceso": true, "puede_responder": true},
    "metricas":      {"acceso": true},
    "settings":      {"acceso": true},
    "equipo":        {"acceso": true, "puede_invitar": true, "puede_resetear_passwords": true},
    "finanzas":      {"acceso": true}
  }'::jsonb, 1),
  ('director', 'Director', 'Vista completa de operación, no gestiona passwords', '{
    "inbox":         {"acceso": true},
    "publicaciones": {"acceso": true, "puede_crear": true, "puede_editar": true, "puede_borrar": true},
    "editor":        {"acceso": true, "solo_propias": false},
    "diseno":        {"acceso": true},
    "grilla":        {"acceso": true, "puede_enviar": true},
    "comentarios":   {"acceso": true, "puede_responder": true},
    "metricas":      {"acceso": true},
    "settings":      {"acceso": false},
    "equipo":        {"acceso": true, "puede_invitar": true, "puede_resetear_passwords": false},
    "finanzas":      {"acceso": true}
  }'::jsonb, 2),
  ('social_media_manager', 'Social Media Manager', 'Gestiona contenido y planificación', '{
    "inbox":         {"acceso": true},
    "publicaciones": {"acceso": true, "puede_crear": true, "puede_editar": true, "puede_borrar": false},
    "editor":        {"acceso": false, "solo_propias": false},
    "diseno":        {"acceso": false},
    "grilla":        {"acceso": true, "puede_enviar": true},
    "comentarios":   {"acceso": true, "puede_responder": true},
    "metricas":      {"acceso": true},
    "settings":      {"acceso": false},
    "equipo":        {"acceso": false, "puede_invitar": false, "puede_resetear_passwords": false},
    "finanzas":      {"acceso": false}
  }'::jsonb, 3),
  ('community_manager', 'Community Manager', 'Atiende inbox y comentarios', '{
    "inbox":         {"acceso": true},
    "publicaciones": {"acceso": true, "puede_crear": false, "puede_editar": false, "puede_borrar": false},
    "editor":        {"acceso": false, "solo_propias": false},
    "diseno":        {"acceso": false},
    "grilla":        {"acceso": false, "puede_enviar": false},
    "comentarios":   {"acceso": true, "puede_responder": true},
    "metricas":      {"acceso": false},
    "settings":      {"acceso": false},
    "equipo":        {"acceso": false, "puede_invitar": false, "puede_resetear_passwords": false},
    "finanzas":      {"acceso": false}
  }'::jsonb, 4),
  ('editor', 'Editor de video', 'Edita videos asignados a su nombre', '{
    "inbox":         {"acceso": false},
    "publicaciones": {"acceso": true, "puede_crear": false, "puede_editar": true, "puede_borrar": false},
    "editor":        {"acceso": true, "solo_propias": true},
    "diseno":        {"acceso": false},
    "grilla":        {"acceso": false, "puede_enviar": false},
    "comentarios":   {"acceso": false, "puede_responder": false},
    "metricas":      {"acceso": false},
    "settings":      {"acceso": false},
    "equipo":        {"acceso": false, "puede_invitar": false, "puede_resetear_passwords": false},
    "finanzas":      {"acceso": false}
  }'::jsonb, 5),
  ('disenador', 'Diseñador', 'Sube portadas y trabaja diseño visual', '{
    "inbox":         {"acceso": false},
    "publicaciones": {"acceso": true, "puede_crear": false, "puede_editar": true, "puede_borrar": false},
    "editor":        {"acceso": false, "solo_propias": false},
    "diseno":        {"acceso": true},
    "grilla":        {"acceso": false, "puede_enviar": false},
    "comentarios":   {"acceso": false, "puede_responder": false},
    "metricas":      {"acceso": false},
    "settings":      {"acceso": false},
    "equipo":        {"acceso": false, "puede_invitar": false, "puede_resetear_passwords": false},
    "finanzas":      {"acceso": false}
  }'::jsonb, 6)
ON CONFLICT (id) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  descripcion = EXCLUDED.descripcion,
  permisos_default = EXCLUDED.permisos_default,
  orden = EXCLUDED.orden;

-- =========================================================
-- 2. Tabla team_members (personas del equipo)
-- =========================================================

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- FK a Supabase Auth. NULL = todavía no aceptó la invitación.
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email text NOT NULL,                        -- único en activos (ver index abajo)
  nombre text NOT NULL,
  -- rol_base es FK a roles_predefinidos. La selección rápida.
  rol_base text NOT NULL REFERENCES roles_predefinidos(id),
  -- cargo_personalizado es free-text que Pedro escribe. Si está null,
  -- la UI muestra el roles_predefinidos.nombre.
  cargo_personalizado text,
  fecha_cumpleanos date,
  avatar_url text,
  -- permisos_override: JSONB sparse — solo guarda las CLAVES que
  -- divergen del rol_base. Vacío {} significa "usar el rol tal cual".
  permisos_override jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- marcas_acceso: NULL = TODAS las marcas. Array vacío = NINGUNA.
  -- Array poblado = solo esas marcas. Usado en filter de UI por marca.
  marcas_acceso uuid[],
  -- Bridge con la tabla editores legacy mientras migramos. Cuando
  -- todos los lugares lean de team_members este campo se elimina.
  editor_legacy_id uuid REFERENCES editores(id),
  -- Estado
  activo boolean NOT NULL DEFAULT true,
  notas text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Email único entre activos (un miembro inactivo puede compartir email
-- con uno reactivado más tarde — partial index hace que el constraint
-- solo aplique a los activos).
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_members_email_unique_activo
  ON team_members (LOWER(email)) WHERE activo = true;

-- Lookup rápido por auth_user_id (login flow leerá team_member por
-- auth_user_id para obtener permisos en cada request).
CREATE INDEX IF NOT EXISTS idx_team_members_auth_user_id
  ON team_members (auth_user_id) WHERE auth_user_id IS NOT NULL;

-- Lookup por rol (filtros en /equipo: "ver todos los community managers").
CREATE INDEX IF NOT EXISTS idx_team_members_rol_base
  ON team_members (rol_base) WHERE activo = true;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_team_members_updated_at ON team_members;
CREATE TRIGGER trg_team_members_updated_at
  BEFORE UPDATE ON team_members
  FOR EACH ROW EXECUTE FUNCTION update_team_members_updated_at();

-- =========================================================
-- 3. Tabla team_invitations (links de invitación)
-- =========================================================

CREATE TABLE IF NOT EXISTS team_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,           -- random 32 chars, parte del link
  email text NOT NULL,
  nombre_sugerido text NOT NULL,
  rol_base text NOT NULL REFERENCES roles_predefinidos(id),
  cargo_personalizado text,
  permisos_override jsonb NOT NULL DEFAULT '{}'::jsonb,
  marcas_acceso uuid[],
  -- Cuando el invitado acepta, este link queda usado y se crea el
  -- team_member efectivo.
  used_at timestamptz,
  used_by_team_member_id uuid REFERENCES team_members(id),
  -- Expiración: 7 días por defecto (el endpoint /invite lo setea)
  expires_at timestamptz NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_team_invitations_token
  ON team_invitations (token) WHERE used_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_team_invitations_email
  ON team_invitations (LOWER(email));

-- =========================================================
-- 4. Backfill: migrar editores existentes a team_members
--    Los 5 editores activos (PIEER, LORENA, NAYELI, PEDRO, Ruth)
--    se crean como team_members con rol_base='editor'. El email
--    queda como placeholder "<nombre>@pendiente.local" hasta que
--    Pedro lo complete o se invite por email real.
-- =========================================================

INSERT INTO team_members (
  email, nombre, rol_base, cargo_personalizado,
  editor_legacy_id, marcas_acceso, activo
)
SELECT
  LOWER(REPLACE(e.nombre, ' ', '')) || '@pendiente.local' as email,
  e.nombre as nombre,
  'editor' as rol_base,
  'Editor de video' as cargo_personalizado,
  e.id as editor_legacy_id,
  NULL as marcas_acceso,  -- NULL = acceso a TODAS las marcas
  true as activo
FROM editores e
WHERE e.activo = true
  -- Evitar duplicados si el script corre 2 veces
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm WHERE tm.editor_legacy_id = e.id
  );

COMMENT ON TABLE team_members IS
  'Miembros del equipo Distinto. auth_user_id null = invitación pendiente. permisos_override es sparse — vacío = usar permisos del rol_base.';

COMMENT ON TABLE team_invitations IS
  'Tokens únicos para invitar nuevos miembros. Al aceptar el invitado se crea su account en Supabase Auth y el team_member queda con auth_user_id seteado.';

COMMENT ON TABLE roles_predefinidos IS
  'Catálogo de roles con permisos por defecto. Sirven como base para el rol_base de cada team_member, después se sobreescribe con permisos_override JSONB sparse.';
