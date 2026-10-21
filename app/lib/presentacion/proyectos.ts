/* Proyectos reales para «Cómo trabajamos» (Pedro 21-oct-2026): cada uno se
   recorre de brief a lanzamiento. Plataforma, colores y tipografías se leyeron
   de cada web publicada; baja y media se dibujan desde su estructura real; alta
   y lanzamiento usan capturas reales (public/presentacion/proyectos). Las
   referencias son webs reales del rubro capturadas el 21-oct-2026
   (public/presentacion/referencias). El brief es un ejemplo reconstruido a
   partir de la web publicada: así se ve el documento que entregamos. */
import type { Nivel } from "./niveles";

export type NodoMapa = { nombre: string; cta?: string; hijos?: NodoMapa[] };

export type Seccion =
  | { tipo: "aviso"; nombre: string; texto: string }
  | { tipo: "menu"; nombre: string; logo: string; links: string[]; acciones?: string[]; oscuro?: boolean }
  | { tipo: "hero"; nombre: string; titulo: string; texto?: string; boton?: string; centro?: boolean; imagen?: "fondo" | "lado" }
  | { tipo: "split"; nombre: string; etiqueta?: string; titulo: string; texto: string; boton?: string }
  | { tipo: "tarjetas"; nombre: string; etiqueta?: string; titulo: string; items: string[] }
  | { tipo: "motivos"; nombre: string; titulo: string; items: { titulo: string; texto: string }[] }
  | { tipo: "logos"; nombre: string; titulo: string; cantidad: number }
  | { tipo: "testimonios"; nombre: string; titulo: string; cantidad: number }
  | { tipo: "faq"; nombre: string; titulo: string; items: string[] }
  | { tipo: "contacto"; nombre: string; titulo: string; campos: string[] }
  | { tipo: "mosaico"; nombre: string; titulo: string; texto?: string; items: { linea: string; nombre: string }[] }
  | { tipo: "productos"; nombre: string; titulo: string; items: { nombre: string; precio: string; antes?: string }[] }
  | { tipo: "categorias"; nombre: string; titulo: string; items: string[] }
  | { tipo: "pie"; nombre: string; columnas: string[] };

export type Brief = {
  negocio: string;
  objetivos: string[];
  publico: { perfil: string; busca: string; duda: string }[];
  diferenciales: string[];
  investigacion: { busquedas: string[]; hallazgos: string[] };
  referencias: { nombre: string; dominio: string; img: string; tomamos: string }[];
  identidad: { colores: { hex: string; uso: string }[]; tipografias: { nombre: string; uso: string }[]; tono: string; si: string[]; no: string[] };
  contenidos: { item: string; quien: "Cliente" | "Distinto" | "Juntos" }[];
  funciones: string[];
  exito: string[];
  aprobacion: string;
};

export type Proyecto = {
  id: string;
  nombre: string;
  tipo: string;
  nivel: Nivel;
  dominio: string;
  plataforma: string;
  brief: Brief;
  mapa: NodoMapa;
  recorrido: string[];
  secciones: Seccion[];
  decisiones: { baja: string[]; media: string[]; alta: string[] };
  capturas: { escritorio: string; celular: string };
};

const img = (id: string) => ({ escritorio: `/presentacion/proyectos/${id}-escritorio.webp`, celular: `/presentacion/proyectos/${id}-celular.webp` });
const ref = (id: string) => `/presentacion/referencias/${id}.webp`;

/* Lo que se revisa antes de publicar cualquier web. */
export const LANZAMIENTO: { grupo: string; items: string[] }[] = [
  { grupo: "Funciona", items: ["Formularios llegan al correo correcto", "Botón de WhatsApp con mensaje listo", "Enlaces y menús sin errores 404", "Pagos y envíos probados (si es tienda)"] },
  { grupo: "Se ve bien", items: ["Celular, tablet y escritorio", "Chrome, Safari y navegador de iPhone", "Imágenes livianas y nítidas"] },
  { grupo: "Lo encuentran", items: ["Títulos y descripciones para Google", "Search Console y mapa del sitio", "Dominio con candado (https)"] },
  { grupo: "Se mide", items: ["Google Analytics", "Píxel de Meta con eventos de contacto o compra", "Informe del primer mes"] },
];

export const PROYECTOS: Proyecto[] = [
  {
    id: "losolivos", nombre: "Logística Los Olivos", tipo: "Web corporativa", nivel: "basico", dominio: "logisticalosolivos.com", plataforma: "WordPress + Elementor",
    brief: {
      negocio: "Agencia de aduanas y logística peruana con más de 15 años de experiencia: despacho aduanero, asesoría legal y transporte de carga para importadores y exportadores.",
      objetivos: ["Generar pedidos de cotización calificados desde la web", "Transmitir solidez y cumplimiento aduanero desde el primer vistazo", "Dar a los clientes actuales un acceso directo al tracking"],
      publico: [
        { perfil: "Gerente de comercio exterior de una empresa importadora", busca: "Un agente confiable que no le retenga la carga", duda: "¿Tienen certificaciones y experiencia en mi tipo de mercancía?" },
        { perfil: "Emprendedor que importa por primera vez", busca: "Que le expliquen el proceso y los costos", duda: "¿Cuánto cuesta y qué documentos necesito?" },
      ],
      diferenciales: ["Más de 15 años en agenciamiento", "Certificaciones de calidad", "Atención personalizada en cada etapa", "Despacho, asesoría y transporte en un solo lugar"],
      investigacion: {
        busquedas: ["agencia de aduanas lima", "despacho aduanero callao", "agente de aduanas para importar", "cotizar importación perú"],
        hallazgos: ["Las webs del rubro hablan de la empresa y no del cliente: hay que abrir con lo que resolvemos", "La confianza se gana con certificados, logos de clientes y años de experiencia visibles", "El tracking y la cotización deben estar a un clic desde la portada"],
      },
      referencias: [
        { nombre: "DHL", dominio: "dhl.com", img: ref("dhl"), tomamos: "Rastreo y cotización como protagonistas de la portada." },
        { nombre: "Maersk", dominio: "maersk.com", img: ref("maersk"), tomamos: "Fotografía real de operación y servicios explicados en pocas palabras." },
        { nombre: "Flexport", dominio: "flexport.com", img: ref("flexport"), tomamos: "Mensaje principal claro y una sola acción por sección." },
      ],
      identidad: {
        colores: [{ hex: "#5AAE30", uso: "Verde de marca, botones" }, { hex: "#222222", uso: "Titulares" }, { hex: "#F5F5F5", uso: "Fondos de sección" }, { hex: "#FFFFFF", uso: "Base" }],
        tipografias: [{ nombre: "Montserrat", uso: "Titulares" }, { nombre: "Inter", uso: "Textos" }],
        tono: "Serio, cercano y seguro.",
        si: ["seguridad", "experiencia", "acompañamiento", "cumplimiento"],
        no: ["jerga legal sin explicar", "promesas de plazos imposibles"],
      },
      contenidos: [
        { item: "Logo y manual de marca", quien: "Cliente" }, { item: "Fotos del equipo y la operación", quien: "Cliente" },
        { item: "Certificados y logos de clientes", quien: "Cliente" }, { item: "Textos de servicios y preguntas frecuentes", quien: "Distinto" },
        { item: "Fotos de apoyo (puerto, contenedores)", quien: "Distinto" }, { item: "Tarifario", quien: "Juntos" },
      ],
      funciones: ["Formulario de cotización", "WhatsApp con chat de bienvenida", "Acceso a Tracking", "Tarifario", "Preguntas frecuentes"],
      exito: ["Cotizaciones recibidas por mes", "Clics a WhatsApp", "Visitas desde Google a «agencia de aduanas»"],
      aprobacion: "Gerencia general aprueba cada fase; operaciones valida los textos técnicos.",
    },
    mapa: { nombre: "Inicio", cta: "Cotizar", hijos: [
      { nombre: "Nosotros", cta: "Conocer al equipo" },
      { nombre: "Servicios", cta: "Pedir cotización", hijos: [{ nombre: "Despacho aduanero" }, { nombre: "Comercio exterior" }] },
      { nombre: "Tarifario", cta: "Ver tarifas" },
      { nombre: "Contacto", cta: "Enviar formulario", hijos: [{ nombre: "Tracking" }] },
    ] },
    recorrido: ["Google", "Inicio", "Servicios", "Formulario o WhatsApp", "Cotización"],
    secciones: [
      { tipo: "menu", nombre: "Menú", logo: "Los Olivos", links: ["Inicio", "Nosotros", "Servicios", "Tarifario", "Contacto"], acciones: ["Tracking"] },
      { tipo: "hero", nombre: "Portada", titulo: "Agencia de aduanas y logística en Perú", texto: "Despacho aduanero, asesoría legal y transporte de carga con total seguridad.", boton: "Contáctenos", centro: true },
      { tipo: "split", nombre: "Nosotros", etiqueta: "Nosotros", titulo: "Conoce más sobre nosotros", texto: "Somos un grupo peruano con más de 15 años de experiencia en agenciamiento de aduanas y logística en comercio exterior.", boton: "Contáctenos" },
      { tipo: "tarjetas", nombre: "Servicios", etiqueta: "Explora", titulo: "Nuestros servicios", items: ["Despacho aduanero", "Asesoría en comercio exterior"] },
      { tipo: "motivos", nombre: "Por qué elegirnos", titulo: "¿Por qué las empresas nos eligen para su logística y envío?", items: [
        { titulo: "Nuestros certificados", texto: "Estándares de calidad en cada operación." },
        { titulo: "Atención personalizada", texto: "Te acompañamos en cada etapa del proceso." },
        { titulo: "Experiencia más de 20 años", texto: "Rutas y tiempos optimizados." },
      ] },
      { tipo: "logos", nombre: "Clientes", titulo: "Empresas que confían su logística en nosotros", cantidad: 6 },
      { tipo: "testimonios", nombre: "Testimonios", titulo: "Lo que nuestros clientes dicen", cantidad: 3 },
      { tipo: "faq", nombre: "Preguntas frecuentes", titulo: "Preguntas frecuentes", items: ["¿Qué documentos necesito para importar?", "¿Cuánto demora un despacho?", "¿Trabajan en todo el Perú?"] },
      { tipo: "contacto", nombre: "Contacto", titulo: "Contáctanos y optimiza tu logística hoy", campos: ["Nombre", "Empresa", "Correo", "Mensaje"] },
      { tipo: "pie", nombre: "Pie", columnas: ["Logística Los Olivos S.A.", "Servicios", "Contacto"] },
    ],
    decisiones: {
      baja: ["Portada centrada con una sola acción: cotizar", "Confianza (certificados, clientes, testimonios) antes del formulario", "Tracking siempre visible en el menú"],
      media: ["Titular con lo que hacemos y dónde: «aduanas y logística en Perú»", "Servicios explicados en una línea cada uno", "Preguntas frecuentes con las dudas reales de ventas"],
      alta: ["Verde de marca solo en acciones", "Fotos reales del equipo y la operación", "Retícula de puntos que recuerda una red logística"],
    },
    capturas: img("losolivos"),
  },
  {
    id: "novaelec", nombre: "Novaelec · Novalamps", tipo: "Catálogo de colecciones", nivel: "intermedio", dominio: "novaelec.com.pe", plataforma: "WordPress + Divi",
    brief: {
      negocio: "Empresa peruana de productos eléctricos que diseña interruptores y tomacorrientes de diseño para proyectos residenciales, comerciales e industriales. Showroom en Surco.",
      objetivos: ["Posicionar las colecciones como piezas de diseño, no como ferretería", "Llevar arquitectos e interioristas al showroom", "Facilitar catálogos técnicos a distribuidores y proyectos"],
      publico: [
        { perfil: "Arquitecto o diseñador de interiores", busca: "Acabados que combinen con su proyecto", duda: "¿Tienen la línea y el acabado que necesito en stock?" },
        { perfil: "Constructora o distribuidor", busca: "Catálogo técnico y precios por volumen", duda: "¿Pueden atender un proyecto grande o exportar?" },
      ],
      diferenciales: ["Líneas con identidad propia: Max, Onix, Amber", "Acabados premium: madera, aluminio, metálico", "Showroom para ver y tocar", "Comercio exterior"],
      investigacion: {
        busquedas: ["interruptores de diseño lima", "tomacorrientes modernos", "placas eléctricas madera", "interruptores negros minimalistas"],
        hallazgos: ["Las marcas líderes venden ambientes, no productos sueltos: la foto manda", "El arquitecto quiere ver la línea completa y descargar el catálogo sin llamar", "La visita al showroom es el paso que más cierra ventas"],
      },
      referencias: [
        { nombre: "Vimar", dominio: "vimar.com", img: ref("vimar"), tomamos: "Fotografía de ambientes a pantalla completa." },
        { nombre: "BTicino", dominio: "bticino.com", img: ref("bticino"), tomamos: "Cada línea de producto presentada como protagonista." },
      ],
      identidad: {
        colores: [{ hex: "#141414", uso: "Fondo principal" }, { hex: "#E5AC00", uso: "Dorado de marca" }, { hex: "#3A3A3A", uso: "Paneles" }, { hex: "#FFFFFF", uso: "Textos" }],
        tipografias: [{ nombre: "Raleway", uso: "Titulares y textos" }],
        tono: "Premium y sobrio: «La arquitectura evoluciona. Los detalles también.»",
        si: ["diseño", "acabado", "arquitectura", "detalle"],
        no: ["precios en la portada", "lenguaje de ferretería"],
      },
      contenidos: [
        { item: "Fotos de ambientes por colección", quien: "Juntos" }, { item: "Video de portada", quien: "Distinto" },
        { item: "Catálogos PDF por línea", quien: "Cliente" }, { item: "Fichas técnicas y acabados", quien: "Cliente" },
        { item: "Textos de cada colección", quien: "Distinto" }, { item: "Datos de showroom y almacén", quien: "Cliente" },
      ],
      funciones: ["Catálogo de colecciones", "Catálogos PDF descargables", "Agenda tu visita al showroom", "Comercio exterior", "WhatsApp"],
      exito: ["Visitas al showroom agendadas", "Descargas de catálogos", "Consultas de proyectos y distribuidores"],
      aprobacion: "Gerencia comercial aprueba; el área técnica valida acabados y nombres.",
    },
    mapa: { nombre: "Inicio", cta: "Explorar colecciones", hijos: [
      { nombre: "Empresa" },
      { nombre: "Productos", cta: "Ver colección", hijos: [{ nombre: "Max" }, { nombre: "Onix" }, { nombre: "Onix Vintage" }, { nombre: "Amber" }] },
      { nombre: "Catálogos", cta: "Descargar PDF" },
      { nombre: "Agenda tu visita", cta: "Reservar" },
      { nombre: "Comercio exterior", cta: "Consultar" },
      { nombre: "Contacto" },
    ] },
    recorrido: ["Instagram o Google", "Portada con video", "Colección", "Catálogo PDF", "Visita al showroom"],
    secciones: [
      { tipo: "menu", nombre: "Menú", logo: "Novalamps", links: ["Inicio", "Empresa", "Productos", "Catálogos", "Agenda tu visita", "Comercio exterior", "Contacto"], oscuro: true },
      { tipo: "hero", nombre: "Portada con video", titulo: "La arquitectura evoluciona. Los detalles también.", imagen: "fondo" },
      { tipo: "mosaico", nombre: "Colecciones", titulo: "Explora nuestras colecciones", texto: "Cada línea tiene una identidad única: materiales, acabados y detalles para cada estilo arquitectónico.", items: [
        { linea: "Amber", nombre: "Carbón" }, { linea: "Max", nombre: "Aluminio" }, { linea: "Max", nombre: "Classic" },
        { linea: "Max", nombre: "Madera" }, { linea: "Máxima Line", nombre: "Blanco" }, { linea: "Máxima Soft", nombre: "Negro" },
        { linea: "Onix", nombre: "Frame" }, { linea: "Onix", nombre: "Metálico" }, { linea: "Onix", nombre: "Vintage" },
      ] },
      { tipo: "split", nombre: "Línea destacada", etiqueta: "Urbana", titulo: "Diseño clásico", texto: "Una línea contemporánea pensada para proyectos masivos.", boton: "Ver colección" },
      { tipo: "pie", nombre: "Pie", columnas: ["Novaelec S.A.C.", "Showroom Surco · Almacén Lurín", "Empresa · Productos · Catálogos"] },
    ],
    decisiones: {
      baja: ["Portada a pantalla completa con video, sin botones", "Colecciones en mosaico de alturas distintas, como revista", "Menú con Catálogos y Agenda tu visita a la vista"],
      media: ["Una frase de marca en lugar de un titular de venta", "Cada tarjeta dice línea y acabado (Max · Madera)", "Textos de colección cortos, sobre el espacio y no sobre el producto"],
      alta: ["Fondo negro para que brillen los acabados", "Dorado solo como acento", "Fotografía de ambientes con luz cálida"],
    },
    capturas: img("novaelec"),
  },
  {
    id: "typhouse", nombre: "Typhouse", tipo: "Tienda online", nivel: "avanzado", dominio: "typhouse.pe", plataforma: "Shopify",
    brief: {
      negocio: "Casa de marcas para el auto y el regalo: ambientadores Little Joe y Dr. Marcus importados de Italia, tecnología, car audio, car care y decoración Mil Ideas. Venta a público, empresas y distribuidores.",
      objetivos: ["Vender en línea todo el catálogo de la casa", "Subir el ticket promedio con packs y envío gratis desde un monto", "Abrir canales para empresas y distribuidores"],
      publico: [
        { perfil: "Conductor en Lima que cuida su auto", busca: "Un aroma que dure y accesorios confiables", duda: "¿Cuánto dura el aroma y cuánto cuesta el envío?" },
        { perfil: "Quien busca un regalo", busca: "Algo original, listo para regalar", duda: "¿Llega a tiempo y viene presentable?" },
        { perfil: "Empresa o distribuidor", busca: "Precios por volumen y regalos corporativos", duda: "¿Cómo compro al por mayor?" },
      ],
      diferenciales: ["Ambientadores importados de Italia con diseño propio", "Ediciones de clubes: Universitario, Alianza Lima, Sporting Cristal", "Varias marcas en una sola tienda", "Packs listos y envío gratis desde S/ 88 en Lima zona 1"],
      investigacion: {
        busquedas: ["ambientador para auto", "little joe perú", "regalos para hombres lima", "parlantes para auto"],
        hallazgos: ["La compra de aromas es por impulso: el precio y la oferta deben verse sin entrar al producto", "Los packs y la barra de envío gratis suben el ticket", "Las ediciones de clubes atraen a un público que no busca ambientadores"],
      },
      referencias: [
        { nombre: "Chemical Guys", dominio: "chemicalguys.com", img: ref("chemicalguys"), tomamos: "Barra de envío gratis, kits y menú por categoría de auto." },
        { nombre: "Yankee Candle", dominio: "yankeecandle.com", img: ref("yankeecandle"), tomamos: "Aromas por familia y promociones grandes en portada." },
      ],
      identidad: {
        colores: [{ hex: "#1E6BC1", uso: "Azul de marca" }, { hex: "#2BA8E0", uso: "Botones y precios" }, { hex: "#F26522", uso: "Descuentos" }, { hex: "#1A1A1A", uso: "Textos" }, { hex: "#F2F9FE", uso: "Fondos" }],
        tipografias: [{ nombre: "Montserrat", uso: "Titulares" }, { nombre: "Poppins", uso: "Textos y botones" }],
        tono: "Alegre y cercano: «Pon una sonrisa en el aire».",
        si: ["sonrisa", "aroma", "regalo", "pasión"],
        no: ["textos largos en fichas", "tecnicismos sin traducir"],
      },
      contenidos: [
        { item: "Catálogo con precios, variantes y stock", quien: "Cliente" }, { item: "Fotos de producto en fondo blanco", quien: "Juntos" },
        { item: "Banners de campaña y packs", quien: "Distinto" }, { item: "Descripciones de producto", quien: "Distinto" },
        { item: "Políticas de envío y cambios", quien: "Cliente" }, { item: "Cuentas de pago y envío", quien: "Cliente" },
      ],
      funciones: ["Carrito y pagos", "Envío gratis desde un monto", "Buscador y filtros", "Packs y promociones", "Cuentas de cliente", "Zona corporativa y de distribuidores", "Libro de reclamaciones"],
      exito: ["Ventas y ticket promedio", "Tasa de conversión", "Carritos recuperados", "Pedidos de empresas"],
      aprobacion: "Dirección comercial aprueba; logística valida envíos y stock.",
    },
    mapa: { nombre: "Inicio", cta: "Comprar", hijos: [
      { nombre: "Tienda", hijos: [{ nombre: "Aromas" }, { nombre: "TyP Tech" }, { nombre: "Car Audio" }, { nombre: "Car Care" }, { nombre: "Mil Ideas" }] },
      { nombre: "Regalos", hijos: [{ nombre: "Para ella" }, { nombre: "Para él" }, { nombre: "Pet lovers" }] },
      { nombre: "Promociones", cta: "Armar pack", hijos: [{ nombre: "Escoge tu pack" }] },
      { nombre: "Marcas", hijos: [{ nombre: "Little Joe" }, { nombre: "Dr. Marcus" }] },
      { nombre: "Mi cuenta", cta: "Pagar", hijos: [{ nombre: "Carrito" }, { nombre: "Pago" }] },
      { nombre: "Empresas", cta: "Cotizar", hijos: [{ nombre: "Corporativa" }, { nombre: "Distribuidor" }] },
    ] },
    recorrido: ["Anuncio o Google", "Inicio o categoría", "Producto", "Carrito con envío gratis", "Pago"],
    secciones: [
      { tipo: "aviso", nombre: "Barra de envío", texto: "¡Añade S/88.00 para obtener envío gratis (solo Lima zona 1)!" },
      { tipo: "menu", nombre: "Menú y buscador", logo: "typhouse", links: ["Tienda", "Promociones", "Regalos", "Aromas", "TyP Tech", "Car Audio", "Car Care", "Mil Ideas", "Marcas"], acciones: ["Buscar", "Cuenta", "Carrito"] },
      { tipo: "hero", nombre: "Portada", titulo: "Pon una sonrisa en el aire", texto: "Ambientadores importados de Italia. Diseño que enamora, fragancia que perdura.", boton: "Descubrir Little Joe", imagen: "lado" },
      { tipo: "categorias", nombre: "Marcas de la casa", titulo: "La casa de las mejores marcas", items: ["Little Joe", "Dr. Marcus", "TyP Tech", "Regalos", "Car Audio", "Mil Ideas"] },
      { tipo: "split", nombre: "Promociones", etiqueta: "Promociones", titulo: "Packs y ofertas especiales", texto: "Combos multimarca y packs listos. Elige tu promo sin dar vueltas.", boton: "Ver promociones" },
      { tipo: "productos", nombre: "Más vendidos", titulo: "Productos más vendidos", items: [
        { nombre: "Little Joe® Standard - Apple", precio: "S/ 24.90", antes: "S/ 29.90" },
        { nombre: "Dr. Marcus - Cosmic Cat", precio: "S/ 24.90", antes: "S/ 27.90" },
        { nombre: "Medios Rangos WDX 8\"", precio: "S/ 499.00", antes: "S/ 624.00" },
        { nombre: "Armor All Protector 295 ml", precio: "S/ 26.00", antes: "S/ 32.90" },
      ] },
      { tipo: "categorias", nombre: "Categorías", titulo: "Explora por categoría", items: ["Aromas", "TyP Tech", "Promociones", "Car Audio", "Car Care"] },
      { tipo: "tarjetas", nombre: "Ediciones de clubes", titulo: "Lleva tu pasión a bordo", items: ["Universitario", "Alianza Lima", "Sporting Cristal"] },
      { tipo: "tarjetas", nombre: "Empresas", titulo: "Compra por marca y para tu empresa", items: ["Zona corporativa", "Zona distribuidor"] },
      { tipo: "pie", nombre: "Pie", columnas: ["Typhouse", "Categorías populares", "Aromas favoritos", "Ayuda"] },
    ],
    decisiones: {
      baja: ["Barra de envío gratis arriba de todo", "Buscador y carrito siempre visibles", "Marcas, packs y más vendidos antes de las categorías"],
      media: ["Precio con descuento visible en cada tarjeta", "Un botón igual en todos los productos: «Ver producto»", "Nombres de categoría que usa el cliente, no los internos"],
      alta: ["Azul de marca con cielo: frescura y aire", "Naranja solo para descuentos", "Fotos del producto con el personaje Little Joe"],
    },
    capturas: img("typhouse"),
  },
];
