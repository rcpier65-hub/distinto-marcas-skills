# Portal de marca para clientes y accesos de TypHouse

## Uso

- En `/cliente`, **Portal de marca** abre `/marca/[slug]/estrategia` para la marca activa del cliente. Se reutiliza la ruta del espacio existente. El equipo conserva su interfaz completa.
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
