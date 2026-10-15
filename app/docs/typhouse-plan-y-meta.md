# TypHouse: plan de octubre y conexión directa a Meta

## Entrega del espacio de marca

Ruta: `/marca/little-joe/estrategia`. El slug histórico se conserva.
Hoja: `aa6bd9a0-52f0-486b-9c06-19411f3c1296`.

Se completó el contexto compartido con Creación de Ideas y se creó un plan
privado en borrador para el 15–31 de octubre. Hay 23 registros originales
vinculados; la población no crea tareas, acuerdos ni reuniones. Las 137 tareas
históricas de la marca se conservaron. No cambia responsables, plazos ni estados.
El lienzo contiene seis bloques de trabajo y la pestaña Plan muestra los estados
actuales de los registros enlazados.

El resumen separa mes, semana, trabajo sin fecha y terminados. Los diseños
sellados como terminados y las tarjetas independientes Listo ya no se cuentan
como vencidos. Los registros archivados se consultan en sus módulos originales.

## Meta, no intermediarios

Pedro eligió expresamente la API oficial de Meta el 15-oct-2026. Este espacio
no consulta Windsor.ai ni Metricool. Se conserva la integración de comentarios
que ya existía en otras partes de la app.

`GET /api/estrategia/metricas?marca=...` verifica sesión y acceso a la marca antes
de resolver cuentas. Consulta exclusivamente Graph API por HTTPS con el token
en Authorization, en el servidor. Timeout de 8 s por solicitud, consultas
independientes en paralelo, caché máximo 15 min (1 min en error), respuesta
privada no-store. Sin credenciales no hace peticiones a Meta ni inventa cifras.

La primera conexión está preparada para seguidores de Facebook e Instagram y
alcance/interacciones totales del periodo en Instagram. El alcance diario no se
suma: personas repetidas entre días inflarían ese indicador. No calcula crecimiento
de seguidores sin un historial validado. TikTok necesita su propia API.

Configuración pendiente, en el entorno secreto del VPS:

- `META_GRAPH_VERSION`: versión aprobada para la aplicación; base consultada en
  el SDK oficial: v26.0. No se cambia la versión del reporte Ads existente.
- `META_SOCIAL_ACCOUNTS_JSON`: objeto indexado por UUID de marca con
  `facebookPageId`, `instagramUserId` y, opcionalmente, `accessToken` por marca.
- `META_SOCIAL_TOKEN`: token de lectura alternativo cuando no hay uno por marca.

No poner valores reales en Git, capturas ni mensajes. Confirmar qué app de Meta
posee la autorización, la página correcta y el Instagram profesional vinculado.
Para Facebook Login, revisar permisos de lectura de páginas/Instagram e insights
según los endpoints que se activen. La existencia de un token Ads no demuestra
que pueda leer métricas orgánicas. Verificar revisión/Advanced Access si aplica.

En la inspección del VPS de esta entrega no había variables META_, FACEBOOK_
ni INSTAGRAM_ en el contenedor de la agencia. Por eso la prueba real devuelve
`unconfigured`; la lectura de cifras sigue pendiente de autorización.

## MCP propio en el VPS: viable, pendiente de conexión y alcance

El VPS puede alojar un proceso MCP independiente detrás del HTTPS de Traefik.
La app seguiría usando su backend; un adaptador MCP reutilizaría la misma capa
de datos para clientes compatibles (por ejemplo, Claude/Codex).

Primera versión sugerida, de lectura:

- listar marcas y cuentas autorizadas;
- consultar seguidores e insights por marca y periodo;
- consultar resultados Ads con `ads_read`, cuando esté autorizado;
- devolver fuente, fecha de actualización y métricas no disponibles.

Un MCP no obtiene permisos por sí solo: requiere la misma autorización de Meta.
El token de Meta permanece en el servidor. La autenticación del cliente MCP debe
ser independiente, con tokens emitidos para ese MCP (sin token passthrough),
restricción por usuario/marca, HTTPS y validación de Origin. Elegir una versión
Streamable HTTP compatible con los clientes objetivo. El despliegue de un MCP
públicamente accesible no forma parte de esta entrega: primero identificar la
conexión que Pedro ya tenga y aprobar el acceso concreto.

Fuentes oficiales consultadas:
- https://www.postman.com/meta/instagram/folder/u4g5a2a/instagram-api-with-facebook-login
- https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/iguser.py
- https://github.com/facebook/facebook-python-business-sdk/blob/main/facebook_business/adobjects/page.py
- https://modelcontextprotocol.io/specification/2025-11-25/basic/authorization
- https://ts.sdk.modelcontextprotocol.io/server

## Verificación

`node scripts/test-brand-overview.mjs`, `node scripts/test-estrategia.mjs`,
lint de archivos afectados, build y `scripts/test-typhouse-workspace.mjs`.
Este último usa sesiones temporales, solo lee datos de marca y comprueba
rechazo de origen ajeno y aislamiento del portal de TOTAL SUPS.
