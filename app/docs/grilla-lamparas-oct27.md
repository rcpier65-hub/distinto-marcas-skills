# Grilla de Lámparas San Borja — 27 de octubre de 2026

Producción `/api/version`: `bb50b33`, sobre `5759879` (documentación) y runtime
`bed19f0`. Rama `codex/grilla-lamparas`, checkout `soporte-equipo-work`.

## Causa y corrección

- `getTheme` devolvía la identidad completa de Manrique para cualquier slug sin
  plantilla. Reproducido en HTML, navegador y PNG de Lámparas San Borja.
- Los dos renderizadores construían recursos con `request.url`, que detrás del
  proxy daba `https://localhost:3000`: logos rotos. También faltaba base para el
  fondo relativo de Fitness al renderizar con `setContent`.
- Ahora ambos consultan la identidad de la marca activa. Las marcas con plantilla
  conservan sus diseños. Las demás usan una plantilla editorial con nombre/color
  de su ficha, sin nombre, lema o identidad de otro cliente. Logos locales y logo
  de Distinto incrustados; base pública para fondos; logo configurado en la ficha
  compartido entre preview y PNG. HTML y PNG requieren sesión o bearer válido.
- Lámparas no tiene `logo_url` ni archivo local: se muestra su nombre, sin inventar
  un logo ni usar uno ajeno. No se cambió su ficha. Cuando se cargue su logo, el
  render lo utilizará.
- Botón Descargar PNG además de Copiar imagen; conserva descarga de respaldo si
  el portapapeles no está disponible. Usa el mismo endpoint y validación PNG.
- Caption corrige semanas entre meses/años; al navegar de semana se reinicia el
  estado de la vista para que texto y publicaciones correspondan al mismo rango.

## Comprobaciones

- Build Next y TypeScript aprobados; lint afectado sin errores/avisos.
- `node scripts/test-grilla-brand.mjs`: identidad de Lámparas, color inválido,
  nuevas marcas, conservación de todas las plantillas y cruces de mes/año.
- `node scripts/test-grilla-sw.mjs`: seis regresiones de caché/red aprobadas.
- `TEST_BASE_URL=... TEST_OUTPUT_DIR=... node --env-file=.env.local scripts/test-grilla-live.mjs`:
  candidato privado y producción, cuenta Lorena, publicaciones originales de
  26-oct a 1-nov. Lámparas PNG 1080×1620 de 109,008 bytes, Fitness 794,225 bytes;
  inspección visual de ambos. Sin acceso anónimo; publicaciones y flags de envío
  intactos. Cierra solo su propia sesión de prueba.
- Navegador de producción con Pedro: descarga real a Downloads con SHA-256 igual
  al PNG verificado; copiar devuelve imagen PNG de 109,008 bytes en portapapeles.
  Navegación a 19–25 oct cambia caption y publicaciones; regreso a semana actual.
  Evidencia en `output/grilla-lamparas-oct27/` de la carpeta principal.
- No se enviaron WhatsApp, correos ni avisos; no se activó envío real (ya estaba
  OFF en ambas marcas). No se modificó contenido, tareas, fechas ni credenciales.

## Publicación

Next compilado localmente. Sin cambios de dependencias/config/public. Se sustituyó
solo `.next` sobre el runtime Linux existente; imagen `distinto-agencia:grilla-bb50b33`
promovida a `distinto-agencia:prod`. Manifest Docker
`5df78bd71817ab7363e6f7c0bab7b095dae659a667e06ed8e7ec4ffe3244126e`.
Retorno: `distinto-agencia:grilla-base-bed19f0` (también Supabase VPS).

Base revalidada justo antes de publicar. Ambas redes, app.env, Supabase y otros
contenedores conservados. Candidato temporal y túnel 18122 retirados. Los 47
adjuntos históricos bloqueados por Cloud siguen pendientes; este arreglo genera
las grillas actuales desde publicaciones, no depende de esos PNG históricos.

Consultar `/api/version` antes del siguiente cambio.
