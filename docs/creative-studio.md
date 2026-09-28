# Estudio creativo por marca

Ruta: `/creacion-de-ideas`. Sustituye el iframe anterior, que se conserva como archivo para recuperar sus borradores (`creacion-ideas.v1`) desde el nuevo módulo.

## Flujo

1. Elegir marca y configurar su ADN: posicionamiento, audiencia, oferta, tono, mandatarios, qué decir/evitar, formato y personajes.
2. Agregar fuentes públicas HTTPS o extractos de documentos/productos. La IA solo recibe fuentes marcadas como revisadas. No se hace crawling de sitios completos ni extracción automática de PDF privados.
3. Crear una tanda de 1–30 guiones con cantidades Ads/orgánico, objetivo, plataforma y grabación opcional. La configuración puede editarse posteriormente.
4. Trabajar un guion por vez: enfoque y conciencia → idea → insight/ángulo → formato/estructura → gancho → escenas/planos → prueba/payoff → CTA/requerimientos → revisión.
5. El copiloto propone cinco alternativas al entrar a cada etapa con un objetivo/idea disponible. Permite explorar cinco más, refinar lo escrito, aplicar/deshacer y recuperar generaciones. El checklist se evalúa automáticamente tras una pausa de escritura; cada criterio muestra cumple, por mejorar o falta contexto con evidencia y ajuste concreto. La revisión final de marca sigue siendo humana.
6. Marcar el guion revisado; crear una copia en Publicaciones. La creación es idempotente y respeta permisos de edición. Las revisiones futuras no pisan el guion de la publicación.
7. Descargar el Word completo o seleccionar una carpeta de Google Drive. Los borradores se identifican como tales en el documento.
8. El icono de papelera junto a cada guion pide confirmación y libera su cupo Ads/orgánico. «Eliminados» permite recuperarlo completo mientras exista cupo; si ya se usó, se puede ampliar la tanda. Se conservan los vínculos de Publicaciones y el historial de IA.

Recuperación de guiones: migración aditiva `20260928_creative_script_recovery.sql`. `creative_batches.deleted_scripts` queda separado de `data` para que el guardado de clientes anteriores no borre la papelera. Eliminar/recuperar modifica ambos campos en una sola escritura con comparación de revisión y los mismos permisos de marca. La UI guarda primero el borrador y bloquea actualizaciones de IA durante la operación. Los guiones eliminados no se exportan ni consumen cupos. Pruebas: contenido/ID/orden al recuperar, cupos por tipo, IDs ajenos/repetidos y conservación de otros eliminados; prueba transaccional en PostgreSQL con rollback, revisión obsoleta rechazada y permisos directos denegados.

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

Prueba con la sesión real en producción (28-sep-2026): creación y edición de una tanda de Manrique, guardado del guion, tres sugerencias de IA, aplicación de una sugerencia, elección de plano y campos de producción. Word descargado y XML inspeccionado: contiene el contenido guardado, plano, diálogo, texto, requerimientos y estado BORRADOR. Se confirmó el mensaje de consentimiento pendiente de Drive. La tanda «Prueba del estudio · 2 guiones» queda como ejemplo sin aprobación ni envío a Publicaciones.

## Copiloto contextual (28 septiembre)

- Nueva migración aditiva `20260928_creative_ai_generations.sql`. Guarda cada generación antes de llamar al modelo: UUID, usuario, marca vía tanda, guion, etapa, entrada, estado, resultado, tokens y estimación de coste. RLS sin acceso directo; consulta autorizada por marca en `/api/creative-studio?generation=<uuid>`.
- SHA-256 deduplica solicitudes automáticas idénticas; las solicitudes explícitas permiten cinco opciones nuevas. Un fallo conserva la respuesta incompleta para diagnóstico; la UI muestra error y reintento. Historial recuperable de las últimas 12 generaciones por guion/etapa.
- Cinco propuestas deben satisfacer el contrato de la etapa. Se exige JSON Schema estricto al proveedor y se filtran campos ajenos antes de validarlos. Un patch de IA no puede marcar listo, aprobar la marca o tocar campos de otra etapa. Los resultados que llegan tarde permanecen asociados a su etapa/guion.
- Evaluación automática tras 6,5 segundos sin cambios; firma del contenido + perfil + objetivo de tanda + plataforma invalida evaluaciones obsoletas. No se aprueba formato/personaje sin ADN. La IA debe citar el contenido y explicar qué falta; no se garantiza viralidad.
- El prompt copiable para investigar el insight incorpora objetivo, conciencia, idea, audiencia y límites de marca. Abrir ChatGPT no transmite el prompt; el usuario lo pega. Los hallazgos pegados son hipótesis hasta que el equipo marca que revisó sus fuentes. No se simula investigación web dentro del generador.
- Modelo existente `gpt-4o-mini`; valoración aproximada de tokens según https://developers.openai.com/api/docs/models/gpt-4o-mini (28 septiembre 2026), no equivale a factura. Límite de 12 generaciones/minuto/usuario y hasta 95s por llamada.
- Verificación: `npx tsx --test lib/creative-studio/studio.test.ts lib/creative-studio/ai-contract.test.ts lib/grilla/render-response.test.ts` y `node --test scripts/test-grilla-sw.mjs`: 23 pruebas. TypeScript, ESLint y compilación correctos. Migración aplicada y acceso anon/authenticated denegado comprobado.

Prueba real del contrato del copiloto (28-sep): llamadas al modelo con la tanda de prueba devolvieron exactamente cinco propuestas válidas en Idea, Insight/ángulo, Gancho y Escenas (seis escenas en la primera opción). Se reprodujo y corrigió el rechazo de propuestas válidas por campos de relleno ajenos a la etapa, con prueba de regresión.
