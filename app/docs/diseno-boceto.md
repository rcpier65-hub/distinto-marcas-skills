# Bocetos de Diseño conectados a Planificación

En Diseño → Nueva tarea, «¿Este diseño tiene boceto?» inicia en No. Al elegir
Sí, se requiere una marca principal y el botón dice «Crear y abrir boceto».
Guarda la tarea y abre el lienzo Excalidraw existente; allí se pueden pegar
imágenes, dibujar y escribir. La tarjeta/tabla y el detalle tienen un pincel
con etiqueta Boceto al pasar el mouse o enfocar con teclado. Un entregable
publicable también puede acceder al boceto de su tarea madre.

El mismo lienzo aparece automáticamente en Planificación de la marca principal
como «Boceto · [nombre de tarea]». Tiene enlace de vuelta al diseño; no hay
copias ni tareas adicionales. Las etiquetas de marcas adicionales no comparten
el lienzo con otras marcas. Se conserva la selección Para presentar en reunión.

## Datos y permisos

Migración `20261022210000_diseno_boceto.sql`: publicaciones.tiene_boceto y
strategy_records.boceto_publicacion_id (FK, único y exclusivo de hojas). Un
trigger crea hoja y escena vacía dentro de la transacción de la tarea; los
reintentos conservan la clave de solicitud previa del módulo de Diseño.

Crear requiere equipo activo, acceso a Diseño y a la marca. Lecturas/escrituras
del lienzo usan las APIs y permisos existentes de Estrategia. Privado por defecto;
solo se hace visible al cliente si se comparte expresamente la hoja.

Renombrar la tarea actualiza el título del boceto; cambiar su marca mueve la
misma hoja, conserva sus imágenes y reinicia la visibilidad a privado. Retira
asociaciones de contexto de la marca anterior. Archivar/restaurar la tarea
archiva/restaura la hoja. Borrar la tarea borra su lienzo asociado y sus enlaces.
No se convierten automáticamente las tareas anteriores en bocetos.

## Verificación

- `npx next build --webpack` (local); build normal en VPS.
- `node scripts/test-diseno-boceto.mjs`: action real Sí/No, restricciones,
  concurrencia, Planificación, guardado/relectura de imágenes y trazos,
  aislamiento de clientes/marcas, título/traslado/archivo y eliminación.
  TEST_BASE_URL selecciona servidor; TEST_ACTION_ID permite usar el identificador
  del action del build publicado (server-reference-manifest, exportedName
  crearDisenoTask). Fixtures eliminadas al finalizar.
- `node scripts/test-diseno-reunion.mjs` y `node scripts/test-estrategia.mjs`:
  regresión de selección para reunión y fusión de lienzos.
