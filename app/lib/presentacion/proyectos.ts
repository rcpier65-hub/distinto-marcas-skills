/* Proyectos reales para «Cómo trabajamos» (Pedro 21-oct-2026): cada uno se
   recorre de brief a lanzamiento. Baja y media se dibujan desde la estructura
   real de la página publicada; alta y lanzamiento usan capturas reales
   (public/presentacion/proyectos, tomadas el 21-oct-2026). */
import type { Nivel } from "./niveles";

export type NodoMapa = { nombre: string; hijos?: NodoMapa[] };

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

export type Proyecto = {
  id: string;
  nombre: string;
  tipo: string;
  nivel: Nivel;
  dominio: string;
  oscuro?: boolean;
  brief: { campo: string; valor: string }[];
  mapa: NodoMapa;
  secciones: Seccion[];
  capturas: { escritorio: string; celular: string };
};

const img = (id: string) => ({ escritorio: `/presentacion/proyectos/${id}-escritorio.webp`, celular: `/presentacion/proyectos/${id}-celular.webp` });

export const PROYECTOS: Proyecto[] = [
  {
    id: "losolivos", nombre: "Logística Los Olivos", tipo: "Web corporativa", nivel: "basico", dominio: "logisticalosolivos.com",
    brief: [
      { campo: "Objetivo", valor: "Que las empresas importadoras y exportadoras confíen y pidan una cotización." },
      { campo: "Público", valor: "Gerentes de logística y comercio exterior de empresas en Perú." },
      { campo: "Tono", valor: "Serio, cercano y seguro: más de 15 años en agenciamiento de aduanas." },
      { campo: "Funciones", valor: "Formulario de contacto, WhatsApp, tarifario y acceso a tracking." },
      { campo: "Alcance", valor: "Web de una página principal con secciones y páginas de servicios." },
    ],
    mapa: { nombre: "Inicio", hijos: [
      { nombre: "Nosotros" },
      { nombre: "Servicios", hijos: [{ nombre: "Despacho aduanero" }, { nombre: "Comercio exterior" }] },
      { nombre: "Tarifario" },
      { nombre: "Contacto", hijos: [{ nombre: "Tracking" }] },
    ] },
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
    capturas: img("losolivos"),
  },
  {
    id: "novaelec", nombre: "Novaelec · Novalamps", tipo: "Catálogo de colecciones", nivel: "intermedio", dominio: "novaelec.com.pe", oscuro: true,
    brief: [
      { campo: "Objetivo", valor: "Mostrar las colecciones como piezas de diseño y llevar a arquitectos al showroom." },
      { campo: "Público", valor: "Arquitectos, diseñadores de interiores y proyectos residenciales y comerciales." },
      { campo: "Tono", valor: "Premium y sobrio: «La arquitectura evoluciona. Los detalles también.»" },
      { campo: "Funciones", valor: "Catálogos descargables, agenda de visitas al showroom, comercio exterior y WhatsApp." },
      { campo: "Alcance", valor: "Portada con video, 4 líneas de producto con sus acabados y páginas de empresa." },
    ],
    mapa: { nombre: "Inicio", hijos: [
      { nombre: "Empresa" },
      { nombre: "Productos", hijos: [{ nombre: "Max" }, { nombre: "Onix" }, { nombre: "Onix Vintage" }, { nombre: "Amber" }] },
      { nombre: "Catálogos" },
      { nombre: "Agenda tu visita" },
      { nombre: "Comercio exterior" },
      { nombre: "Contacto" },
    ] },
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
    capturas: img("novaelec"),
  },
  {
    id: "typhouse", nombre: "Typhouse", tipo: "Tienda online (Shopify)", nivel: "avanzado", dominio: "typhouse.pe",
    brief: [
      { campo: "Objetivo", valor: "Vender en línea todas las marcas de la casa y subir el ticket con packs." },
      { campo: "Público", valor: "Conductores en Lima que cuidan su auto, quienes buscan regalos y empresas distribuidoras." },
      { campo: "Tono", valor: "Alegre y cercano: «Pon una sonrisa en el aire»." },
      { campo: "Funciones", valor: "Carrito, pagos, envío gratis por monto, buscador, cuentas, packs, zona corporativa y de distribuidores." },
      { campo: "Alcance", valor: "Más de 100 productos con variantes, 6 marcas, regalos por ocasión y ediciones de clubes." },
    ],
    mapa: { nombre: "Inicio", hijos: [
      { nombre: "Tienda", hijos: [{ nombre: "Aromas" }, { nombre: "TyP Tech" }, { nombre: "Car Audio" }, { nombre: "Car Care" }, { nombre: "Mil Ideas" }] },
      { nombre: "Regalos", hijos: [{ nombre: "Para ella" }, { nombre: "Para él" }, { nombre: "Pet lovers" }] },
      { nombre: "Promociones", hijos: [{ nombre: "Escoge tu pack" }] },
      { nombre: "Marcas", hijos: [{ nombre: "Little Joe" }, { nombre: "Dr. Marcus" }] },
      { nombre: "Mi cuenta", hijos: [{ nombre: "Carrito" }, { nombre: "Pago" }] },
      { nombre: "Empresas", hijos: [{ nombre: "Corporativa" }, { nombre: "Distribuidor" }] },
    ] },
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
    capturas: img("typhouse"),
  },
];
