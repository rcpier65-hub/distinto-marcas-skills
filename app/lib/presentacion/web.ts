/* Presentación comercial de Desarrollo web (Pedro 21-oct-2026): preguntas de
   la reunión, checklist de lo que puede tener la web, preguntas frecuentes y el
   paso a una propuesta borrador del módulo Planes y Propuestas. Puro: lo usan
   la pantalla (en vivo) y la API (al generar la propuesta). */
import { z } from "zod";
import { emptyProposal, serviceFromTemplate, type ProposalData, type ProposalService } from "../propuestas/model";
import { esTienda, estimarNivel, NIVELES, tieneCatalogo, type Nivel, type RespuestasWeb } from "./niveles";

export type { RespuestasWeb, Nivel };

type Opcion = { id: string; etiqueta: string };
export type Pregunta = {
  id: string;
  grupo: string;
  texto: string;
  tipo: "texto" | "opcion" | "sino" | "enlaces";
  /* Respuesta que alimenta el nivel (si aplica). */
  clave?: keyof RespuestasWeb;
  opciones?: Opcion[];
};

/* Guía de preguntas de la reunión, en el orden en que se conversa. */
export const PREGUNTAS: Pregunta[] = [
  { id: "negocio", grupo: "Tu negocio", texto: "¿Qué hace tu negocio y qué te diferencia?", tipo: "texto" },
  { id: "objetivo", grupo: "Tu negocio", texto: "¿Qué quieres lograr con la web en los próximos meses?", tipo: "texto" },
  { id: "publico", grupo: "Tu negocio", texto: "¿Quién es tu cliente ideal y cómo te encuentra hoy?", tipo: "texto" },
  { id: "tipo", grupo: "Tu web", texto: "¿Qué tipo de web necesitas?", tipo: "opcion", clave: "tipo", opciones: [
    { id: "presentacion", etiqueta: "Presentar la empresa" }, { id: "landing", etiqueta: "Landing para una campaña" },
    { id: "servicios", etiqueta: "Web de servicios" }, { id: "tienda", etiqueta: "Tienda online" },
    { id: "mixta", etiqueta: "Empresa + tienda online" },
  ] },
  { id: "paginas", grupo: "Tu web", texto: "¿Cuántas páginas imaginas?", tipo: "opcion", clave: "paginas", opciones: [
    { id: "hasta-5", etiqueta: "Hasta 5" }, { id: "6-10", etiqueta: "6 a 10" }, { id: "mas-10", etiqueta: "Más de 10" },
  ] },
  { id: "productos", grupo: "Tu web", texto: "¿Vas a mostrar o vender productos? ¿Cuántos?", tipo: "opcion", clave: "productos", opciones: [
    { id: "ninguno", etiqueta: "No" }, { id: "1-50", etiqueta: "1 a 50" }, { id: "51-100", etiqueta: "50 a 100" },
    { id: "101-200", etiqueta: "100 a 200" }, { id: "mas-200", etiqueta: "Más de 200" },
  ] },
  { id: "variantes", grupo: "Tu web", texto: "¿Tus productos tienen tallas, colores o variantes?", tipo: "sino", clave: "variantes" },
  { id: "fotos", grupo: "Tu web", texto: "¿Cuántas fotos tiene cada producto?", tipo: "opcion", clave: "fotos", opciones: [
    { id: "1-3", etiqueta: "1 a 3" }, { id: "4-6", etiqueta: "4 a 6" }, { id: "7-10", etiqueta: "7 a 10" },
  ] },
  { id: "plataforma", grupo: "Tecnología", texto: "¿Tienes preferencia de plataforma?", tipo: "opcion", clave: "plataforma", opciones: [
    { id: "shopify", etiqueta: "Shopify" }, { id: "wordpress", etiqueta: "WordPress" }, { id: "no-sabe", etiqueta: "Que nos recomienden" },
  ] },
  { id: "tieneWeb", grupo: "Lo que tienes hoy", texto: "¿Ya tienes una web?", tipo: "sino", clave: "tieneWeb" },
  { id: "tieneDominio", grupo: "Lo que tienes hoy", texto: "¿Tienes dominio (tuempresa.com)?", tipo: "sino", clave: "tieneDominio" },
  { id: "tieneHosting", grupo: "Lo que tienes hoy", texto: "¿Tienes hosting o servidor?", tipo: "sino", clave: "tieneHosting" },
  { id: "contenidos", grupo: "Contenidos", texto: "¿Tienes logo, textos y fotos listos?", tipo: "texto" },
  { id: "referencias", grupo: "Contenidos", texto: "¿Qué webs te gustan y por qué?", tipo: "enlaces" },
  { id: "plazo", grupo: "Tiempos", texto: "¿Para cuándo la necesitas?", tipo: "opcion", clave: "plazo", opciones: [
    { id: "pronto", etiqueta: "Lo más pronto posible" }, { id: "15-dias", etiqueta: "En 15 días" }, { id: "1-mes", etiqueta: "De aquí a un mes" },
    { id: "2-meses", etiqueta: "De aquí a 2 meses" }, { id: "sin-apuro", etiqueta: "Sin apuro" },
  ] },
  { id: "presupuesto", grupo: "Tiempos", texto: "¿Tienes un presupuesto aproximado?", tipo: "texto" },
];

/* Preguntas guía del panel de notas, por etapa de la presentación (Pedro
   21-oct-2026). Son abiertas: sirven para conducir la conversación mientras el
   cliente comparte su pantalla; lo que responde se anota a mano. */
export const GUIA_NOTAS: string[][] = [
  [
    "¿Cómo nació el negocio y qué vendes hoy?",
    "¿Por qué buscas una web justo ahora?",
    "¿Cómo te llegan los clientes hoy (redes, WhatsApp, recomendados)?",
    "¿Qué debería hacer alguien al entrar: comprar, escribir, agendar?",
    "¿Quién es tu competencia y qué hacen bien en su web?",
    "Muéstranos lo que tienes hoy: ¿qué te gusta y qué no?",
  ],
  [
    "¿Qué te diferencia de los demás de tu rubro?",
    "¿Cuál es el producto o servicio que más quieres vender?",
    "¿Qué preguntas te hacen siempre los clientes antes de comprar?",
    "¿Qué resultado te haría decir que la web funcionó?",
  ],
  [
    "¿Quién nos dará la información y aprobará cada fase?",
    "¿Cuánto tiempo puedes dedicar a revisar cada avance?",
    "¿Has trabajado antes con otra agencia? ¿Qué no funcionó?",
  ],
  [
    "¿Qué duda te queda sobre el proceso o los plazos?",
    "¿Quién actualizará la web cuando esté lista?",
    "¿Necesitas capacitación para administrarla?",
  ],
  [
    "¿Necesitas pagos en línea, reservas o formularios?",
    "¿Se conecta con algo que ya usas (WhatsApp, CRM, facturación)?",
    "¿En qué idiomas debe estar?",
    "¿Qué es imprescindible para el lanzamiento y qué puede esperar?",
  ],
  [
    "¿Quién más participa en la decisión?",
    "¿Cuándo te gustaría empezar?",
    "¿Cómo prefieres recibir la propuesta: correo o WhatsApp?",
  ],
];

export type Estado = "incluido" | "opcional" | "no";
/* Lo que una web puede tener. `clave` conecta el ítem con el nivel. */
/* Lo que una web puede tener, armado con lo que tienen los proyectos reales
   de distintostudio.com (Pedro 21-oct-2026). `clave` conecta el ítem con el
   nivel; `detalle` explica qué es y, si aplica, dónde ya lo hicimos. */
export const CHECKLIST: { id: string; grupo: string; etiqueta: string; detalle?: string; clave?: keyof RespuestasWeb }[] = [
  { id: "inicio", grupo: "Páginas", etiqueta: "Inicio", detalle: "Portada con mensaje principal, llamada a la acción y resumen de la empresa." },
  { id: "nosotros", grupo: "Páginas", etiqueta: "Nosotros / Empresa", detalle: "Historia, equipo, certificaciones y por qué elegirlos." },
  { id: "servicios", grupo: "Páginas", etiqueta: "Servicios o líneas de producto", detalle: "Una sección o página por servicio o colección (ej. Max, Onix y Amber en Novaelec)." },
  { id: "faq", grupo: "Páginas", etiqueta: "Preguntas frecuentes", detalle: "Resuelve dudas antes de que escriban (ej. Logística Los Olivos)." },
  { id: "testimonios", grupo: "Páginas", etiqueta: "Clientes y testimonios", detalle: "Logos de clientes y opiniones reales para generar confianza." },
  { id: "tarifario", grupo: "Páginas", etiqueta: "Tarifario o lista de precios", detalle: "Precios o rangos visibles para filtrar consultas." },
  { id: "contacto", grupo: "Páginas", etiqueta: "Contacto con mapa y horarios", detalle: "Dirección, mapa de Google, horarios, teléfonos y redes." },
  { id: "catalogo", grupo: "Catálogo y venta", etiqueta: "Catálogo de productos por categorías", detalle: "Productos organizados por categoría, marca u ocasión." },
  { id: "ficha", grupo: "Catálogo y venta", etiqueta: "Fichas de producto con galería", detalle: "Fotos, descripción, especificaciones y productos relacionados." },
  { id: "variantesCheck", grupo: "Catálogo y venta", etiqueta: "Variantes (tallas, colores, aromas)", detalle: "Elegir variante con su foto, precio y stock propio." },
  { id: "pdf", grupo: "Catálogo y venta", etiqueta: "Catálogos PDF descargables", detalle: "Catálogos para arquitectos o distribuidores (ej. Novaelec)." },
  { id: "buscador", grupo: "Catálogo y venta", etiqueta: "Buscador y filtros", detalle: "Buscar por nombre y filtrar por categoría, marca o precio (ej. Typhouse)." },
  { id: "carrito", grupo: "Catálogo y venta", etiqueta: "Carrito de compras", detalle: "Agregar, quitar y revisar antes de pagar.", clave: "tipo" },
  { id: "pagos", grupo: "Catálogo y venta", etiqueta: "Pagos online (tarjeta, Yape, Plin)", detalle: "Pasarela conectada; el dinero llega a la cuenta del cliente.", clave: "pagos" },
  { id: "envios", grupo: "Catálogo y venta", etiqueta: "Envíos y costos por zona", detalle: "Tarifas por distrito o provincia y recojo en tienda.", clave: "envios" },
  { id: "envioGratis", grupo: "Catálogo y venta", etiqueta: "Envío gratis desde un monto", detalle: "Barra que avisa cuánto falta para el envío gratis (ej. Typhouse)." },
  { id: "packs", grupo: "Catálogo y venta", etiqueta: "Packs, combos y promociones", detalle: "Combos multimarca y ofertas listas para elegir." },
  { id: "cupones", grupo: "Catálogo y venta", etiqueta: "Cupones de descuento", detalle: "Códigos por campaña, primera compra o influencers." },
  { id: "cuentas", grupo: "Catálogo y venta", etiqueta: "Cuentas de cliente", detalle: "Registro, historial de pedidos y direcciones guardadas." },
  { id: "mayoristas", grupo: "Catálogo y venta", etiqueta: "Zona de distribuidores o mayoristas", detalle: "Precios y pedidos especiales para empresas (ej. Typhouse).", clave: "medida" },
  { id: "whatsapp", grupo: "Contacto y atención", etiqueta: "Botón de WhatsApp", detalle: "Botón flotante con mensaje listo." },
  { id: "formulario", grupo: "Contacto y atención", etiqueta: "Formulario de contacto o cotización", detalle: "Llega al correo y puede conectarse al CRM." },
  { id: "chat", grupo: "Contacto y atención", etiqueta: "Chat de bienvenida", detalle: "Mensaje automático que invita a escribir (ej. Logística Los Olivos)." },
  { id: "reservas", grupo: "Contacto y atención", etiqueta: "Reservas, citas o visitas", detalle: "Agenda en línea (ej. «Agenda tu visita» al showroom de Novaelec).", clave: "reservas" },
  { id: "tracking", grupo: "Contacto y atención", etiqueta: "Seguimiento de pedidos o carga", detalle: "Acceso al estado del envío (ej. Tracking de Los Olivos).", clave: "integraciones" },
  { id: "reclamaciones", grupo: "Contacto y atención", etiqueta: "Libro de reclamaciones virtual", detalle: "Obligatorio en Perú para quien vende a consumidores." },
  { id: "video", grupo: "Contenido y diseño", etiqueta: "Video de portada", detalle: "Video a pantalla completa en la portada (ej. Novaelec)." },
  { id: "animaciones", grupo: "Contenido y diseño", etiqueta: "Animaciones y efectos al desplazar", detalle: "Movimientos sutiles que dan sensación premium." },
  { id: "textos", grupo: "Contenido y diseño", etiqueta: "Redacción de textos", detalle: "Escribimos los textos orientados a vender y a Google." },
  { id: "fotos", grupo: "Contenido y diseño", etiqueta: "Fotos o sesión de producto", detalle: "Producción de fotos propias o edición de las existentes." },
  { id: "blog", grupo: "Contenido y diseño", etiqueta: "Blog o noticias", detalle: "Artículos que atraen visitas desde Google.", clave: "blog" },
  { id: "idiomas", grupo: "Contenido y diseño", etiqueta: "Varios idiomas", detalle: "Versión en inglés u otro idioma.", clave: "idiomas" },
  { id: "seo", grupo: "Crecimiento", etiqueta: "SEO básico (aparecer en Google)", detalle: "Títulos, descripciones, velocidad y Search Console." },
  { id: "medicion", grupo: "Crecimiento", etiqueta: "Medición (Analytics y píxeles)", detalle: "Google Analytics y píxel de Meta con eventos de contacto o compra." },
  { id: "catalogoAds", grupo: "Crecimiento", etiqueta: "Catálogo para anuncios (Meta y Google Shopping)", detalle: "Productos sincronizados para anunciarlos." },
  { id: "captacion", grupo: "Crecimiento", etiqueta: "Captación de correos", detalle: "Ventana o formulario con cupón de bienvenida." },
  { id: "integraciones", grupo: "Crecimiento", etiqueta: "Integraciones (inventario, facturación, ERP, CRM)", detalle: "Conexión con los sistemas que ya usa la empresa.", clave: "integraciones" },
  { id: "legales", grupo: "Legal", etiqueta: "Privacidad, términos y cookies", detalle: "Páginas legales y aviso de cookies." },
  { id: "dominio", grupo: "Infraestructura", etiqueta: "Dominio (lo paga el cliente)", detalle: "tuempresa.com o .pe a nombre del cliente." },
  { id: "hosting", grupo: "Infraestructura", etiqueta: "Hosting o plataforma (lo paga el cliente)", detalle: "Servidor, Shopify o WordPress según el proyecto." },
  { id: "correos", grupo: "Infraestructura", etiqueta: "Correos corporativos", detalle: "nombre@tuempresa.com configurados." },
  { id: "capacitacion", grupo: "Después de lanzar", etiqueta: "Capacitación para administrar la web", detalle: "Sesión grabada para editar textos, fotos y productos." },
  { id: "soporte", grupo: "Después de lanzar", etiqueta: "Soporte de 30 días tras el lanzamiento", detalle: "Ajustes menores y dudas después de publicar." },
  { id: "mantenimiento", grupo: "Después de lanzar", etiqueta: "Mantenimiento mensual", detalle: "Actualizaciones, respaldos, cambios y mejoras." },
];

/* Dudas comunes, fieles a lo publicado en distintostudio.com. */
export const FAQ: { p: string; r: string }[] = [
  { p: "¿Cuánto cuesta una web?", r: "Depende de lo que necesites. Trabajamos con tres niveles: Básico (S/ 1,800), Intermedio (S/ 3,000 – 3,500) y Avanzado (S/ 5,000 – 8,000). El monto final va en la propuesta que te enviamos después de esta reunión." },
  { p: "¿Cuánto demora?", r: "Aproximadamente 10–15 días hábiles un Básico, 20–30 un Intermedio y 30–45 un Avanzado. El plazo real depende de que tengamos tus contenidos y aprobaciones a tiempo." },
  { p: "¿Quién paga el dominio y el hosting?", r: "Tú, directamente al proveedor, para que queden a tu nombre. Te recomendamos la opción adecuada y la configuramos." },
  { p: "¿Podré hacer cambios yo mismo?", r: "Sí. Al entregar te capacitamos para editar textos, fotos y productos. Para cambios mayores tenemos mantenimiento mensual." },
  { p: "¿Se verá bien en el celular?", r: "Sí. Diseñamos para escritorio y celular, y lo revisamos en ambos antes de publicar." },
  { p: "¿Aparecerá en Google?", r: "Incluimos SEO básico: estructura, títulos, descripciones y velocidad. El posicionamiento crece con el tiempo y con contenido." },
  { p: "¿Qué necesitan de mí?", r: "Logo, textos o la información para redactarlos, fotos y accesos (dominio, redes). Si no tienes fotos, podemos producirlas." },
  { p: "¿Cuántas correcciones incluye?", r: "Una ronda de correcciones en cada fase: estructura, baja, media y alta fidelidad. Así los cambios se hacen a tiempo y no al final." },
  { p: "¿Shopify o WordPress?", r: "Shopify es ideal para vender con poca administración técnica; WordPress da más libertad para webs de servicios y contenido. Te recomendamos según tu caso." },
  { p: "¿Qué pasa después de publicar?", r: "Revisamos el comportamiento de los visitantes y priorizamos mejoras. Puedes contratar mantenimiento mensual." },
];

const texto = (max: number) => z.string().trim().max(max);
const cliente = z.object({ nombre: texto(160).default(""), empresa: texto(200).default(""), rubro: texto(200).default(""), contacto: texto(180).default("") });
/* Reuniones guardadas antes del 21-oct usaban «hasta/más de 100» y «muchas fotos sí/no». */
const VIEJOS_PRODUCTOS: Record<string, string> = { "hasta-100": "51-100", "mas-100": "101-200" };
const migrarRespuestas = (v: unknown) => {
  if (!v || typeof v !== "object") return v;
  const r = { ...(v as Record<string, unknown>) };
  if (typeof r.productos === "string" && VIEJOS_PRODUCTOS[r.productos]) r.productos = VIEJOS_PRODUCTOS[r.productos];
  if (typeof r.muchasImagenes === "boolean" && r.fotos === undefined) r.fotos = r.muchasImagenes ? "7-10" : "1-3";
  delete r.muchasImagenes;
  return r;
};
const respuestas = z.preprocess(migrarRespuestas, z.object({
  tipo: z.enum(["presentacion", "landing", "servicios", "tienda", "mixta"]).optional(),
  paginas: z.enum(["hasta-5", "6-10", "mas-10"]).optional(),
  productos: z.enum(["ninguno", "1-50", "51-100", "101-200", "mas-200"]).optional(),
  fotos: z.enum(["1-3", "4-6", "7-10"]).optional(),
  plataforma: z.enum(["shopify", "wordpress", "no-sabe"]).optional(),
  variantes: z.boolean().optional(), pagos: z.boolean().optional(), envios: z.boolean().optional(),
  blog: z.boolean().optional(), reservas: z.boolean().optional(), idiomas: z.boolean().optional(), integraciones: z.boolean().optional(),
  plazo: z.enum(["pronto", "15-dias", "1-mes", "2-meses", "sin-apuro"]).optional(),
  medida: z.boolean().optional(), tieneWeb: z.boolean().optional(), tieneDominio: z.boolean().optional(), tieneHosting: z.boolean().optional(),
}));
export const sesionSchema = z.object({
  cliente: cliente.prefault({}),
  respuestas: respuestas.default({}),
  /* Respuestas abiertas de la guía (id de pregunta → texto). */
  textos: z.record(z.string().max(40), texto(1000)).default({}),
  notas: texto(4000).default(""),
  /* Webs de referencia del cliente: enlace + por qué le gusta. */
  referencias: z.array(z.object({ url: texto(500).default(""), motivo: texto(400).default("") })).max(15).default([]),
  checklist: z.record(z.string().max(40), z.enum(["incluido", "opcional", "no"])).default({}),
  /* Lo que no está en la lista: se escribe en la reunión. */
  /* Inversión acordada en la reunión (dentro del rango del nivel). */
  precio: z.number().min(0).max(1000000).nullable().default(null),
  extras: z.array(z.object({ texto: texto(200).default(""), estado: z.enum(["incluido", "opcional", "no"]).default("incluido") })).max(20).default([]),
});
export type Sesion = z.infer<typeof sesionSchema>;

/* Enlace abrible solo si es http(s); sin protocolo se asume https. */
export function enlaceSeguro(url: string): string | null {
  const t = url.trim();
  if (!t || /\s/.test(t)) return null;
  const u = URL.parse(/^[a-z][a-z0-9+.-]*:/i.test(t) ? t : `https://${t}`);
  return u && (u.protocol === "https:" || u.protocol === "http:") && u.hostname.includes(".") ? u.href : null;
}

export const sesionVacia = (c: Sesion["cliente"]): Sesion => sesionSchema.parse({ cliente: c });

/* Checklist sugerido a partir de las respuestas (se puede cambiar a mano). */
export function checklistInicial(r: RespuestasWeb): Record<string, Estado> {
  const tienda = esTienda(r);
  const c: Record<string, Estado> = { inicio: "incluido", servicios: "incluido", contacto: "incluido", whatsapp: "incluido", formulario: "incluido", seo: "incluido", medicion: "incluido", capacitacion: "incluido", dominio: "incluido", hosting: "incluido", legales: "incluido", soporte: "incluido" };
  if (r.tipo !== "landing") c.nosotros = "incluido";
  if (tienda || tieneCatalogo(r)) { c.catalogo = "incluido"; c.ficha = "incluido"; }
  if (r.variantes) c.variantesCheck = "incluido";
  if (r.productos === "101-200" || r.productos === "mas-200") c.buscador = "incluido";
  if (tienda) { c.carrito = "incluido"; c.pagos = "incluido"; c.envios = "incluido"; c.reclamaciones = "incluido"; }
  if (r.pagos) c.pagos = "incluido";
  if (r.envios) c.envios = "incluido";
  if (r.blog) c.blog = "incluido";
  if (r.reservas) c.reservas = "incluido";
  if (r.idiomas) c.idiomas = "incluido";
  if (r.integraciones) c.integraciones = "incluido";
  return c;
}

/* Responder una pregunta actualiza las sugerencias del checklist: los ítems
   que seguían como los sugirió la respuesta anterior pasan a la nueva
   sugerencia; los que Pedro cambió a mano se respetan. Así, pasar de «Tienda»
   a «Presentar la empresa» quita carrito y pagos y el nivel baja. */
export function aplicarRespuesta(s: Sesion, clave: keyof RespuestasWeb, valor: unknown): Sesion {
  const antes = checklistInicial(s.respuestas);
  const respuestas = { ...s.respuestas, [clave]: valor } as RespuestasWeb;
  if (valor === undefined) delete (respuestas as Record<string, unknown>)[clave];
  const ahora = checklistInicial(respuestas);
  const checklist: Record<string, Estado> = { ...s.checklist };
  for (const k of new Set([...Object.keys(antes), ...Object.keys(ahora)])) {
    const actual = checklist[k] ?? "no";
    const sugerido = antes[k] ?? "no";
    if (actual !== sugerido) continue; // edición manual: se respeta
    if (ahora[k]) checklist[k] = ahora[k]; else delete checklist[k];
  }
  return { ...s, respuestas, checklist };
}

/* Lo marcado como incluido en el checklist también cuenta para el nivel. */
export function respuestasEfectivas(s: Sesion): RespuestasWeb {
  const r: RespuestasWeb = { ...s.respuestas };
  const si = (id: string) => s.checklist[id] === "incluido";
  if (si("carrito") && !esTienda(r)) r.tipo = "tienda";
  for (const k of ["pagos", "envios", "blog", "reservas", "idiomas", "integraciones"] as const) if (si(k)) r[k] = true;
  if (si("tracking")) r.integraciones = true;
  if (si("mayoristas")) r.medida = true;
  if (si("variantesCheck")) r.variantes = true;
  return r;
}

export function nivelDeSesion(s: Sesion) {
  const e = estimarNivel(respuestasEfectivas(s));
  return { ...e, ...NIVELES[e.nivel] };
}

/* Propuesta borrador: un servicio del nivel con lo incluido como alcance, y
   cada opcional como servicio opcional «a cotizar». El precio final lo fija
   Pedro en Planes y Propuestas antes de enviarla. */
/* Entregables que acompañan a toda web de Distinto (proceso de «Cómo trabajamos»). */
export const ENTREGABLES_WEB = [
  "Brief del proyecto y mapa del sitio aprobados",
  "Diseño en baja, media y alta fidelidad, con una ronda de correcciones en cada etapa",
  "Web desarrollada, adaptada a celular y publicada en tu dominio",
  "Pruebas de formularios, enlaces y velocidad antes de publicar",
  "Capacitación grabada para administrarla",
];

/* Propuesta con el mismo formato que las de Planes y Propuestas: un servicio
   del nivel con alcance, entregables y exclusiones; opcionales a cotizar;
   forma de pago de proyecto. Las notas de la reunión no van al documento. */
export function aPropuesta(s: Sesion, hoy: string, uid: () => string): ProposalData {
  const n = nivelDeSesion(s);
  const p = emptyProposal();
  const empresa = s.cliente.empresa || s.cliente.nombre || "Cliente";
  const etiqueta = (id: string) => CHECKLIST.find((c) => c.id === id)?.etiqueta ?? id;
  const extras = s.extras.filter((x) => x.texto.trim());
  const incluidos = [...CHECKLIST.filter((c) => s.checklist[c.id] === "incluido").map((c) => c.etiqueta), ...extras.filter((x) => x.estado === "incluido").map((x) => x.texto.trim())];
  const plantilla = serviceFromTemplate(n.catalogoId, uid());
  const precio = s.precio ?? (n.desde === n.hasta ? n.desde : null);
  const base: ProposalService = {
    ...plantilla,
    summary: `${n.resumen} Plazo estimado: ${n.plazo}`,
    scope: incluidos.join("\n"),
    deliverables: ENTREGABLES_WEB.join("\n"),
    price: precio,
    frequency: "unico",
    optional: false,
  };
  const opcional = (name: string): ProposalService => ({
    ...serviceFromTemplate("personalizado", uid()),
    name, category: "Web · opcional", summary: "Opcional a cotizar según el alcance final.",
    frequency: "unico", optional: true, price: null,
  });
  const opcionales = [
    ...CHECKLIST.filter((c) => s.checklist[c.id] === "opcional").map((c) => opcional(etiqueta(c.id))),
    ...extras.filter((e) => e.estado === "opcional").map((e) => opcional(e.texto.trim())),
  ];
  const t = (id: string) => s.textos[id]?.trim() ?? "";
  const plazo = PREGUNTAS.find((q) => q.id === "plazo")?.opciones?.find((o) => o.id === s.respuestas.plazo);
  const refs = s.referencias.filter((r) => r.url.trim()).map((r) => `• ${enlaceSeguro(r.url) ?? r.url.trim()}${r.motivo.trim() ? ` — ${r.motivo.trim()}` : ""}`);
  const objetivo = [
    t("objetivo") || `Diseñar y desarrollar la web de ${empresa} para presentar su negocio con claridad y convertir visitas en clientes.`,
    t("negocio") && `Sobre el negocio: ${t("negocio")}`,
    t("publico") && `Cliente ideal: ${t("publico")}`,
    plazo && `Plazo deseado: ${plazo.etiqueta}.`,
    refs.length ? `Webs de referencia:\n${refs.join("\n")}` : "",
  ].filter(Boolean).join("\n\n");
  return {
    ...p,
    title: `Desarrollo web · ${empresa}`,
    date: hoy,
    client: { ...p.client, name: empresa, contact: s.cliente.nombre, industry: s.cliente.rubro, email: s.cliente.contacto.includes("@") ? s.cliente.contacto : "", phone: s.cliente.contacto.includes("@") ? "" : s.cliente.contacto },
    objective: objetivo.slice(0, 4000),
    services: [base, ...opcionales],
    payment: "50% al inicio del proyecto y 50% contra entrega final.",
    externalCosts: "Dominio, hosting, licencias y costos de plataformas los paga el cliente directamente al proveedor.",
    status: "borrador",
  };
}
