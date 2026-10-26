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

## Verificación del 26-oct-2026

- Build Webpack y TypeScript aprobados. Las diez incidencias y tres avisos de
  lint en Equipo/Grabaciones/Sidebar/CommandPalette coinciden con 0415b17;
  los archivos nuevos y demás archivos afectados no agregan incidencias.
- Tests locales y de la imagen candidata comprobaron los cuatro miembros,
  Pedro, Ruth y Nayeli: mismos 37 eventos de la semana; controles/acciones/API
  habilitados para los autorizados, solo lectura para Ruth y Nayeli. Cliente
  TOTAL SUPS rechazado en calendario interno (redirección en página, 403 en API).
- Navegador: texto y micrófono visibles en las cuatro cuentas, interpretación
  de reunión/grabación TypHouse con fecha y hora correctas; detalle editable
  para Lorena. No se confirmó ningún evento ni se enviaron invitaciones.
- Imagen funcional b8c955e publicada sobre 0415b17, conservando el commit local
  b0ad0d5. Runtime Linux y dependencias de producción reutilizados: package,
  lock, public y next.config sin diferencias; `.next` compilado localmente.
- Audio sintético de prueba contra producción devolvió OpenAI 429, sin créditos.
  El acceso al botón está habilitado; la transcripción de respaldo no funciona
  hasta recargar esa cuenta. No se cambiaron facturación ni claves. El dictado
  nativo permanece disponible según navegador; no se validó un micrófono físico.
