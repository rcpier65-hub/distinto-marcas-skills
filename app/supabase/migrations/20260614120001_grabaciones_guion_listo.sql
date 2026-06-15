-- Migración 029 — grabaciones.guion_listo
--
-- Pedro: quitar el check "marcar como confirmada y creíble" (no le servía)
-- y la alerta "falta coordinación con el cliente". En su lugar, un check
-- pequeño POR GRABACIÓN: "guion listo" (verde) vs "aún falta el guion"
-- (alerta ámbar). Así organiza por sesión si el guion ya está armado.
--
-- Independiente de enlace_guiones (el link al archivo): se puede tener
-- link pero marcar no-listo, o listo sin link todavía.

ALTER TABLE grabaciones
  ADD COLUMN IF NOT EXISTS guion_listo boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN grabaciones.guion_listo IS
  'Flag manual: el guion de esa grabación ya está armado. Lo marca el equipo. Independiente de enlace_guiones.';
