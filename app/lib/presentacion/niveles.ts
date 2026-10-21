/* Niveles estandarizados de Desarrollo web (Pedro 21-oct-2026): «un básico
   1,800, un intermedio 3,000 a 3,500 y un avanzado 5,000 a 8,000, pero con
   respuestas». Las respuestas de la reunión deciden el nivel y explican qué lo
   sube. Puro, sin servidor: lo usa la presentación en vivo y la propuesta. */

export type Nivel = "basico" | "intermedio" | "avanzado";

/* Respuestas de la reunión que influyen en el nivel. */
export type RespuestasWeb = {
  tipo?: "presentacion" | "landing" | "servicios" | "tienda" | "mixta";
  paginas?: "hasta-5" | "6-10" | "mas-10";
  productos?: "ninguno" | "1-50" | "51-100" | "101-200" | "mas-200";
  variantes?: boolean;
  fotos?: "1-3" | "4-6" | "7-10";
  pagos?: boolean;
  envios?: boolean;
  blog?: boolean;
  reservas?: boolean;
  idiomas?: boolean;
  integraciones?: boolean;
  medida?: boolean;
  plataforma?: "shopify" | "wordpress" | "no-sabe";
  tieneWeb?: boolean;
  tieneDominio?: boolean;
  tieneHosting?: boolean;
  /* Para cuándo la necesita (no cambia el nivel). */
  plazo?: "pronto" | "15-dias" | "1-mes" | "2-meses" | "sin-apuro";
};

export const NIVELES: Record<Nivel, { nombre: string; catalogoId: string; rango: string; desde: number; hasta: number; plazo: string; resumen: string }> = {
  basico: {
    nombre: "Básico", catalogoId: "web-nivel-basico", rango: "S/ 1,800", desde: 1800, hasta: 1800, plazo: "10–15 días hábiles aprox.",
    resumen: "Web de presentación o landing de hasta 5 páginas, adaptada a celular, con WhatsApp y formulario de contacto.",
  },
  intermedio: {
    nombre: "Intermedio", catalogoId: "web-nivel-intermedio", rango: "S/ 3,000 – 3,500", desde: 3000, hasta: 3500, plazo: "20–30 días hábiles aprox.",
    resumen: "Tienda con carrito y pagos online, o web de servicios más completa (blog, reservas, más páginas o idiomas).",
  },
  avanzado: {
    nombre: "Avanzado", catalogoId: "web-nivel-avanzado", rango: "S/ 5,000 – 8,000", desde: 5000, hasta: 8000, plazo: "30–45 días hábiles aprox.",
    resumen: "Tienda grande o proyecto a medida: más de 100 productos, variantes, integraciones con otros sistemas o desarrollo especial.",
  },
};

const ORDEN: Nivel[] = ["basico", "intermedio", "avanzado"];

/* «Mixta» = web corporativa con tienda (Pedro 21-oct-2026): vende igual que una tienda. */
export const esTienda = (r: RespuestasWeb) => r.tipo === "tienda" || r.tipo === "mixta";
export const tieneCatalogo = (r: RespuestasWeb) => !!r.productos && r.productos !== "ninguno";

/* Nivel = el más alto que exija alguna respuesta. Cada regla que sube el nivel
   deja un motivo legible para mostrarlo al cliente. */
export function estimarNivel(r: RespuestasWeb): { nivel: Nivel; motivos: string[] } {
  const reglas: [boolean | undefined, Nivel, string][] = [
    [esTienda(r), "intermedio", r.tipo === "mixta" ? "Web corporativa con tienda online" : "Tienda online: carrito y proceso de compra"],
    [r.pagos, "intermedio", "Pagos online integrados"],
    [r.envios, "intermedio", "Configuración de envíos"],
    [r.productos === "1-50", "intermedio", "Catálogo de hasta 50 productos"],
    [r.productos === "51-100", "intermedio", "Catálogo de 50 a 100 productos"],
    [r.blog, "intermedio", "Blog o sección de noticias"],
    [r.reservas, "intermedio", "Reservas o agenda en línea"],
    [r.idiomas, "intermedio", "Web en más de un idioma"],
    [r.paginas === "6-10" || r.paginas === "mas-10", "intermedio", "Más de 5 páginas"],
    [r.productos === "101-200", "avanzado", "Catálogo de 100 a 200 productos"],
    [r.productos === "mas-200", "avanzado", "Más de 200 productos"],
    [r.variantes && r.fotos === "7-10", "avanzado", "Variantes y de 7 a 10 fotos por producto"],
    [r.integraciones, "avanzado", "Integraciones con otros sistemas (inventario, facturación, ERP)"],
    [r.medida, "avanzado", "Funciones a medida"],
  ];
  let nivel: Nivel = "basico";
  const motivos: string[] = [];
  for (const [aplica, n, motivo] of reglas) {
    if (!aplica) continue;
    motivos.push(motivo);
    if (ORDEN.indexOf(n) > ORDEN.indexOf(nivel)) nivel = n;
  }
  return { nivel, motivos };
}
