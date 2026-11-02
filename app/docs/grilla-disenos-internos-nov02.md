# Diseños internos fuera de la grilla — 2 noviembre 2026

Producción VPS comprobada en `3f393b8`, sobre `0c3aff9` y su documentación
`70ee979`. Rama `codex/grilla-sin-disenos-internos`, checkout soporte-equipo-work.

## Causa

El filtro anterior solo excluía diseños en estado `disenar` sin fecha. Al
terminarlos pasaban a `aprobar` y entraban a Publicaciones aunque fueran
`INTERNO`. Las filas sin fecha recibían el día actual en la transformación.
La carga completa añadió visibilidad a estos registros antiguos: se reprodujo
80 internos visibles y 39 tarjetas el lunes en Distribuidora Fitness.

## Corrección

- Filtro común por tipo real: `INTERNO` queda fuera independientemente del
  estado, fecha o flag. Diseños históricos sin tipo permanecen en Diseño.
- Conserva Post, Carrusel, Historia, y los tipos Reel/Video históricos. Los
  registros normales del pipeline sin tipo también se conservan.
- Mismo filtro en Publicaciones (listado/calendario), grilla semanal, generación
  PNG y lectura previa al envío. No se enviaron mensajes ni se regeneraron
  grillas históricas almacenadas.
- Sin fecha real no se inventa hoy: aparece «Sin fecha» en Listado, con acceso
  desde el calendario. No se modificaron filas, fechas, enlaces ni estados.
- Diseño, bocetos y entregables internos siguen disponibles.

## Validación

- Build webpack y TypeScript pasan; pruebas de paginación y visibilidad pasan.
- Lint de archivos modificados conserva exactamente dos errores previos de
  setState en efectos de PublicacionesView, cotejados contra la base sin cambios.
- Integración en candidato y producción con sesiones propias de Pedro/Lorena:
  85 internos y 265 diseños históricos sin tipo excluidos, 1,470 publicaciones
  conservadas, fechas originales, detalle interno accesible, anónimo bloqueado.
- Regresión Distinto Studio: ocho registros visibles, cinco videos editados,
  archivado excluido y datos originales idénticos antes/después.
- UI producción Fitness: semana 2–8 noviembre, seis piezas programadas; lunes
  una pieza frente a 39 anteriores; 16 sin fecha accesibles en Listado. Captura
  mensual en `output/grilla-internos-nov02/grilla-corregida.png`.
- Se compiló localmente y probó runtime candidato en VPS; promoción con control
  de versión/base y rollback. Se preservaron las tres redes del servicio.

Consultar `/api/version` antes de continuar. No restaurar datos ni una rama vieja.
