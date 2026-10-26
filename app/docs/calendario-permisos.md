# Acceso de equipo al calendario

El calendario dispone de permisos propios en `permisos_override.calendario`:
`acceso` permite consultar; `puede_editar` permite agendar por texto/dictado,
editar, mover y eliminar eventos, y gestionar Reservas de la web.
La página, acciones de servidor y API v1 usan `calendarAccess`.

Sin override se conservan los permisos anteriores: consulta ligada a Publicaciones,
administración para director/admin y asistente de agenda para Diseño. Un miembro
inactivo o ausente no recibe acceso administrativo. La navegación y Mi Equipo
muestran el permiso independiente; no concede edición general de Publicaciones.

Pedro autorizó el 26-oct-2026 acceso completo para Lorena, Pieer, Ailyn y Paolo.
Se asignó únicamente `calendario.acceso=true` y `calendario.puede_editar=true`,
fusionando JSON dentro de una transacción. Se comprobaron sus cuatro correos y
miembros activos; roles, marcas y otros overrides idénticos antes/después.
La cuenta paolo@agenciadistinto.com figura como Erick; no se renombró.

El micrófono usa el dictado existente: reconocimiento del navegador o transcripción
de audio. Requiere permitir micrófono. La agenda presenta fecha, hora, marca e
invitados antes de Confirmar; las invitaciones se envían al confirmar.

Verificación reproducible desde app/:
- `node scripts/test-calendar-access.mjs`: herencia, grants, revocación y aislamiento.
- `TEST_BASE_URL=... node scripts/test-calendar-team-live.mjs`: sesiones independientes,
  eventos iguales, formulario/reservas, acciones/API autorizadas y validación de
  payloads inválidos. No crea eventos ni envía invitaciones. Usa el manifiesto del
  build probado y cierra solamente las sesiones de prueba.

Publicar desde la base vigente del VPS, compilando localmente según AGENTS.md.
No ejecutar una compilación pesada de Next en el VPS compartido.
