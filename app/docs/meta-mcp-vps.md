# Meta: una conexión de agencia y selección por marca

Pedro pidió el 17-oct-2026 una sola autorización para sus cuentas de Meta,
con selectores de Ads, Facebook e Instagram dentro de cada marca.
Producción es Hostinger: https://app.distintostudio.com, contenedor
`distinto-agencia`. No se publica en Vercel ni se requiere la computadora local.

## Flujo

- Configuración central: `/settings/meta` (enlace desde Settings).
- Una app de Meta: Distinto Agencia, ID público `1401221451726168`.
- OAuth del propietario: `/api/meta/ads-mcp/start`, retorno HTTPS registrado
  `/api/meta/ads-mcp/callback`. El retorno va a la configuración central.
- Una fila `meta_agency_connection`: credencial cifrada AES-256-GCM,
  autorización y expiración. Renovación bajo bloqueo de fila cuando Meta ofrece
  refresh token. Sin refresh token, se pide renovar la autorización al vencer.
- `meta_brand_accounts`: solo IDs y nombres de las cuentas elegidas por marca;
  no contiene tokens ni inicia autorizaciones independientes.
- Página de marca `/marca/[slug]/metricas`: selectores de cuentas, reporte de
  Meta Ads y métricas orgánicas. TypHouse conserva slug `little-joe`.
- Ads: el VPS consume `https://mcp.facebook.com/ads` con el SDK oficial MCP.
  Facebook/Instagram: el mismo token de Meta se usa por servidor con Graph API.
  TikTok necesita su propio proveedor; no se inventan datos de esa red.

## Autorización y seguridad

Solo el propietario puede iniciar/reemplazar la conexión central, enumerar todo
el catálogo o guardar asignaciones. Los reportes comprueban administración y
acceso a la marca; los clientes y usuarios anónimos no acceden a estas rutas.
El resumen orgánico conserva los permisos existentes del espacio de marca.

OAuth usa PKCE S256, estado aleatorio de 256 bits, cookie HttpOnly/Secure/Lax,
Origin exacto, vencimiento a 10 minutos y consumo atómico vinculado al usuario.
Denegación, estados repetidos o expirados no sustituyen la autorización anterior.
El SDK usa URL fija, Bearer, tiempos máximos y prohíbe redirects. Nunca se imprimen
códigos ni tokens ni se envían al navegador. Los permisos guardados provienen de
la respuesta real o de `/me/permissions`, no de asumir que se concedieron.

Permisos solicitados: `ads_read`, `ads_mcp_management`, `business_management`,
`pages_show_list`, `instagram_basic`, `pages_read_engagement`,
`instagram_manage_insights`, `read_insights`. No se piden `ads_management` ni
`catalog_management`. Meta muestra un permiso amplio de administración de negocio;
Pedro debe revisar y aprobar la ampliación de activos/permisos en su diálogo.
La app solo invoca estas herramientas MCP: `ads_get_ad_accounts`,
`ads_get_field_context`, `ads_get_ad_entities`. No hay proxy de herramientas
arbitrarias, cambios de campañas ni envío de mensajes.

Los selectores validan los activos contra Meta antes de guardarlos. Instagram
se valida contra la página elegida. El servidor fija la cuenta desde la marca,
no desde parámetros de un reporte. Cambiar de autorización conserva las
asignaciones, pero se revalida acceso a la cuenta antes de cada reporte sin caché.
Cambiar una asignación invalida las claves de caché de esa marca; la conexión
central actualizada invalida todas. No se asignan cuentas por similitud de nombre.

## Datos y límites

Ads ofrece este mes, mes pasado, 7 días y 30 días. Muestra inversión, alcance,
impresiones, clics, CTR/CPC y compras atribuidas con valor/ROAS de compras web.
Son métricas de atribución publicitaria, no ventas conciliadas ni pedidos Shopify.
Cifras ausentes se muestran como «—». Se verifican ID, moneda y formatos reales de
Meta (objetos monetarios, porcentajes con coma). Caché máximo 5 minutos.

El panel orgánico conserva seguidores de Facebook/Instagram y alcance e
interacciones de Instagram de 14 días completos. Usa solo los IDs asignados;
no copia el resultado de una marca a otra. Permisos faltantes dan estado parcial,
no éxito ficticio. No hay aún histórico persistente de métricas ni sincronizador
periódico: la lectura se realiza al abrir/actualizar, desde el VPS.

La migración `20261017210000_meta_agency_connection.sql` adopta la única
credencial anterior preservando su cifrado y AAD; no amplía permisos por SQL.
Las tablas anteriores quedan como legado sin uso por el código nuevo. Las tres
tablas nuevas tienen RLS, privilegios revocados a PUBLIC/anon/authenticated y
acceso solo del backend. No se modifican tareas, calendarios ni reportes anteriores.

## Comprobaciones

- Build Next.js/TypeScript y lint de código nuevo.
- `node scripts/test-meta-mcp-crypto.mjs`.
- `node scripts/test-meta-mcp-report.mjs`: formatos reales, nulos, cuenta y moneda.
- `TEST_BASE_URL=... TEST_PUBLIC_ORIGIN=... node scripts/test-meta-mcp-access.mjs`:
  sesiones temporales, propietario/cliente/anónimo, Origin, PKCE, cookies, estado
  de un solo uso, denegación y tablas privadas. No ejecutar durante un OAuth real.
- `TEST_BASE_URL=... TEST_PUBLIC_ORIGIN=... node scripts/test-meta-mcp-report-access.mjs`:
  bloqueo de enumeración a Lorena, clientes y anónimos, cuenta fija, periodos
  permitidos, herramientas arbitrarias rechazadas y asignaciones intactas.
  `TEST_LIVE_META=1` comprueba un reporte real de TypHouse ya vinculado.

Se comprobó desde el VPS el MCP de Meta y una consulta de TEAM LITTLE JOE
(`1206507377876940`, USD, America/Lima): 899.62 de inversión y 324668 impresiones
en este mes en la consulta del 17-oct. La cuenta coincide con el reporte anterior.
La API de Instagram respondió para `typhouse.pe` (`17841465287280190`) con 9441
seguidores. Facebook (`246561581878576`) exigió `pages_read_engagement` con la
autorización inicial. La ampliación global y los selectores deben verificarse
en producción antes de declararlos completados.

Referencias: https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started
https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools-comprehensive-reporting

QA de continuidad: las 722 actividades de TypHouse, sus IDs/estados/fechas,
planes y vínculos coinciden con producción 779d2cd. El test histórico
`test-typhouse-workspace.mjs` se detiene porque esperaba un banner pendiente que
ahora está Listo tanto en producción como local; no se cambió ese registro.
Settings conserva cuatro advertencias/error de lint de comillas sin escapar,
confirmadas en HEAD anterior. El código nuevo no tiene errores de lint.
