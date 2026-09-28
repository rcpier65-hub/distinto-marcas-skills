# Estudio creativo por marca

Ruta: `/creacion-de-ideas`. Sustituye el iframe anterior, que se conserva como archivo para recuperar sus borradores (`creacion-ideas.v1`) desde el nuevo módulo.

## Flujo

1. Elegir marca y configurar su ADN: posicionamiento, audiencia, oferta, tono, mandatarios, qué decir/evitar, formato y personajes.
2. Agregar fuentes públicas HTTPS o extractos de documentos/productos. La IA solo recibe fuentes marcadas como revisadas. No se hace crawling de sitios completos ni extracción automática de PDF privados.
3. Crear una tanda de 1–30 guiones con cantidades Ads/orgánico, objetivo, plataforma y grabación opcional. La configuración puede editarse posteriormente.
4. Trabajar un guion por vez: enfoque y conciencia → idea → insight/ángulo → formato/estructura → gancho → escenas/planos → prueba/payoff → CTA/requerimientos → revisión.
5. Aplicar propuestas de IA por decisión y editarlas. Los seis criterios de viralidad son validaciones humanas opcionales, no una puntuación de resultados.
6. Marcar el guion revisado; crear una copia en Publicaciones. La creación es idempotente y respeta permisos de edición. Las revisiones futuras no pisan el guion de la publicación.
7. Descargar el Word completo o seleccionar una carpeta de Google Drive. Los borradores se identifican como tales en el documento.

## Persistencia y permisos

Migración: `app/supabase/migrations/20260928_creative_studio.sql`. Tablas `creative_brand_profiles`, `creative_batches`, `creative_publication_links`; RLS y permisos deniegan acceso directo a anon/authenticated. Cada endpoint usa identidad Supabase verificada y marca autorizada antes de usar el service role. Se rechazan cuentas inactivas y cuentas sin miembro de equipo (excepto el propietario explícito de la app).

Tandas y perfiles usan revisiones optimistas. Un conflicto requiere recargar, con respaldo JSON disponible; no se sobreescriben silenciosamente cambios ajenos. Se mantiene un borrador local por usuario/tanda como recuperación, además del guardado automático en servidor. La lista muestra las últimas 100 tandas por marca y el historial hasta 35 guiones de Publicaciones; las propuestas usan hasta 12 guiones recientes.

## IA y fuentes

OpenAI se configura mediante la integración existente de la app. Las claves nunca llegan al navegador. Las fuentes y el historial se delimitan como datos sin autoridad instructiva. El lector web valida DNS/IP, bloquea redes internas y vuelve a validar redirecciones; fija la dirección resuelta durante la conexión. Texto limitado a 18k caracteres por fuente. No se inventan testimonios, cifras, promociones ni resultados; los faltantes deben señalarse para validación.

## Drive

El token existente de Google se guarda en servidor. El calendario sigue solicitando sus scopes habituales. El botón explícito «Autorizar Drive» (solo administrador/director/propietario) añade el scope Drive para explorar carpetas y escribir archivos, con consentimiento en Google e `include_granted_scopes`. Hace falta habilitar Google Drive API en el proyecto OAuth si aún no está habilitada.

El equipo restringido solo puede navegar y guardar dentro de `marcas.drive_url`. Administradores pueden elegir carpetas de la cuenta, incluido un enlace a una carpeta compartida. El selector pagina resultados. La carga crea un archivo DOCX mediante multipart; no publica enlaces compartidos ni envía mensajes al cliente.

## Verificación

- `npx tsx --test lib/creative-studio/studio.test.ts` (desde `app`).
- `npx tsc --noEmit`; ESLint de rutas/componentes añadidos; `npm run build`.
- Prueba transaccional revertida contra PostgreSQL: CAS de revisiones, RPC idempotente, marca de publicación, restricciones anon/authenticated.
- Verificación del XML del DOCX generado: contiene estrategia, plano/acción, audio y requerimientos consolidados.
- El guardado real en Drive solo puede probarse después de otorgar el consentimiento de Drive; la descarga no depende de esa autorización.
