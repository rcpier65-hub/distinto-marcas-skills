# Diseños para presentar en reunión

Desde Diseño, cada tarjeta del kanban y cada fila de la tabla tiene «Para presentar
en reunión». El detalle de los diseños independientes tiene el mismo botón.
Seleccionarlo agrega el diseño original a Resumen de la marca → Próxima reunión
→ Para presentar. No cambia su estado, no duplica tareas, no crea una reunión de
calendario ni envía invitaciones. Una segunda pulsación retira la selección.

La selección persiste en `reunion_temas.publicacion_id`. Su título, responsable,
estado y enlace se leen desde `publicaciones`. Los diseños para publicar abren
Publicaciones; los independientes, Diseño. El diseño sigue visible para la reunión
al terminarlo, incluso si sale del tablero de trabajo. Se muestra su estado real:
seleccionarlo para presentar no significa que esté terminado.

Se incluyen la marca principal y las etiquetas adicionales activas, excluyendo
Interno y las marcas fuera del permiso del miembro. Al retirar una marca del
diseño, un trigger elimina únicamente su selección pendiente allí. El historial
de reuniones presentadas se conserva. Al cerrar una reunión, el botón queda
desmarcado y el diseño puede seleccionarse otra vez para una reunión posterior.

El servidor exige sesión activa de equipo y permiso Diseño; no acepta un ID de
marca enviado por el navegador. La asignación se lee del diseño bloqueado dentro
de una transacción, con índice único de pendientes por marca/diseño. Los clientes
no pueden consultar ni modificar estas selecciones. Las tablas conservan RLS y
acceso exclusivo de servidor. Las tareas normales y los temas manuales mantienen
su comportamiento anterior.

El tablero comparte una lectura de selecciones, sin una petición por tarjeta.
Se actualiza al recuperar foco/visibilidad y cada 30 segundos con pestaña visible.
El panel de marca también refresca al abrir la lista. Las respuestas antiguas no
pisan una selección recién guardada.

Migración aditiva: `20261022140000_reunion_diseno.sql`.

## Verificación

`TEST_BASE_URL=http://localhost:3122 node scripts/test-diseno-reunion.mjs`

La prueba crea marcas, diseños, tareas y un miembro restringido temporales; no
envía mensajes. Comprueba concurrencia sin duplicados, datos originales intactos,
títulos/estados/enlaces actuales, marca principal/adicional, aislamiento de
clientes y de miembros restringidos, rechazo por origen, falta de permiso y
publicación sin diseño, reasignación, orden del día, cierre/historial y botón SSR.
Elimina sus datos y cierra únicamente sus sesiones al terminar.

Base de continuidad: producción `82e1426`, rama remota
`origin/claude/reportes-redes-v2`; se conserva íntegramente. Compilación local con
`next build --webpack` aprobada (Turbopack local falló resolviendo fuentes de
Google en esta ruta; no se cambió el compilador de producción). Lint nuevo sin
errores. Los tres archivos de Diseño existentes conservan sus seis errores y
trece avisos previos, cotejados con la base. Revisión React: controles accesibles
con `aria-pressed`, bloqueo mientras guarda, estado confirmado y peticiones
compartidas; la clave de marca evita reutilizar temas de otra marca.
