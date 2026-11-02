# Videos de Distinto Studio — 2 noviembre 2026

Base publicada verificada: `98278a6`; checkout `30f5c69` con documentación.
Referencias remotas y ramas locales consultadas antes de editar.

## Causa comprobada

Publicaciones pedía solo 200 filas globales, ordenadas por fecha descendente,
y después aplicaba el filtro de marca en el navegador. Había 1,973 filas y el
corte caía el 12 de octubre. Distinto Studio tenía nueve registros guardados,
pero solo dos llegaban a la pantalla. Cinco videos tenían edición terminada,
ambos enlaces y estado Aprobar; cuatro de ellos quedaban fuera del recorte.
No estaban borrados ni marcados como publicados.

Además, las fechas de estos videos están en octubre. La vista Semana de
noviembre no los muestra; Listado permite consultarlos sin mover esas fechas.
El registro «1. ESTRUCTURAR VIDEO CORTO» estaba en Editar sin enlaces finales
al consultar. Se conserva su estado real, sin inventar una entrega.

## Cambio

Carga paginada de 500 filas hasta completar el listado, con orden estable por
fecha e ID. Se conserva el filtro existente de tareas de diseño sin fecha,
fechas, enlaces, estados y filtros/vistas del usuario. Los registros Archivados
se excluyen para que no se etiqueten erróneamente como Pendiente. No hay
mutaciones de BD.

Si falla alguna página, se rechaza el resultado parcial. La pantalla informa
el fallo y permite recargar; ya no reemplaza datos reales por ejemplos ficticios.
El fallback de columnas antiguas solo se aplica cuando el esquema las desconoce.

## Verificación

- Reproducción visual en producción: Distinto Studio mostraba dos publicaciones.
- `test-publicaciones-studio-live.mjs` falla contra la versión anterior por un
  video ausente. Solo sesiones propias temporales; sin correos ni cambios de datos.
- `test-publicaciones-completas.mjs`: más de 1,000 registros, empates de fecha,
  registro sin fecha, lista vacía y fallo de una página intermedia.
- Lint de archivos afectados aprobado.

- La compilación Turbopack encontró el fallo local previo de fuentes Google;
  compilación completa con webpack y TypeScript aprobada sin cambiar fuentes.
- Candidato inicial y producción `b68d97c`: todos los nueve registros originales
  llegan al cliente, cinco editados, sin alteración de datos. Tras detectarse
  que un histórico archivado se etiquetaba como Pendiente, se excluyó del listado
  (`0c3aff9`): ocho visibles, conservando el archivado en la base.
- Navegador real: calendario de octubre muestra los videos con sus títulos y
  checks de edición; se abrió «4. VERSION 2 QUE HACE» con los dos enlaces y
  su visor Drive mostrando el MP4. No se editó ni aprobó ni publicó contenido.

## Producción final

`/api/version` = `0c3aff9`, rama `codex/publicaciones-completas-nov02`.
Se preserva `98278a6` (acceso a reportes de Lorena) y toda su base.
La prueba final pasó en candidato y producción: ocho registros visibles, cinco
editados, un archivado excluido; iguales datos antes/después. HTTP completo
862 ms para Pedro y 578 ms para Lorena en esa medición. Anónimo bloqueado.

Navegador producción: Listado contiene ocho registros; Mes/octubre conserva
los siete registros de octubre y permite abrir el video original. Capturas:
`output/publicaciones-studio-nov02/listado-publicado.png` y
`output/publicaciones-studio-nov02/calendario-publicado.png`.

Se retiraron el candidato detenido y túnel. Solo se cerraron sesiones propias
de QA. Sin cambios a archivos, aprobaciones, calendarios, permisos o estados.
