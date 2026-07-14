-- Portal del cliente en TIEMPO REAL.
--
-- El portal (/cliente) debe actualizarse solo cuando el equipo publica o cambia
-- una publicación, sin recargar. Para eso el navegador del cliente se suscribe a
-- Supabase Realtime sobre la tabla `publicaciones`. Realtime evalúa las policies
-- RLS COMO EL USUARIO SUSCRITO: sin una policy que incluya al cliente, no le
-- llega ningún evento.
--
-- La policy existente `pub_authenticated_marca` solo cubre al EQUIPO
-- (tabla marca_usuarios). El cliente vive en `marca_clientes`. Agregamos una
-- policy SELECT aditiva: el cliente puede leer (y por lo tanto recibir eventos
-- realtime de) las publicaciones de SU marca, y solo de la suya.
--
-- Es aditiva: no cambia el acceso del equipo (las policies se combinan con OR).
-- Solo lectura — el cliente nunca escribe publicaciones.

DROP POLICY IF EXISTS pub_cliente_marca_select ON publicaciones;

CREATE POLICY pub_cliente_marca_select ON publicaciones
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM marca_clientes mc
      WHERE mc.marca_id = publicaciones.marca_id
        AND mc.auth_user_id = auth.uid()
    )
  );
