# Reporte de redes por marca

## Entrada y conexión

`/marca/[slug]/reportes`, desde **Reportes de redes** en el espacio de marca o
**Ver reporte** en su tarjeta de redes. El panel de Métricas conserva el selector
de cuentas y su reporte Ads existente; también enlaza al reporte mensual nuevo.

Reutiliza la autorización global de Meta y los IDs guardados en
`meta_brand_accounts`. No solicita otra autorización ni crea credenciales. El
servidor del VPS consulta Graph API v26.0; no entrega tokens al navegador. Ads usa
la misma autorización con un rango explícito, para coincidir con el mes elegido.
No requiere MCP local. Los reportes de Shopify existentes no cambian.

El endpoint GET `/api/meta/reporte-redes` acepta únicamente `marca`, `mes`
(`YYYY-MM`) y `detalle` (`report` o `posts`). Autoriza sesión activa,
administración/director/owner y acceso a la marca antes de leer su vinculación.
Clientes no pueden consultarlo. No admite IDs de cuentas arbitrarios del cliente.

## Contenido y criterios

- Meses cerrados: mes completo contra mes anterior completo.
- Mes vigente: días completos hasta ayer, contra los días equivalentes del mes
  anterior (limitado a su duración). Nunca compara el mes parcial con todo el anterior.
- Seguidores: total actual, etiquetado como tal; no inventa totales históricos.
- Facebook: visualizaciones, espectadores únicos, Me gusta, interacciones,
  reacciones, visitas a página, seguimientos/bajas y vistas orgánicas/de anuncios.
- Instagram: visualizaciones, alcance, Me gusta, interacciones, comentarios,
  compartidos, guardados y seguimientos/bajas.
- Ads: inversión, conversaciones iniciadas y costo calculado por conversación,
  con moneda y zona horaria de la cuenta asignada. Las conversaciones son la
  acción `onsite_conversion.messaging_conversation_started_7d`; no se suman
  aliases ni se presentan todas como conversaciones de WhatsApp.
- Destacadas se cargan a demanda: Instagram ordena por Me gusta + comentarios
  hasta 100 publicaciones, Facebook por vistas de las 30 más recientes. Muestra
  tres por red, enlace y miniatura; avisa si el listado o estadísticas son parciales.
  Son publicaciones del periodo, pero sus métricas son acumuladas al consultar.
- Lectura del periodo basada solo en cifras disponibles, sin inferir causalidad.
- TikTok se presenta pendiente de integración propia, nunca como cero de Meta.

La respuesta se conserva 5 minutos en memoria, separada por marca, mes, detalle,
fecha y versiones de vinculación/autorización. Si estas cambian durante la lectura,
la respuesta se rechaza para evitar presentar datos de una selección anterior.
Solicitudes concurrentes idénticas comparten consulta. Máximo 40 entradas.
El navegador recibe `private, no-store` y cancela respuestas antiguas al cambiar mes.

## Limitaciones comprobadas en la API

- Instagram limita estos insights a 30 días por petición. Para meses de 31 días
  se dividen las métricas aditivas; **no se suman alcances únicos**. El alcance del
  periodo de 31 días queda sin dato y se explica en la tarjeta.
- Facebook entrega espectadores únicos con `period=total_over_range`. Nunca se
  calcula sumando alcance diario. Las métricas aditivas diarias requieren todos
  los días; una respuesta incompleta queda sin dato.
- El desglose `is_from_ads` está disponible para `page_media_view` de Facebook.
  Se acepta solo si orgánico + anuncios coincide con el total. Instagram rechaza
  ese desglose en esta consulta; no se resta Ads de las vistas para inventarlo.
- Las interacciones de Facebook incluyen clics; no equivalen a las de Instagram.
  El reporte no suma ambas en una supuesta métrica homogénea.
- Meta usa sus propios cortes diarios de redes; Ads sigue la zona horaria de su
  cuenta. La interfaz lo indica. El historial depende de disponibilidad/retención
  del proveedor aunque el selector permita consultar los últimos 24 meses.
- Sin respuesta de Meta se muestra `—`. Un cero solo se muestra si está devuelto
  por Meta. Si el periodo anterior es cero o falta, no se calcula porcentaje.
- Consultar reacciones/comentarios en el edge de posts de Facebook requería otro
  permiso. Se usan insights de vistas/reacciones ya autorizados; comentarios de
  posts Facebook quedan sin dato. No se ampliaron permisos.
- Las URLs de publicaciones e imágenes se validan contra dominios públicos de
  Meta, HTTPS y ausencia de `access_token`; no se siguen URLs de paginación.

## Verificación

Desde `app/`:

```sh
node scripts/test-social-report.mjs
TEST_BASE_URL=http://localhost:3117 node scripts/test-social-report-access.mjs
TEST_BASE_URL=https://app.distintostudio.com TEST_LIVE_META=1 node scripts/test-social-report-access.mjs
```

La prueba de integración utiliza sesiones temporales de Pedro y TOTAL SUPS,
revoca solo esas sesiones al terminar y no cambia datos, cuentas ni permisos.
El bloque live usa la vinculación actual de TypHouse como fixture; requiere que
siga seleccionada y con actividad en el mes vigente. Comprueba además que no hay
secretos en los payloads y que la configuración permanece intacta.
