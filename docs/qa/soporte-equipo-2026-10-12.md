# Checklist personal y soporte — 12 octubre 2026

Base: producción Hostinger `63d9aef` confirmada en `/api/version` antes de editar.
El trabajo incompleto de agenda en `codex/tareas-fecha-reunion` permanece intacto en su checkout.

## Cobertura

- Checklist para las 8 cuentas activas: solo tareas propias, pendientes sin iniciar, iniciar, pausar, completar, cierre de cronómetro y desaparición del pendiente. Rechazo de completar una tarea ajena desde un editor.
- Lorena: filtro de persona conservado al navegar a otro módulo y volver.
- Panel de escritorio y móvil: contraer/expandir, posición y espacio libre para pie de página. Cambio de tamaño de ventana.
- Marcas: «Distribuidora», «Total Supps» y «Total Sups» crean tareas con categoría canónica y `marca_slug` correcto.
- Reporte: mismo día de Lima en servidores UTC/Lima/Tokio, incluidos 19:21 y medianoche. Reporte histórico de Pieer del 9-oct incluye sus ediciones; PNG real del reporte diario generado y copiado (532089 bytes).
- Publicaciones: copy y portada guardados y recuperados por HTTP sin digest 2488802915; no exportación de tipo como Server Action en build.
- Diseño: al enviar a diseño una publicación previamente «lista» sin sello, queda pendiente; completar en Diseño guarda autor y fecha, quita pendiente y aparece en reporte de Ailyn.
- Soporte: aviso de resolución persistente en la campana del autor, además del push opcional. Nunca avisar por WhatsApp sin envío confirmado.

Prueba repetible: `node --env-file=.env.local scripts/test-soporte-equipo-oct12.mjs` con build y servidor local en puerto 3105. Crea fixtures identificados, verifica las acciones reales y elimina fixtures y sesiones en `finally`. No envía mensajes ni modifica tareas reales.

Prueba de regresión de build: `node scripts/test-publicacion-action-build.mjs`.

## Reportes cubiertos

- ecc39931: categoría de Distribuidora/TOTAL SUPS.
- 7a9caad8: reporte de Pieer (doble ajuste de zona horaria después de migración).
- 495c9d54: Listo en pendientes flotantes.
- c4e8bb08: filtro de Tareas persistente.
- 69c9156f: Oficina arriba, chat separado del pie y checklist contraíble/movible.
- 97bb2d07: guardado de copy y portada.
- 8d2ebfe2: diseños completados salen de pendientes.
- 5549e47c: diseños enviados desde grilla requieren completarse y entran al reporte.
