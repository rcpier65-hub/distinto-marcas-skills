# Presentación comercial de Desarrollo Web — diseño

Fecha: 21-oct-2026 · Pedido por: Pedro (dueño de Distinto) · Estado: listo para aprobación

## Por qué

Pedro tuvo una reunión de venta de una web y no tenía nada que presentar. Quiere un
módulo dentro de la app para conducir esas reuniones: escuchar al cliente, mostrar
cómo trabaja Distinto con ejemplos reales, resolver dudas y salir de la reunión con
una propuesta lista. Es una herramienta **para vender**, no un PPT: animada, a
pantalla completa, con el diseño de Distinto, y que **no parezca hecha con IA**.

Se empieza por **Desarrollo web**; después vendrán Social media y otros servicios
con la misma base.

## Cómo es una reunión (en palabras de Pedro, ordenado)

1. **Escuchar.** El cliente comparte su pantalla o cuenta qué web quiere hacer.
   Pedro va anotando, guiado por preguntas (objetivos, tipo de web, etc.).
2. **Nuestra forma de trabajar**, mostrada con un caso real (Retoz como ejemplo
   principal):
   brief → mapa mental (estructura) → baja fidelidad → media fidelidad → alta
   fidelidad, y cada fase con su **ronda de correcciones**. Se debe *ver* cómo
   luce cada etapa, no solo nombrarla.
   Además, un **selector de proyectos** del portafolio: eliges cualquiera y se ve
   ese sitio en baja, media y alta, para demostrar que se hace con todos.
3. **Preguntas y respuestas** (dudas comunes).
4. **"Tu página":** qué infraestructura/estructura tendría la web del cliente y un
   **checklist** de todo lo que podría tener o no.
5. **Propuesta** armada con los precios del catálogo, lista al cerrar.

## Objetivos

- Pantalla completa (Fullscreen API) proyectable por Meet/Zoom; navegación con
  flechas y botones, sin depender del mouse.
- Animaciones sobrias y con intención (transiciones entre etapas, cajas de baja
  fidelidad que "se convierten" en media y luego en alta).
- Identidad Distinto: morado `#ba41f7` / `#7b2cbf`, amarillo `#f2cc2c`, tinta
  `#0f0b16`, crema `#f6f1ea`; tipografías Fredoka (títulos) y Montserrat (texto),
  igual que distintostudio.com y la landing de la app.
- Al terminar: propuesta creada en el módulo existente de **Planes y Propuestas**
  (`/planes`, `POST /api/propuestas`), en estado borrador, con cliente, objetivo y
  servicios del catálogo `lib/planes/catalogo.ts` ya cargados. De ahí salen el PDF y
  el enlace para compartir que ya existen.
- Lo anotado en la reunión queda guardado y se puede retomar.

## No objetivos (por ahora)

- Social media, paid media y otros servicios (vienen después, misma base).
- Firmar o cobrar dentro de la presentación.
- Que el cliente opere la presentación desde su propio dispositivo.
- Ventana privada para el presentador: no hace falta (ver «Notas a la vista»).
- Editar los ejemplos (brief, mapas, wireframes) desde la interfaz; en esta
  versión los define el código/datos.

## Anti-objetivos (fracaso aunque "funcione")

- Que se vea genérico o "hecho con IA": gradientes al azar, íconos de relleno,
  textos huecos, ilustraciones stock, emojis decorativos.
- Mostrar un precio exacto como definitivo durante la reunión: el precio final se
  cierra en la propuesta que se envía después.
- Prometer plazos, resultados o precios distintos a los del catálogo y la web.
- Inventar datos de los clientes del portafolio (métricas, testimonios).

## Partes

### 1. Sesión de presentación
- Se crea desde el módulo (p. ej. `/presentaciones`) con: nombre del cliente,
  empresa, rubro, contacto (opcional) y servicio = Desarrollo web.
- Se guarda en una tabla nueva (p. ej. `presentacion_sesiones`: id, servicio,
  cliente jsonb, notas jsonb, checklist jsonb, propuesta_id, creado_por, fechas;
  RLS, solo servidor). Solo equipo con acceso (dirección/ventas).

### 2. Escuchar (descubrimiento) — notas a la vista
- **Decisión de Pedro:** una sola pantalla. Las notas **se ven**: hay un espacio para
  anotar dentro de la presentación y el cliente ve cómo nos ordenamos. No hay vista
  privada.
- Guía de preguntas en pantalla, agrupadas: negocio y objetivo, público, tipo de
  web (presentar empresa / vender online / captar para campaña), qué tiene hoy
  (web, dominio, hosting, redes, catálogo), contenidos (textos, fotos, logo),
  referencias que le gustan, funcionalidades (pagos, envíos, WhatsApp, reservas,
  blog, idiomas), plazos y presupuesto aproximado.
- Respuestas cortas; algunas son botones (tipo de web, sí/no) que **pre-marcan el
  checklist** del paso 4 y alimentan el nivel estimado.
- El espacio de notas queda disponible en todas las etapas (panel plegable).

### 3. Nuestra forma de trabajar (el corazón)
Línea de 6 etapas con su animación y una "ronda de correcciones" visible en cada
una (nota de revisión del cliente → versión ajustada):

1. **Brief**: documento de ejemplo con el diseño de Distinto (objetivos, público,
   tono, referencias, funcionalidades, alcance). Ejemplo: Retoz.
2. **Mapa mental / estructura**: árbol de páginas y navegación del sitio.
3. **Baja fidelidad**: cajas y líneas, solo distribución de secciones.
4. **Media fidelidad**: misma distribución con textos y jerarquía reales, escala
   de grises, imágenes como marcadores.
5. **Alta fidelidad**: diseño final (captura real del sitio publicado).
6. **Lanzamiento**: el sitio en vivo.

**Selector de proyectos**: los 14 webs del portafolio de distintostudio.com
(Novalamps/Novaelec, Typhouse, landing Little Joe, Distribuidora Fitness, Manrique
Abanza, JDH Outdoor, Oral Beauty, Kintu Oils, Vid Natur, LÜM, JK Grupo Textil,
Deyjim, Logística Los Olivos, Retoz). Para cada uno se define **una estructura de
secciones** (datos) y la vista la dibuja en baja y media; alta = captura real.
Así cada proyecto se ve en los tres niveles sin diseñarlos a mano.

Decisión de Pedro: los artefactos (brief, mapa, wireframes) **los genera Claude**,
profesionales y con el diseño de Distinto.

### 4. Preguntas y respuestas
Dudas comunes con respuestas fieles a lo publicado: cuánto cuesta (rangos de
distintostudio.com/servicios/desarrollo-web y catálogo), cuánto demora, quién
paga dominio/hosting (lo paga el cliente; se cotiza aparte), si podrá editarla,
si se ve en celular, si aparece en Google (SEO básico), qué materiales debe
entregar, qué pasa después de la entrega (mantenimiento), Shopify vs WordPress,
cuántas rondas de cambios. Se muestran una por una, en el orden que Pedro elija.

### 5. Tu página + checklist + nivel en vivo
- Propuesta de estructura para su web (mapa de páginas) a partir del tipo elegido
  y las respuestas.
- Checklist de lo que podría tener: páginas, catálogo/tienda, carrito, pagos,
  envíos, WhatsApp, formularios, blog, SEO, idiomas, analítica, volumen de
  productos e imágenes, plataforma/servidor (Shopify, WordPress, hosting),
  dominio, capacitación, mantenimiento. Cada ítem: incluido / opcional / no.
- **Niveles estandarizados (decisión de Pedro):**

  | Nivel | Inversión de referencia |
  |---|---|
  | Básico | S/ 1,800 |
  | Intermedio | S/ 3,000 – 3,500 |
  | Avanzado | S/ 5,000 – 8,000 |

- **Nivel en vivo:** a medida que se responde y se marca el checklist, un
  indicador muestra el nivel estimado (Básico / Intermedio / Avanzado), su rango
  de referencia y el plazo aproximado, y explica qué lo sube (p. ej. «carrito y
  pagos online → Intermedio», «más de 100 productos + integraciones → Avanzado»).
  Va «corriendo» hasta la propuesta final.

### 6. Propuesta
- Resumen final: tipo de web, nivel, lo incluido, opcionales, rango de
  referencia y plazo aproximado.
- Botón «Generar propuesta»: crea la propuesta **borrador** en `/planes` con el
  cliente, el objetivo, las notas y los servicios. Los precios se ajustan ahí y la
  propuesta se envía **después de la reunión** (decisión de Pedro).
- Los niveles se agregan al catálogo (`lib/planes/catalogo.ts`) como tres ítems
  de desarrollo web, para que la propuesta use una sola fuente de precios.

## Restricciones

- App Next.js 16 / React 19 existente; producción en el VPS (`publicar.sh`).
- Reutilizar Propuestas (no duplicar cálculo de IGV, PDF ni compartir).
- Las capturas de "alta" se toman de los sitios públicos y se guardan como
  archivos del proyecto (no se cargan sitios ajenos en vivo dentro de la
  presentación, salvo el botón "ver sitio" que abre una pestaña).
- Nada de credenciales de clientes (p. ej. Retoz) en ningún paso.

## Lo que queda a criterio de quien construye

- Rutas exactas, nombres de tabla/componentes y librería de animación (preferir
  CSS/Framer si ya existe en el proyecto).
- Estructura de datos de los wireframes y del brief de ejemplo.
- Texto final de preguntas y respuestas (fiel a lo publicado, revisable por Pedro).

## Decisiones tomadas por Claude (revisables por Pedro)

- **Quién presenta:** por ahora solo Pedro. Coincide con el módulo de Propuestas,
  que hoy solo permite a Pedro crear propuestas.
- **Ejemplos (brief, mapa, wireframes):** se generan a partir de lo público de cada
  sitio (secciones, textos visibles, capturas). No se inventan métricas, ventas ni
  testimonios. El brief de Retoz lleva una nota discreta «Ejemplo del proceso».
- **Reglas del nivel** (punto de partida, ajustables):
  - Básico: web de presentación o landing, hasta ~5 páginas, sin carrito; WhatsApp
    y formulario de contacto.
  - Intermedio: tienda con carrito y pagos online, catálogo hasta ~100 productos,
    o web de servicios con blog/reservas.
  - Avanzado: tienda grande (más de ~100 productos o muchas variantes e imágenes),
    integraciones (ERP, inventario, facturación, reservas complejas), varios
    idiomas o desarrollo a medida.
  - Plataforma/servidor (Shopify, WordPress con hosting) y volumen de imágenes
    se preguntan y pueden subir un nivel.
- **Plazos aproximados por nivel:** Básico 10–15 días hábiles, Intermedio 20–30,
  Avanzado 30–45 (alineados con los mínimos del catálogo). Se muestran como
  aproximados, nunca como fecha garantizada.
- **Funciones sin precio propio** (pagos, envíos, blog, SEO, analítica,
  capacitación): forman parte del nivel; si Pedro las marca como extra, salen en
  la propuesta como línea «a cotizar».
- **Precios en pantalla:** durante la reunión se ve el nivel con su rango de
  referencia; el monto final lo fija Pedro en la propuesta.
