# Versiones y revisión de entregas

Accesos: Diseño/Editor → icono «Presentar y revisar»; detalle de Publicaciones;
boceto en Planificación → Presentar y revisar; lista «Para presentar» de reunión.
Marca → Revisiones abre la métrica filtrada por marca; Diseño, Editor y Rendimiento
incluyen un acceso a «Rebotes y versiones».

## Entregas

La migración `20261022230000_creative_review.sql` registra los enlaces actuales
como V1 **inicial**, con fecha/autor originales desconocidos. No reconstruye
historial ni modifica publicaciones existentes. Un trigger transaccional captura
cualquier escritura posterior en los campos de resultado, portada, video con/sin
música o láminas. Así cubre también los formularios y sincronizadores anteriores.

Cada pieza/formato tiene su numeración. Las dos variantes de video empiezan en V1;
cada lámina empieza en V1. Los campos espejo de un carrusel no duplican entregas.
La identidad del archivo Drive no cambia por usar /view frente a ?id=. Guardar el
mismo archivo, quitarlo y volver a ponerlo sin otra entrega, no suma. Volver a un
archivo más antiguo sí registra una nueva entrega. Actualizar el contenido del
mismo enlace requiere «Registrar nueva versión del mismo enlace» en Historial.
El bloqueo de la publicación y la clave única evitan duplicados concurrentes.

**Se conserva el enlace, no una copia congelada del archivo remoto.** Para poder
comparar contenido anterior se deben conservar archivos/enlaces independientes.
Si se borra, cambia o vence un archivo remoto, el sistema conserva el registro y
sus observaciones, pero no puede reconstruir sus bytes. No promete recuperar
archivos eliminados ni detectar cambios dentro del mismo URL automáticamente.

## Revisión y presentación

`/revision/[publicacionId]` agrupa también los entregables hijos de una tarea.
Previsualiza imágenes raster, PDF multipágina y video reproducible por navegador.
Las observaciones se anclan por coordenadas normalizadas, página y segundo de
video. Pueden ser generales o marcar una zona. Admiten hasta tres imágenes
PNG/JPG/WebP; el navegador reduce resolución/tamaño, el servidor valida formato
real y máximo 1 MB por referencia. Se entregan por una ruta privada autorizada,
no se incluye el base64 de todas las referencias en el payload del historial.

Cada observación conserva autor, solicitante, fecha y versión original. Estados:
Pendiente, En proceso, Aplicado, Validado. Un pendiente de V1 puede marcarse aplicado
en V2; el servidor comprueba que sea la misma pieza/formato y una versión posterior.
La primera observación inicia una ronda; «Finalizar revisión» cierra esa ronda sin
aprobar el trabajo ni resolver automáticamente sus observaciones. Una nueva nota
posterior abre otra ronda. Las rondas son independientes de los cambios de enlace.

«Presentar» amplía la revisión sobre toda la app; Escape vuelve. Refresco cada 20 s
y al recuperar foco, sin sobrescribir un guardado ni descartar el texto en edición.
El boceto original sigue independiente y enlazado: no se sobrescribe el lienzo.

## Métrica

`/revision` y `/api/creative-review/stats?mes=YYYY-MM&area=todos|diseno|video&marca=slug`
usan el mes de America/Lima. Fórmula:

**trabajos con una reentrega en el mes / trabajos con entregas en el mes × 100.**

Un trabajo se identifica por publicación + área. Las variantes/láminas no
multiplican el denominador; las actualizaciones individuales sí se muestran
aparte. Los archivos iniciales migrados se excluyen del mes. La métrica indica
reentregas: un enlace nuevo no prueba por sí mismo rechazo del cliente ni un error
del diseñador. Dirección puede excluir una versión por enlace equivocado, con
motivo y registro de auditoría; no borra su historial. No se cambia aprobación,
estado de la tarea, fechas, notificaciones ni publicaciones automáticamente.

## Acceso y fuentes

Solo equipo activo con acceso a Diseño, Editor o Publicaciones y la marca
correspondiente. Clientes y anónimos no acceden; pueden participar durante una
reunión con pantalla compartida. No amplía el portal de clientes. Tablas RLS y
sin acceso directo anon/authenticated; escrituras por servidor y Origin válido.

El proxy de medios parte de una versión autorizada, nunca de un URL arbitrario
en la petición. Valida HTTPS y DNS público en cada redirección, fija la dirección
resuelta, no reenvía credenciales a destinos externos y rechaza HTML/SVG. Para
Drive privado, usa la conexión existente solo tras verificar que el archivo está
dentro de la carpeta de Drive de esa marca. Conserva soporte de rangos de video.
No todos los proveedores permiten una vista previa: enlaces a carpetas/páginas,
archivos inaccesibles y codecs no admitidos muestran un error y «Abrir original».

## Verificación

Desde app/: `TEST_BASE_URL=http://localhost:3122 node scripts/test-creative-review.mjs`.
Crea/elimina su propia marca, tareas, cuentas y sesiones. Cubre V1/V2, concurrencia,
canonicalización Drive, variantes, carruseles, espejos, rondas, anotaciones,
referencias privadas, aplicar en otra versión, corrección de conteo, métricas,
RLS, separación de marcas/clientes y bloqueo de direcciones privadas.

`node scripts/test-diseno-boceto.mjs` comprueba la regresión del boceto y su hoja.
`node scripts/qa-creative-fixture.mjs` genera una cuenta y marca temporal, PNG/PDF
en bucket privado y enlace al video CC0 de ejemplos MDN para verificación visual.
Credenciales temporales solo en /tmp/distinto-creative-fixture.json (600).
Finalizar siempre con `node scripts/qa-creative-fixture.mjs --cleanup`.

## Visor ampliado y galería (22-oct-2026)

- **Pantalla completa**, también accesible desde la barra del visor, amplía el
  espacio. Usa Fullscreen API cuando el navegador la admite y una presentación
  dentro de la ventana como alternativa. Escape o el botón permiten volver.
- La imagen/PDF empieza en **Comentar**: un clic ubica el punto y abre el campo
  de texto enfocado. **Zona** dibuja un rectángulo; el arrastre no roba el foco.
  Video inicia en Explorar para conservar sus controles; Comentar pausa el video
  y guarda el segundo exacto. Observación general conserva su ubicación de página
  y segundo desde el pie del visor. El comentario general del panel es del archivo.
- **Archivos (N)** muestra una galería de piezas, láminas y variantes ya registradas
  en la tarea y sus entregables. Las flechas anterior/siguiente recorren archivos;
  V1/V2 recorre versiones del archivo activo. PDF conserva su paginación separada.
  Las miniaturas se solicitan al entrar en la zona visible con el mismo acceso
  autorizado del visor; PDF/video tienen iconos. No se descargan carpetas completas.
- Nueva entrega sigue usando los enlaces individuales y formatos de la tarea.
  Otra lámina/entregable comienza en V1; reemplazar el mismo archivo mantiene su
  historial. No se modifica la métrica ni se crea una versión por navegar.
- Se pueden ocultar galería y comentarios. El formulario solo ocupa espacio
  al anotar. Chat y Mis pendientes no se superponen a esta ruta; la sesión de
  Oficina permanece. Un comentario sin guardar bloquea cambiar archivo/versión
  y la navegación de páginas PDF para no guardarlo en otro lugar por accidente.

### Boceto libre desde una entrega (22 octubre, ampliación)

En una tarea de Diseño con boceto, abrir una imagen en Revisión incorpora una copia
optimizada al mismo lienzo de Planificación. `Trabajar en boceto` abre el área de esa
versión; si la tarea aún no tenía boceto, lo crea privado al pulsar ese botón.
Abrir el boceto directamente también incorpora las últimas imágenes de cada pieza.
Para PDF se incorpora la página visualizada; para video, `Fotograma al boceto` toma
el cuadro donde está pausado. No se importan automáticamente todas las páginas ni
el historial completo: una versión anterior se incorpora cuando se revisa.

Cada área conserva el nombre de la pieza, versión, página o segundo y una base
bloqueada para dibujar encima sin moverla por accidente (se puede desbloquear con
las herramientas del lienzo). Hay un selector para enfocar cada área, señalar una
zona, dibujar, poner flechas, pegar capturas o subir referencias. `Capturar pantalla`
solicita elegir una pantalla/ventana en el navegador, toma una sola imagen y cierra
la captura; no solicita audio. Si el navegador no lo permite, se puede pegar con
Ctrl/Cmd+V o subir la captura. Las referencias se pueden mover y redimensionar.

La copia corresponde al archivo disponible al incorporarlo. No garantiza recuperar
los bytes de un enlace antiguo si el proveedor reemplazó su contenido. Se conserva
como imagen en el lienzo y no cambia al reabrir ni cuenta como nueva entrega/rebote.
Los comentarios formales y sus estados permanecen en Revisión; las marcas libres
son anotaciones del boceto. No se cambian permisos de publicación o acceso cliente.

`POST /api/creative-review/[id]/boceto` comprueba equipo, Diseño, Marcas, marca y
parentesco de la versión. Reutiliza el registro canónico `boceto_publicacion_id`;
no agrega tablas. Bloquea tarea/lienzo y añade elementos por ID determinista para
evitar duplicados incluso con dos pestañas. Respeta los elementos borrados y los
bocetos archivados. Mantiene una instantánea anterior, el límite de 15 MB y la
reconciliación de cambios concurrentes. La descarga usa el proxy autorizado existente;
las capturas se validan/decodifican y optimizan a WebP (máximo 1800 px).

## Comentarios sobre el boceto

El boceto de Diseño muestra las observaciones de revisión en un panel visible y
como marcas numeradas con texto sobre la imagen. «Comentar zona» permite arrastrar
sobre la imagen de una versión (en cualquier dirección) y escribir el cambio al
soltar; un clic crea un punto. Se reutilizan `creative_review_notes` y la API de
Revisión: no hay otra copia ni otra métrica. Los comentarios conservan su versión,
página PDF o fotograma, autor y solicitante; los generales aparecen en el panel.
El selector filtra por área de versión y bloquea el cambio si hay un borrador.

Los comentarios se actualizan al recuperar foco/conexión y cada diez segundos con
la pestaña visible. Si falla el guardado, el texto sigue en el formulario y se
reutiliza su ID al reintentar. Cerrar con un borrador muestra la advertencia del
navegador. Ocultar comentarios permite trabajar sobre las referencias; dibujar
flechas o figuras en el lienzo sigue disponible y no crea comentarios por sí solo.
El estado de lectura del lienzo se separa del de guardado: un fallo transitorio ya
no deja «Sin conexión» pegado después de una lectura correcta.

Prueba de coordenadas: `node scripts/test-sketch-comments.mjs`. Verifica arrastre
inverso, límites, zoom/desplazamiento, rotación, volteo y aislamiento de páginas,
versiones y fotogramas. Las pruebas de API siguen en `test-creative-review.mjs`.
