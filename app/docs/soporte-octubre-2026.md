# Correcciones de soporte desde el 5 de octubre de 2026

Base: commit 512c9cb (codex/continuidad-produccion). El alias de producción
seguía en dpl_55DzcBjNQepLMJ81ZqWUuF2BFtRM al iniciar el trabajo.
Se cotejó el SHA-1 del contenido fuente del despliegue, incluidos los enlaces
simbólicos, con el commit de base. Se conservaron todas las mejoras existentes.

## Reportes atendidos

- 44206afb-a515-48f3-9e49-02ee3f7d7ce3: hora de publicación en el selector de
  entregables, en entregables existentes y en la ficha de publicación.
- 532f000c-068b-4f07-af17-6691c9d996f3: calendario de la marca dentro de la
  creación de diseño; límite final del rango compatible con la columna date,
  identificación de días con publicaciones y distinción de historias.
- e3a645bb-1862-4538-be4c-b9817f384ead: panel global movible de los cronómetros
  personales en proceso, con pausa/play y posición guardada por usuario.
- e8659b76-8d29-4da6-b32a-116a6055e8f4: Recordatorios personales independientes
  de Tareas, persistidos con RLS, anclados en la app y recuperables desde Listos.
- fa869ff9-28b6-414e-b2a4-61cd78c20e48: espacio del editor al inicio de la ficha,
  indicaciones de edición separadas de notas de publicación, referencias y Drive.
- 9ee56e46-0249-46c3-99ad-0746bdad3846: tipo de contenido en Publicar hoy,
  slides/resultados para posts y carruseles, botones de video solo cuando existe
  video, y acceso a material de Drive desde la tarjeta y la vista previa.
- 6dff7193-956c-4272-b7e4-50b5463ced89: etiqueta de tipo también en la grilla
  mensual compacta y color rosado exclusivo para las historias.

## Datos y validación

La migración 20261007000001_soporte_octubre.sql es aditiva e idempotente:
publicaciones.hora_publicacion, publicaciones.indicaciones_edicion y la tabla
recordatorios. No cambia fechas ni registros existentes. Las horas son Lima.

- npm run build: compilación y TypeScript.
- scripts/test-soporte-octubre.mjs: integración HTTP de acciones y páginas del
  build local, con fixtures temporales y limpieza. No envía mensajes ni push.
- ESLint: archivos nuevos sin errores; comparación con la base sin errores
  adicionales en los archivos existentes. La base contiene errores previos.

Los reportes de soporte deben mantenerse pendientes hasta publicar y validar
la versión accesible para el equipo. No usar resolverReporte para cerrar sin
confirmar publicación: esa acción también envía una notificación al autor.
