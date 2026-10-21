/* Presentación comercial de Desarrollo web (Pedro 21-oct-2026): preguntas de
   la reunión, checklist de lo que puede tener la web, preguntas frecuentes y el
   paso a una propuesta borrador del módulo Planes y Propuestas. Puro: lo usan
   la pantalla (en vivo) y la API (al generar la propuesta). */
import { z } from "zod";
import { emptyProposal, serviceFromTemplate, type ProposalData, type ProposalService } from "../propuestas/model";
import { estimarNivel, NIVELES, type Nivel, type RespuestasWeb } from "./niveles";

export type { RespuestasWeb, Nivel };

type Opcion = { id: string; etiqueta: string };
export type Pregunta = {
  id: string;
  grupo: string;
  texto: string;
  tipo: "texto" | "opcion" | "sino";
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
  ] },
  { id: "paginas", grupo: "Tu web", texto: "¿Cuántas páginas imaginas?", tipo: "opcion", clave: "paginas", opciones: [
    { id: "hasta-5", etiqueta: "Hasta 5" }, { id: "6-10", etiqueta: "6 a 10" }, { id: "mas-10", etiqueta: "Más de 10" },
  ] },
  { id: "productos", grupo: "Tu web", texto: "¿Vas a mostrar o vender productos? ¿Cuántos?", tipo: "opcion", clave: "productos", opciones: [
    { id: "ninguno", etiqueta: "No" }, { id: "hasta-100", etiqueta: "Hasta 100" }, { id: "mas-100", etiqueta: "Más de 100" },
  ] },
  { id: "variantes", grupo: "Tu web", texto: "¿Tus productos tienen tallas, colores o variantes?", tipo: "sino", clave: "variantes" },
  { id: "muchasImagenes", grupo: "Tu web", texto: "¿Cada producto tiene muchas fotos?", tipo: "sino", clave: "muchasImagenes" },
  { id: "plataforma", grupo: "Tecnología", texto: "¿Tienes preferencia de plataforma?", tipo: "opcion", clave: "plataforma", opciones: [
    { id: "shopify", etiqueta: "Shopify" }, { id: "wordpress", etiqueta: "WordPress" }, { id: "no-sabe", etiqueta: "Que nos recomienden" },
  ] },
  { id: "tieneWeb", grupo: "Lo que tienes hoy", texto: "¿Ya tienes una web?", tipo: "sino", clave: "tieneWeb" },
  { id: "tieneDominio", grupo: "Lo que tienes hoy", texto: "¿Tienes dominio (tuempresa.com)?", tipo: "sino", clave: "tieneDominio" },
  { id: "tieneHosting", grupo: "Lo que tienes hoy", texto: "¿Tienes hosting o servidor?", tipo: "sino", clave: "tieneHosting" },
  { id: "contenidos", grupo: "Contenidos", texto: "¿Tienes logo, textos y fotos listos?", tipo: "texto" },
  { id: "referencias", grupo: "Contenidos", texto: "¿Qué webs te gustan y por qué?", tipo: "texto" },
  { id: "plazo", grupo: "Tiempos", texto: "¿Para cuándo la necesitas?", tipo: "texto" },
  { id: "presupuesto", grupo: "Tiempos", texto: "¿Tienes un presupuesto aproximado?", tipo: "texto" },
];

export type Estado = "incluido" | "opcional" | "no";
/* Lo que una web puede tener. `clave` conecta el ítem con el nivel. */
export const CHECKLIST: { id: string; grupo: string; etiqueta: string; clave?: keyof RespuestasWeb }[] = [
  { id: "inicio", grupo: "Páginas", etiqueta: "Inicio" },
  { id: "nosotros", grupo: "Páginas", etiqueta: "Nosotros" },
  { id: "servicios", grupo: "Páginas", etiqueta: "Servicios o productos" },
  { id: "contacto", grupo: "Páginas", etiqueta: "Contacto con mapa" },
  { id: "catalogo", grupo: "Venta", etiqueta: "Catálogo de productos" },
  { id: "carrito", grupo: "Venta", etiqueta: "Carrito de compras", clave: "tipo" },
  { id: "pagos", grupo: "Venta", etiqueta: "Pagos online (tarjeta, Yape, Plin)", clave: "pagos" },
  { id: "envios", grupo: "Venta", etiqueta: "Envíos y costos por zona", clave: "envios" },
  { id: "whatsapp", grupo: "Contacto", etiqueta: "Botón de WhatsApp" },
  { id: "formulario", grupo: "Contacto", etiqueta: "Formulario de contacto" },
  { id: "reservas", grupo: "Contacto", etiqueta: "Reservas o agenda en línea", clave: "reservas" },
  { id: "blog", grupo: "Contenido", etiqueta: "Blog o noticias", clave: "blog" },
  { id: "idiomas", grupo: "Contenido", etiqueta: "Varios idiomas", clave: "idiomas" },
  { id: "seo", grupo: "Crecimiento", etiqueta: "SEO básico (aparecer en Google)" },
  { id: "medicion", grupo: "Crecimiento", etiqueta: "Medición (Analytics y píxeles)" },
  { id: "integraciones", grupo: "Crecimiento", etiqueta: "Integraciones (inventario, facturación, ERP)", clave: "integraciones" },
  { id: "dominio", grupo: "Infraestructura", etiqueta: "Dominio (lo paga el cliente)" },
  { id: "hosting", grupo: "Infraestructura", etiqueta: "Hosting o servidor (lo paga el cliente)" },
  { id: "capacitacion", grupo: "Después de lanzar", etiqueta: "Capacitación para administrar la web" },
  { id: "mantenimiento", grupo: "Después de lanzar", etiqueta: "Mantenimiento mensual" },
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
const respuestas = z.object({
  tipo: z.enum(["presentacion", "landing", "servicios", "tienda"]).optional(),
  paginas: z.enum(["hasta-5", "6-10", "mas-10"]).optional(),
  productos: z.enum(["ninguno", "hasta-100", "mas-100"]).optional(),
  plataforma: z.enum(["shopify", "wordpress", "no-sabe"]).optional(),
  variantes: z.boolean().optional(), muchasImagenes: z.boolean().optional(), pagos: z.boolean().optional(), envios: z.boolean().optional(),
  blog: z.boolean().optional(), reservas: z.boolean().optional(), idiomas: z.boolean().optional(), integraciones: z.boolean().optional(),
  medida: z.boolean().optional(), tieneWeb: z.boolean().optional(), tieneDominio: z.boolean().optional(), tieneHosting: z.boolean().optional(),
});
export const sesionSchema = z.object({
  cliente: cliente.prefault({}),
  respuestas: respuestas.default({}),
  /* Respuestas abiertas de la guía (id de pregunta → texto). */
  textos: z.record(z.string().max(40), texto(1000)).default({}),
  notas: texto(4000).default(""),
  checklist: z.record(z.string().max(40), z.enum(["incluido", "opcional", "no"])).default({}),
});
export type Sesion = z.infer<typeof sesionSchema>;

export const sesionVacia = (c: Sesion["cliente"]): Sesion => sesionSchema.parse({ cliente: c });

/* Checklist sugerido a partir de las respuestas (se puede cambiar a mano). */
export function checklistInicial(r: RespuestasWeb): Record<string, Estado> {
  const tienda = r.tipo === "tienda";
  const c: Record<string, Estado> = { inicio: "incluido", servicios: "incluido", contacto: "incluido", whatsapp: "incluido", formulario: "incluido", seo: "incluido", medicion: "incluido", capacitacion: "incluido", dominio: "incluido", hosting: "incluido" };
  if (r.tipo !== "landing") c.nosotros = "incluido";
  if (tienda || r.productos === "hasta-100" || r.productos === "mas-100") c.catalogo = "incluido";
  if (tienda) { c.carrito = "incluido"; c.pagos = "incluido"; c.envios = "incluido"; }
  if (r.pagos) c.pagos = "incluido";
  if (r.envios) c.envios = "incluido";
  if (r.blog) c.blog = "incluido";
  if (r.reservas) c.reservas = "incluido";
  if (r.idiomas) c.idiomas = "incluido";
  if (r.integraciones) c.integraciones = "incluido";
  return c;
}

/* Lo marcado como incluido en el checklist también cuenta para el nivel. */
export function respuestasEfectivas(s: Sesion): RespuestasWeb {
  const r: RespuestasWeb = { ...s.respuestas };
  const si = (id: string) => s.checklist[id] === "incluido";
  if (si("carrito") && r.tipo !== "tienda") r.tipo = "tienda";
  for (const k of ["pagos", "envios", "blog", "reservas", "idiomas", "integraciones"] as const) if (si(k)) r[k] = true;
  return r;
}

export function nivelDeSesion(s: Sesion) {
  const e = estimarNivel(respuestasEfectivas(s));
  return { ...e, ...NIVELES[e.nivel] };
}

/* Propuesta borrador: un servicio del nivel con lo incluido como alcance, y
   cada opcional como servicio opcional «a cotizar». El precio final lo fija
   Pedro en Planes y Propuestas antes de enviarla. */
export function aPropuesta(s: Sesion, hoy: string, uid: () => string): ProposalData {
  const n = nivelDeSesion(s);
  const p = emptyProposal();
  const etiqueta = (id: string) => CHECKLIST.find((c) => c.id === id)?.etiqueta ?? id;
  const incluidos = CHECKLIST.filter((c) => s.checklist[c.id] === "incluido").map((c) => c.etiqueta);
  const base: ProposalService = {
    ...serviceFromTemplate(n.catalogoId, uid()),
    summary: `${n.resumen} Inversión de referencia: ${n.rango}. Plazo: ${n.plazo}`,
    scope: incluidos.join("\n"),
    price: n.desde === n.hasta ? n.desde : null,
    frequency: "unico",
    optional: false,
  };
  const opcionales: ProposalService[] = Object.entries(s.checklist).filter(([, v]) => v === "opcional").map(([id]) => ({
    ...serviceFromTemplate("personalizado", uid()),
    name: etiqueta(id), category: "Web · opcional", summary: "Opcional a cotizar según el alcance final.",
    frequency: "unico", optional: true, price: null,
  }));
  const respuestasTexto = PREGUNTAS.filter((q) => q.tipo === "texto" && s.textos[q.id]?.trim()).map((q) => `${q.texto} ${s.textos[q.id].trim()}`);
  return {
    ...p,
    title: `Desarrollo web · ${s.cliente.empresa || s.cliente.nombre || "Cliente"}`,
    date: hoy,
    client: { ...p.client, name: s.cliente.empresa || s.cliente.nombre, contact: s.cliente.nombre, industry: s.cliente.rubro, email: s.cliente.contacto.includes("@") ? s.cliente.contacto : "", phone: s.cliente.contacto.includes("@") ? "" : s.cliente.contacto },
    objective: [s.notas.trim(), ...respuestasTexto].filter(Boolean).join("\n\n").slice(0, 4000),
    services: [base, ...opcionales],
    externalCosts: "Dominio, hosting, licencias y costos de plataformas los paga el cliente directamente al proveedor.",
    status: "borrador",
  };
}
