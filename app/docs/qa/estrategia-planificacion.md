# Estrategia y Planificación — verificación del 15 de octubre de 2026

Base comprobada: producción Hostinger `8aaefdc`. Checkout `soporte-equipo-work`, rama `codex/estrategia-planificacion`. Cambios de otros chats y worktrees conservados.

## Comprobaciones realizadas

Pruebas en Chrome automatizado con cuentas temporales de equipo, colaborador y cliente; marca de QA independiente, sin envíos externos.

- Espacio de marca y lienzo abren en escritorio (1440 × 1000) y móvil (390 × 844); sin desbordamiento horizontal de la página de marca.
- Plantilla abierta simultáneamente desde dos cuentas: 9 elementos, 9 IDs únicos; no duplica los bloques iniciales. Dos textos distintos escritos por la UI se conservan juntos en servidor.
- Hoja creada, notas guardadas, acuerdo revisado con responsable y fecha y enviado al módulo real de Tareas. El enlace muestra su contexto de planificación.
- Dos confirmaciones simultáneas del mismo acuerdo crean una tarea y una notificación. Repetir confirmación conserva el mismo ID. Si la tarea se elimina, reintentar responde 409 y no la recrea.
- Combinar dos acuerdos deja uno pendiente y descarta los originales; dividirlo crea dos pendientes de revisión. No crea tareas automáticamente.
- Copia de hoja: conserva lienzo, cero sesiones, cero acuerdos/tareas, no compartida con cliente.
- Revisiones obsoletas de registros: 409. Otra marca y origen externo: 403. Sin sesión: middleware redirige a login.
- Cuenta con exclusión de un miembro: no recibe sus acuerdos confirmados. Cliente sin compartir: 403. Al compartir, recibe lienzo y comentarios compartidos, con cero sesiones, transcripciones, acuerdos, historial y miembros internos. Escritura del lienzo por cliente: 403.
- Cliente publica comentario compartido. Su portal muestra tareas anteriores, pero no las tareas nuevas privadas de planificación. Vincular una tarea existente no cambia su visibilidad original.
- Calendario: una publicación con edición el 19 y publicación el 21 aparece en ambas fechas, con tipos distintos. Diseño usa fecha de entrega. Tareas, grabación, reunión y fecha importante aparecen desde sus tablas originales. Reunión `15:00 UTC` se muestra a las `10:00` de Lima. Cero advertencias de carga en esa prueba.
- Campaña con aprobación crítica pendiente no se activa (400). Presupuesto de pauta sin aprobar tampoco (400). Con evidencia y aprobaciones completas sí se activa (200).
- Micrófono simulado: inicio, pausa, reanudación y término; la sesión queda terminada. Audio sintético guardado en bucket privado; reproducción autorizada devuelve `audio/mp4`, exactamente los 50 505 bytes subidos.
- No se grabaron voces reales ni se enviaron mensajes, invitaciones o avisos a clientes reales.

## Validación de código

- `node scripts/test-estrategia.mjs`: pasa (fusión concurrente, tombstones, validación, defaults privados y enlace a campañas).
- TypeScript y compilación de producción: pasan.
- ESLint de los nuevos componentes, librerías y rutas: sin errores.
- Los archivos existentes modificados conservan 11 errores de lint previos de React. Se compararon con `git show HEAD:<archivo>` y no se añadieron errores nuevos. No se alteró su comportamiento para limpiar avisos ajenos al alcance.
- En Tareas se observó una advertencia de hidratación del contador de tiempo existente (`PlanChips`); es independiente del lienzo. No se considera una prueba fallida del guardado de estrategia ni se declara resuelta aquí.

## Limitación externa verificada

La cuenta de OpenAI responde `429 credit_balance_exhausted / insufficient_quota`. Fallan tanto la transcripción real como el análisis con la integración existente. El audio se guarda antes de llamar al proveedor y sigue disponible; los controles permiten reintentar. Notas, acuerdos manuales, revisión y creación de tareas funcionan sin IA. No se modificó facturación ni se adquirieron créditos. La calidad de transcripción y de extracción deberá validarse con saldo disponible.

No se ha probado una reunión larga con micrófonos reales, Safari/iPhone físico, ni una sesión masiva de colaboradores. No se promete atribución automática fiable de hablantes: los tramos se identifican como hablante sin identificar.

## Datos de QA y publicación

Las cuentas, marca, tareas, contenidos, sesiones, comentarios y archivos de audio temporales se eliminan al finalizar la comprobación del despliegue. La versión de producción se verifica nuevamente antes y después de publicar. La evidencia final de versión y limpieza se registra en `AGENTS.md` del workspace.
