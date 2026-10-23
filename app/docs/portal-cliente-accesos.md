# Portal de marca para clientes y accesos de TypHouse

## Uso

- En `/cliente`, **Resumen de la marca** es la pantalla inicial y la primera opción del menú para todas las cuentas de cliente. La ruta `/marca/[slug]/estrategia` sigue funcionando y reutiliza el mismo resumen autorizado; el equipo conserva su interfaz completa.
- La navegación principal tiene tres entradas: **Resumen, Contenido y Soporte**. Se retiraron la barra lateral y la bienvenida extensa. Resumen agrupa trabajo en curso, planificación compartida, reuniones, reportes y recursos; Contenido conserva Publicaciones y Diseños. Las vistas de tareas, plan de trabajo, agenda, estadísticas e influencers se abren desde sus paneles del resumen, con regreso al mismo.
- TypHouse tiene **Catálogos y accesos** dentro del resumen, con catálogo, Libro de Reclamaciones y acceso a sus contraseñas. Conserva la verificación del código. Los enlaces y contraseñas siguen siendo exclusivos de TypHouse. Drive e influencers aparecen cuando están habilitados para la marca.
- Los paneles de Planificación y Reportes permanecen visibles en Resumen incluso si todavía no hay contenido compartido/publicado; muestran un estado vacío claro. Las descargas, calendario, diseño, tareas, soporte, influencers y selector de marcas se conservan.
- Al iniciar sesión se muestra el Resumen. Al volver de una descarga se recupera la sección y publicación abiertas durante dos horas. La preferencia anterior se migra una sola vez al resumen, salvo si había una publicación abierta. Los enlaces de notificación siguen abriendo su publicación o agenda; `?vista=cal` permite ir directamente al calendario.
- Clientes: Resumen, Planificación compartida y Reportes publicados. El resumen consulta publicaciones del mes, diseños activos y próximas reuniones existentes. No crea tareas, planes o agendas.
- Las hojas solo aparecen con `sharedWithClient=true` y sin archivar. El cliente abre el lienzo y comentarios ya existentes en `/cliente/planificacion/[id]`. Las notas, sesiones de audio y acuerdos internos siguen fuera del payload.
- Reportes reutiliza el componente mensual existente, su código de acceso y el criterio `computeDirecto().publicado`. Solo los meses publicados se serializan al cliente. Este acceso no abre el panel de configuración ni las API internas de Meta.
- TypHouse (slug `little-joe`) tiene dos accesos externos: Actualizar catálogos y Gestionar Libro de Reclamaciones. Cada uno tiene **Ver contraseña** y **Copiar contraseña**. Los demás clientes no ven estos enlaces.

## Datos y seguridad

- Migración `20261022180000_client_portal_access.sql`: tabla privada por marca y recurso, RLS y sin permisos para anon/authenticated.
- Contraseñas cifradas AES-256-GCM con AAD de marca/recurso; `CLIENT_ACCESS_ENCRYPTION_KEY` (32 bytes base64) solo en el entorno privado del servidor. Código adicional almacenado mediante scrypt y sal aleatoria, no en la UI.
- `POST /cliente/accesos` verifica origen, sesión, marca activa vinculada al usuario, marca habilitada y recurso. No admite una marca arbitraria del navegador. La autorización no depende del código.
- Límite atómico en BD: cinco solicitudes por usuario/marca y treinta por marca cada quince minutos. Aplica a ambos recursos y a todos los procesos. No se reinicia al acertar el código.
- Respuestas `private, no-store`, errores genéricos, sin logs de secretos. El valor solo se entrega tras validar; permanece en estado del diálogo y se oculta al cerrar, salir de la pestaña o tras un minuto. Nunca se guarda en URL, HTML SSR, almacenamiento del navegador ni bundle. Copiar requiere acción del usuario.
- Las claves se tomaron de las dos secciones autorizadas del documento de TypHouse. No se cambiaron contraseñas de origen, Shopify, hosting, DNS ni el sitio web.
- Provisionamiento reproducible: `scripts/provision-client-access.mjs`, desde `app/`, lee JSON privado por stdin con `slug,codigo,catalogos,reclamos`. Nunca pasar contraseñas en argumentos de proceso. Requiere clave de cifrado y conexión DB en entorno privado. Solo acepta la marca TypHouse y verifica cifrado antes de guardar.

## Verificación

- `scripts/test-client-brand-space.mjs`: cuentas/marcas desechables, cifrado vinculado a recurso/marca, código incorrecto/correcto, concurrencia del límite, rechazo por origen/permisos y SQL directo, aislamiento de marcas, ausencia de secretos en SSR, hojas privadas/archivadas inaccesibles, reportes borrador fuera del HTML/RSC y rutas internas bloqueadas.
- Incluye lectura real de las dos claves configuradas mediante una sesión temporal de cliente TypHouse, comparando sin imprimir valores. Limpieza garantizada en `finally`; opción `TEST_KEEP_UI_FILE` conserva una única cuenta temporal para QA visual, que debe eliminarse al terminar.
- Navegador local: ingreso normal de la cuenta temporal, ambos enlaces, error por código incorrecto, código válido, copiado exacto de ambas claves distintas, cierre del diálogo, Resumen/Planificación/Reportes y reporte publicado. Pantalla móvil de 390 px comprobada con una vista temporal eliminada antes de publicar. Se restauró el portapapeles tras las pruebas.
- El plan actual de TypHouse es privado: su cliente ve que aún no hay planificación compartida. No se cambió esa autorización al desarrollar la interfaz.

## Continuidad

Base `3215460` (diseños para presentar en reunión), sobre la producción actual de Hostinger. No publicar en Vercel ni usar ramas históricas. Revalidar `/api/version` antes de publicar. Credenciales fuera del repositorio.

## Verificación del 23 de octubre de 2026

La base publicada `4499d0e` conservaba los cambios del 22 de octubre. Se reprodujo que el portal abría en Calendario, no ofrecía Resumen en su menú y ocultaba Planificación sin hojas compartidas. Se integró la proyección existente en la entrada principal, sin migraciones ni cambios de permisos. Ambos accesos del cliente usan el mismo filtro de reportes publicados y mantienen el candado.

Compilación y TypeScript aprobados. `test-client-brand-space.mjs` verifica ahora el resumen en `/cliente` para marcas distintas, recursos de TypHouse y ausencia de meses borrador/hojas privadas también en la entrada principal; conserva sus comprobaciones de cifrado, límites, origen y aislamiento. La primera ejecución local detectó la clave de accesos ausente en el proceso de prueba; se reinició con la clave existente solo en memoria y la suite pasó. El componente antiguo mantiene los mismos cinco errores de lint previos, con una advertencia menos; página y resumen sin errores ni advertencias.

Navegador: login abre Resumen, Catálogos y Planificación aparecen en menú, enlaces de reunión abren Agenda, revisión a 390 px sin desborde horizontal y cero errores de consola. La vista móvil temporal se retiró antes de publicar. Sin cambios en datos del cliente ni mensajes enviados.

## Simplificación del portal — 23 de octubre de 2026

Base `d8abd19`. El encabezado compacto conserva logo, cambio de marca, avisos y cierre de sesión. El resumen muestra contadores de publicaciones del mes y diseños, una tabla con los pendientes de los módulos que ya recibe el cliente y enlaces contextuales a cada módulo. No hay consultas nuevas ni cambios de permisos, contraseñas o registros. Se excluyen del tablero de diseño los estados archivados que podían entrar por la consulta de publicaciones; el contador de pendientes coincide así con las piezas activas. Los enlaces antiguos y el retorno desde descargas conservan sus destinos.

Pedro confirmó explícitamente que Planificación debe mostrar **solo las hojas compartidas**; no se comparte automáticamente el plan privado de TypHouse. El reporte solo contiene periodos autorizados y publicados.

Verificación de esta simplificación: compilación y TypeScript aprobados; resumen y accesos sin problemas de lint, componente heredado con los mismos cinco errores y nueve avisos de la base. La suite de cliente pasó con cuentas temporales y confirmó hojas compartidas, reportes publicados, aislamiento de marca y acceso cifrado. Navegador local: tres entradas principales, resumen completo a 1280×720 sin scroll, recursos accesibles a 390 px, regreso desde plan de trabajo y candados de contraseñas/reporte intactos. Se corrigió el ancho mínimo de los paneles detectado durante la prueba móvil. La vista temporal de emulación se eliminó antes de publicar.
