# Meta Ads MCP desde el VPS

Pedro pidió el 17-oct-2026 que la conexión funcione desde Hostinger, sin depender
de la computadora local. Esta integración es un **cliente del MCP oficial de
Meta**, alojado dentro de la app de la agencia; no publica un MCP sin autenticación.

- Producción: `https://app.distintostudio.com`, contenedor `distinto-agencia`.
- Meta app: Distinto Agencia, ID público `1401221451726168`, en desarrollo.
- Servidor remoto: `https://mcp.facebook.com/ads`.
- Pantalla: `/marca/[slug]/metricas`; TypHouse mantiene `little-joe`.
- Callback HTTPS: `/api/meta/ads-mcp/callback`, registrado en Facebook Login
  for Business. Meta lo validó en su comprobador de URI.

## Estado de esta primera entrega

Se prepara el inicio, recepción y almacenamiento de la autorización, más una
comprobación del catálogo MCP desde el servidor. **No equivale a métricas reales
conectadas**: falta el consentimiento de Meta, verificar las herramientas devueltas,
seleccionar la cuenta de cada marca y probar una lectura real de resultados.
La pantalla lo distingue explícitamente. No se implementó todavía un sincronizador
de Ads, un historial de resultados ni una herramienta para escribir campañas.

El MCP de Ads no reemplaza los insights orgánicos de Instagram/Facebook. Se
conserva el adaptador Graph API del panel, todavía pendiente de su autorización.
No se reutilizan credenciales del MCP local ni de otros contenedores del VPS.

## Autorización

`POST /api/meta/ads-mcp/start` comprueba usuario activo, administración, acceso a
la marca y Origin exacto. Usa OAuth authorization code con PKCE S256, estado
aleatorio de 256 bits, cookie HttpOnly/Secure/SameSite=Lax y retorno HTTPS fijo.
No obtiene el dominio de un parámetro del navegador.

El callback comprueba la sesión actual y el estado de la cookie. Consume el
estado de manera atómica, atado al usuario y a la marca, antes de canjear el
código. Un intento vencido/repetido, sin cookie, sin sesión o sin permiso no
genera una conexión. La denegación no modifica una autorización previa.

Meta anuncia `token_endpoint_auth_methods_supported: ["none"]` y PKCE S256
en `https://www.facebook.com/.well-known/oauth-authorization-server/ads`.
El flujo no requiere copiar el secreto de la aplicación. Los scopes solicitados
son `ads_read`, `ads_mcp_management`, `business_management`, `pages_show_list` e
`instagram_basic`; no se solicita `ads_management` ni `catalog_management`.
Si el servidor requiere más permisos, revisarlos con Pedro antes de ampliarlos.

## Almacenamiento y consultas

Migración: `20261017180000_meta_mcp_vps.sql`. Tablas nuevas
`meta_mcp_connections` y `meta_mcp_oauth_states`, RLS activado y permisos revocados
a PUBLIC/anon/authenticated. Backend con permisos comprobados antes de SQL.

Credenciales cifradas AES-256-GCM con contexto de marca; verificador PKCE cifrado
con contexto del estado. Clave `META_MCP_ENCRYPTION_KEY` solo en el entorno
privado del VPS, junto a `META_MCP_APP_ID` y `META_MCP_ORIGIN`. No copiar valores
secretos a Git, documentación, navegador, conversaciones ni logs.

El cliente usa el SDK MCP 1.32.1, Streamable HTTP, Bearer solo al endpoint fijo
de Meta, redirects prohibidos, tiempo máximo por solicitud y cierre de conexión
al terminar. Renueva tokens, cuando Meta entrega refresh token, bajo bloqueo de
fila para evitar carreras. Si no hay refresh, requiere reconectar al vencer.
Errores originales de Meta/SDK no se devuelven ni registran con tokens.

La comprobación del catálogo está restringida a administración y marca. Todavía
no hay un proxy genérico para invocar herramientas. Antes de habilitar reportes:
validar el esquema real, permitir únicamente herramientas de lectura concretas,
fijar la cuenta en el servidor y no aceptar cuentas o herramientas arbitrarias
desde el navegador.

## Validación

- Build y lint de archivos afectados.
- `node scripts/test-meta-mcp-crypto.mjs`: cifrado, contexto de marca, alteración,
  estado y vector oficial de PKCE RFC 7636.
- `TEST_PUBLIC_ORIGIN=https://localhost:3117 node scripts/test-meta-mcp-access.mjs`
  contra servidor local con ese origen configurado. En producción usar
  `TEST_BASE_URL=https://app.distintostudio.com` sin TEST_PUBLIC_ORIGIN.
- Prueba crea sesiones temporales de Pedro/TOTAL SUPS y un intento OAuth que
  deniega; no autoriza Meta ni canjea códigos. Cierra solo esas sesiones y elimina
  su estado. Comprueba acceso, Origin, cookies, estado de un solo uso, denegación,
  aislamiento del cliente y tablas privadas.

Fuentes: [Meta Ads MCP](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-overview),
[autorización](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-get-started),
[reportes](https://developers.facebook.com/documentation/ads-commerce/ads-ai-connectors/ads-mcp-server/ads-mcp-server-tools-comprehensive-reporting).
