# Vista previa actual de entregables — 28 de octubre de 2026

Producción `/api/version`: `d1a1626`, commit
`d1a1626c3e20c96735bac7d9f1fdfdb123ad2b5a`, sobre `3407759` (documentación)
y runtime `bb50b33`. Rama `codex/diseno-preview-actual`, checkout `soporte-equipo-work`.

## Hallazgo

Ailyn reportó una imagen anterior en «POST 1 VID NATUR HALLOWEEN», tarea
`6f82b306-2c99-8a7b-9e45-f8dbc2c00870`, entregable
`aed7eb26-45b9-4178-80ed-3347e96e7730`. El enlace de la entrega coincidía con
`drive_resultado_url` y `portada_editada_url` de la publicación enlazada.
La miniatura `drive.google.com/thumbnail` responde con caché privada de 86 400 s.
En la captura el título era naranja; el original consultado ya tenía texto azul.

Durante la prueba de VPS, Drive volvió a actualizar ese mismo archivo: Last-Modified
28-oct-2026 16:01:44 UTC, de 1 527 219 a 1 572 580 bytes, con nuevos envases.
Esto hizo fallar una comparación contra la captura anterior del original; se
volvió a leer el origen y se confirmó la nueva imagen idéntica en tres respuestas
consecutivas. No se cambió el archivo desde esta tarea.

## Corrección

- El panel de entregables de posts, historias y carruseles usa el original desde
  `/api/diseno/entregables/[id]/preview`, siempre `private, no-store`.
- El servidor resuelve el enlace guardado y el índice del slide. Reutiliza el
  transporte de Revisiones con protección de destinos y validación de formatos.
  Requiere miembro activo, permiso de revisión y acceso a la marca tanto de la
  tarea como de la publicación. No acepta URL arbitraria enviada por el visitante.
- Refresca al guardar un enlace y recuperar foco/visibilidad, además del botón
  «Actualizar vista previa». Muestra carga/error y conserva la imagen completa.
- Enter guarda el enlace; los errores de transporte conservan el texto y permiten
  reintentar. Éxito de guardado se confirma con aviso. Versionado V1/V2 sin cambios;
  refrescar una imagen no registra una nueva entrega o revisión.
- No se cambiaron enlaces, estados, responsables, fechas, archivos ni permisos
  del diseño real. No se enviaron mensajes, invitaciones ni avisos a clientes.

## Verificación

- Compilación Next/TypeScript y lint de archivos afectados aprobados.
- `scripts/test-entregable-preview.mjs` pasó en local, candidato privado del VPS
  y producción: original idéntico byte por byte, enlace A→B guardado en entrega
  y publicación, V1/V2, slides correctos, validación de índice/ID, bloqueo de
  anónimo/cliente/otra marca/inactivo. Fixtures y sesiones técnicas eliminadas;
  la entrega real, publicación e historial se compararon sin cambios.
- Navegador local con Ailyn y producción con Pedro: imagen actual, botón de
  refresco y carga verificados. Evidencia de producción:
  `output/vid-natur-preview-oct28/preview-publicado.png` en carpeta principal.
- No se probó el dispositivo físico de Ailyn. Su pestaña ya abierta necesita
  recargar para recibir este código.

## Publicación

Next compilado localmente; solo `.next` reemplazado sobre la imagen Linux
`distinto-agencia:grilla-bb50b33`. Imagen actual
`distinto-agencia:preview-d1a1626`, promovida a `distinto-agencia:prod`;
manifest `3a9f2165b85cc0802d50a0e154bb9b11b094b4ebed1112bb188946894bd0b115`.
Rollback disponible: `distinto-agencia:grilla-bb50b33`.
Se revalidó producción antes de publicar. Ambas redes, app.env, Supabase VPS y
el otro contenedor `distinto-app` se conservaron. Sin migraciones de esquema.
Candidato, servidor local y túneles temporales retirados al terminar.
