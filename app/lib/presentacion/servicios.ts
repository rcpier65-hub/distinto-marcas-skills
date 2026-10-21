/* Presentación multiservicio (Pedro 21-oct-2026): una reunión puede vender
   Desarrollo web, Social Media y Publicidad digital juntos. Aquí viven las
   preguntas, el proceso con sus reuniones y la parte de la propuesta de Social
   Media y Publicidad. Precios y alcances salen del catálogo de Planes. Puro. */
import { PLANES } from "../planes/catalogo";
import { excessAdFee, priceSuggestion, serviceFromTemplate, type ProposalService } from "../propuestas/model";

export type Servicio = "web" | "social" | "ads";
export const SERVICIOS: { id: Servicio; nombre: string; corto: string }[] = [
  { id: "web", nombre: "Desarrollo web", corto: "Web" },
  { id: "social", nombre: "Social Media", corto: "Social Media" },
  { id: "ads", nombre: "Publicidad digital", corto: "Publicidad" },
];

/* ---------- Respuestas de Social Media y Publicidad ---------- */
export type RespuestasSocial = {
  redes?: string[];
  gestion?: "nadie" | "dueno" | "equipo" | "agencia";
  objetivo?: "ventas" | "citas" | "reconocimiento" | "comunidad";
  frecuencia?: "nunca" | "a-veces" | "semanal" | "diario";
  material?: "si" | "poco" | "no";
  grabar?: boolean;
  tienda?: boolean;
  plan?: string | null;
};
export type RespuestasAds = {
  experiencia?: "nunca" | "boost" | "campanas";
  inversion?: number | null;
  plataformas?: string[];
  objetivo?: "mensajes" | "ventas-web" | "leads" | "trafico";
  medicion?: "si" | "no" | "no-sabe";
};

type Opcion = { id: string; etiqueta: string };
export type PreguntaServicio = { id: string; texto: string; tipo: "opcion" | "multi" | "sino" | "monto"; opciones?: Opcion[]; ayuda?: string };

export const PREGUNTAS_SOCIAL: PreguntaServicio[] = [
  { id: "redes", texto: "¿En qué redes está hoy tu marca?", tipo: "multi", opciones: [
    { id: "instagram", etiqueta: "Instagram" }, { id: "facebook", etiqueta: "Facebook" }, { id: "tiktok", etiqueta: "TikTok" },
    { id: "linkedin", etiqueta: "LinkedIn" }, { id: "youtube", etiqueta: "YouTube" }, { id: "google", etiqueta: "Google Business" },
  ] },
  { id: "gestion", texto: "¿Quién maneja tus redes hoy?", tipo: "opcion", opciones: [
    { id: "nadie", etiqueta: "Nadie" }, { id: "dueno", etiqueta: "Yo mismo" }, { id: "equipo", etiqueta: "Alguien del equipo" }, { id: "agencia", etiqueta: "Otra agencia" },
  ] },
  { id: "frecuencia", texto: "¿Cada cuánto publican?", tipo: "opcion", opciones: [
    { id: "nunca", etiqueta: "Casi nunca" }, { id: "a-veces", etiqueta: "De vez en cuando" }, { id: "semanal", etiqueta: "Cada semana" }, { id: "diario", etiqueta: "Casi a diario" },
  ] },
  { id: "objetivo", texto: "¿Qué quieres conseguir con las redes?", tipo: "opcion", opciones: [
    { id: "ventas", etiqueta: "Vender más" }, { id: "citas", etiqueta: "Citas o mensajes" }, { id: "reconocimiento", etiqueta: "Que nos conozcan" }, { id: "comunidad", etiqueta: "Fidelizar clientes" },
  ] },
  { id: "material", texto: "¿Tienes fotos y videos de tu negocio?", tipo: "opcion", opciones: [
    { id: "si", etiqueta: "Sí, bastante" }, { id: "poco", etiqueta: "Muy poco" }, { id: "no", etiqueta: "No tengo" },
  ] },
  { id: "grabar", texto: "¿Podemos grabar en tu local o con tu equipo?", tipo: "sino" },
  { id: "tienda", texto: "¿Vendes por web o tienda online?", tipo: "sino" },
];

export const PREGUNTAS_ADS: PreguntaServicio[] = [
  { id: "experiencia", texto: "¿Ya hiciste publicidad en redes o Google?", tipo: "opcion", opciones: [
    { id: "nunca", etiqueta: "Nunca" }, { id: "boost", etiqueta: "Solo «promocionar publicación»" }, { id: "campanas", etiqueta: "Campañas en el administrador" },
  ] },
  { id: "objetivo", texto: "¿Qué quieres que haga la gente al ver tu anuncio?", tipo: "opcion", opciones: [
    { id: "mensajes", etiqueta: "Escribir por WhatsApp" }, { id: "ventas-web", etiqueta: "Comprar en la web" }, { id: "leads", etiqueta: "Dejar sus datos" }, { id: "trafico", etiqueta: "Visitar la web o el local" },
  ] },
  { id: "plataformas", texto: "¿Dónde quieres anunciar?", tipo: "multi", opciones: [
    { id: "meta", etiqueta: "Facebook e Instagram" }, { id: "tiktok", etiqueta: "TikTok" }, { id: "google", etiqueta: "Google" },
  ] },
  { id: "inversion", texto: "¿Cuánto podrías invertir al mes en anuncios?", tipo: "monto", ayuda: "La inversión la pagas tú directamente a la plataforma." },
  { id: "medicion", texto: "¿Tu web tiene el píxel de Meta o Google Analytics?", tipo: "opcion", opciones: [
    { id: "si", etiqueta: "Sí" }, { id: "no", etiqueta: "No" }, { id: "no-sabe", etiqueta: "No sé" },
  ] },
];

/* ---------- Planes de Social Media ---------- */
export const PLANES_SOCIAL = PLANES.filter((p) => p.categoria === "social");
/* Planes que ya incluyen la gestión de pauta (no se cobra Paid Media aparte). */
export const PLANES_CON_PAUTA = ["sm-integration", "sm-integration-pro", "sm-ecommerce", "sm-forneed"];
export const incluyePauta = (planId?: string | null) => !!planId && PLANES_CON_PAUTA.includes(planId);

/* Plan sugerido según lo que se conversó; Pedro puede elegir otro. */
export function planSugerido(s: RespuestasSocial, conAds: boolean, conWeb: boolean): string {
  if (s.tienda && conAds) return "sm-ecommerce";
  if (conAds && conWeb) return "sm-forneed";
  if (conAds) return "sm-integration-pro";
  return "sm-contenido";
}

/* ---------- Procesos y reuniones ---------- */
export type Paso = { titulo: string; que: string; cliente?: string; entregable: string; sistema?: string };
export type Fase = { id: string; titulo: string; semana: string; pasos: Paso[] };
export type Reunion = { nombre: string; cuando: string; dura: string; quienes: string; agenda: string[]; sale: string };

export const PROCESO_SOCIAL: Fase[] = [
  { id: "arranque", titulo: "Arranque y accesos", semana: "Semana 1", pasos: [
    { titulo: "Reunión de arranque", que: "Objetivos del negocio, quién aprueba, canales de contacto y calendario del arranque.", cliente: "Dueño o responsable de marketing", entregable: "Cronograma del arranque" },
    { titulo: "Accesos seguros por rol", que: "Nos agregan como socios en Meta Business y TikTok Business Center, sin compartir contraseñas, y verificamos la doble autenticación.", cliente: "Dar acceso desde su cuenta", entregable: "Accesos verificados" },
    { titulo: "Inventario de cuentas", que: "Todas las cuentas de la marca: activas, abandonadas, duplicadas o creadas por terceros.", entregable: "Lista de cuentas y acciones" },
  ] },
  { id: "diagnostico", titulo: "Diagnóstico", semana: "Semana 1–2", pasos: [
    { titulo: "Auditoría de perfiles", que: "Bio, foto, enlace, destacados, botones de contacto, WhatsApp vinculado y catálogo.", entregable: "Checklist del perfil" },
    { titulo: "Resultados de los últimos 90 días", que: "Seguidores, alcance, interacción, guardados, compartidos, mejores y peores publicaciones, formatos y horarios: la línea base.", entregable: "Línea base", sistema: "Reporte de redes con métricas reales" },
    { titulo: "Auditoría de comunidad", que: "Tiempo de respuesta, preguntas que se repiten, quejas y tono de los comentarios.", entregable: "Mapa de dudas y quejas", sistema: "Lectura de comentarios" },
    { titulo: "Competencia y referentes", que: "2 o 3 competidores y 2 referentes: qué publican, qué les funciona y qué espacio dejan libre.", cliente: "Competidores que conoce", entregable: "Benchmark" },
    { titulo: "Escucha y búsqueda", que: "Qué se dice de la marca y del rubro, y con qué palabras busca el público dentro de Instagram y TikTok.", entregable: "Palabras clave y temas" },
  ] },
  { id: "estrategia", titulo: "Estrategia", semana: "Semana 2", pasos: [
    { titulo: "Objetivos y metas por etapa", que: "Descubrimiento (alcance, seguidores), consideración (guardados, compartidos, mensajes) y decisión (WhatsApp, citas, ventas), con meta a 90 días sobre la línea base.", entregable: "Tablero de metas" },
    { titulo: "Clientes ideales", que: "2 o 3 perfiles con sus problemas, objeciones, qué consumen y qué comparten.", entregable: "Fichas de cliente ideal" },
    { titulo: "Posicionamiento", que: "Propuesta de valor, mensaje central y 7 maletas de la persuasión.", cliente: "Validar la propuesta", entregable: "Mapa de marca", sistema: "Mapa de marca" },
    { titulo: "Rol de cada red", que: "Qué hace cada red: llegar a gente nueva, comunidad, venta o B2B.", entregable: "Rol por red" },
    { titulo: "Pilares y mezcla", que: "3 a 5 pilares con su función (educar, entretener, inspirar, vender) y la mezcla por etapa.", entregable: "Pilares de contenido" },
    { titulo: "Formatos, frecuencia y series", que: "Reels, carruseles e historias por red, series fijas que el público reconozca y plan de 30-60-90 días.", entregable: "Plan 30-60-90" },
  ] },
  { id: "identidad", titulo: "Identidad y operación", semana: "Semana 2–3", pasos: [
    { titulo: "Tono de voz", que: "3 adjetivos con ejemplos de así sí / así no, palabras clave, temas prohibidos, emojis y hashtags.", entregable: "Guía de tono" },
    { titulo: "Línea gráfica y perfil", que: "Plantillas, portadas, subtítulos, zonas seguras, estilo de foto y video; bio, destacados y enlace optimizados.", cliente: "Logo y manual si existen", entregable: "Kit de redes" },
    { titulo: "Manual de comunidad y crisis", que: "Respuestas tipo, tiempos, qué va a ventas y niveles de crisis con mensajes de espera; medición con UTM, píxel y WhatsApp rastreable.", entregable: "Manual de comunidad" },
  ] },
  { id: "produccion", titulo: "Producción y lanzamiento", semana: "Semana 3", pasos: [
    { titulo: "Grilla y banco de contenido", que: "Guiones con gancho, sesión de grabación o fotos, diseño y edición con aprobación pieza por pieza; arrancamos con unas dos semanas de contenido listo.", cliente: "Aprobar la grilla y las piezas", entregable: "Primer mes listo", sistema: "Planificación, Grabaciones y portal del cliente" },
  ] },
];

export const REUNIONES_SOCIAL: Reunion[] = [
  { nombre: "Arranque", cuando: "Semana 1", dura: "60–90 min", quienes: "Dueño o responsable + Distinto", agenda: ["Objetivos del negocio y del primer trimestre", "Quién aprueba y por dónde", "Accesos y cuentas", "Fechas de grabación y entregas"], sale: "Cronograma y accesos" },
  { nombre: "Presentación del diagnóstico", cuando: "Semana 1–2", dura: "60 min", quienes: "Dueño + Distinto", agenda: ["Línea base con métricas reales", "Lo que dice la comunidad", "Competencia y oportunidades"], sale: "Prioridades acordadas" },
  { nombre: "Taller de estrategia", cuando: "Semana 2", dura: "90 min", quienes: "Dueño + Distinto", agenda: ["Metas a 90 días", "Clientes ideales y posicionamiento", "Pilares, rol de cada red y series"], sale: "Estrategia aprobada" },
  { nombre: "Aprobación de identidad y manual", cuando: "Semana 2–3", dura: "60 min", quienes: "Dueño + Distinto", agenda: ["Tono de voz", "Plantillas y perfil", "Manual de comunidad y crisis"], sale: "Kit y manual aprobados" },
  { nombre: "Grilla del primer mes", cuando: "Semana 3", dura: "60 min", quienes: "Dueño + Distinto", agenda: ["Calendario y guiones", "Plan de grabación", "Flujo de aprobación en el portal"], sale: "Grilla aprobada" },
  { nombre: "Seguimiento semanal", cuando: "Cada semana (según el plan)", dura: "30 min", quienes: "Dueño + Distinto", agenda: ["Lo publicado y lo que viene", "Pendientes de aprobación"], sale: "Semana alineada" },
  { nombre: "Balance mensual", cuando: "Cada mes", dura: "60 min", quienes: "Dueño + Distinto", agenda: ["Reporte con métricas reales", "Qué funcionó y qué no", "Grilla del mes siguiente"], sale: "Reporte PDF y ajustes" },
  { nombre: "Revisión trimestral", cuando: "Cada 3 meses", dura: "90 min", quienes: "Dueño + Distinto", agenda: ["Metas contra la línea base", "Estrategia y pilares", "Manual de crisis"], sale: "Estrategia del trimestre" },
];

export const PROCESO_ADS: Fase[] = [
  { id: "diagnostico", titulo: "Diagnóstico de la cuenta", semana: "Semana 1", pasos: [
    { titulo: "Accesos y cuenta publicitaria", que: "Acceso por rol a la cuenta publicitaria, método de pago a nombre del cliente y revisión de restricciones.", cliente: "Dar acceso y registrar su tarjeta", entregable: "Cuenta lista" },
    { titulo: "Historial y anuncios activos", que: "Qué se invirtió, qué funcionó, costo por resultado y anuncios activos.", entregable: "Línea base de costos", sistema: "Panel de Publicidad" },
  ] },
  { id: "medicion", titulo: "Medición", semana: "Semana 1", pasos: [
    { titulo: "Píxel, eventos y conversiones", que: "Instalamos o revisamos el píxel de Meta, eventos de contacto o compra y Google Analytics.", entregable: "Medición verificada" },
    { titulo: "WhatsApp y enlaces rastreables", que: "Mensajes y enlaces con UTM para saber qué anuncio trajo cada cliente; si hay sistema, cruzamos anuncio con venta o cita.", entregable: "Tablero de resultados", sistema: "Reporte 360: del anuncio al cliente" },
  ] },
  { id: "estrategia", titulo: "Estrategia", semana: "Semana 1–2", pasos: [
    { titulo: "Oferta y ángulos", que: "Qué ofrecemos, a quién y con qué argumentos (7 maletas): precio, garantía, urgencia, prueba.", entregable: "Ángulos de venta" },
    { titulo: "Públicos", que: "Públicos fríos, de interacción, visitantes de la web y clientes actuales.", entregable: "Mapa de públicos" },
    { titulo: "Estructura y presupuesto", que: "Campañas de prueba y de escala, reparto del presupuesto y ritmo de gasto diario.", entregable: "Plan de campañas y presupuesto" },
  ] },
  { id: "creativos", titulo: "Creativos", semana: "Semana 2", pasos: [
    { titulo: "Piezas y variantes", que: "Videos y gráficas con distintos ganchos para probar cuál trae resultados más baratos.", cliente: "Aprobar las piezas", entregable: "Creativos aprobados" },
  ] },
  { id: "gestion", titulo: "Lanzamiento y optimización", semana: "Desde la semana 2", pasos: [
    { titulo: "Lanzamiento y aprendizaje", que: "Primeros días de aprendizaje sin cambios bruscos; luego apagamos lo que no rinde y escalamos lo que sí.", entregable: "Campañas activas" },
    { titulo: "Optimización y reporte", que: "Revisión semanal y reporte mensual: inversión, costo por resultado y retorno.", entregable: "Reporte mensual", sistema: "Historial mensual de publicidad en Reportes" },
  ] },
];

export const REUNIONES_ADS: Reunion[] = [
  { nombre: "Arranque de pauta", cuando: "Semana 1", dura: "60 min", quienes: "Dueño + Distinto", agenda: ["Objetivo y costo por resultado aceptable", "Accesos y método de pago", "Qué se mide y cómo"], sale: "Accesos y medición acordados" },
  { nombre: "Aprobación de estrategia y creativos", cuando: "Semana 2", dura: "60 min", quienes: "Dueño + Distinto", agenda: ["Oferta y ángulos", "Públicos y presupuesto", "Piezas a probar"], sale: "Campañas aprobadas" },
  { nombre: "Revisión semanal", cuando: "Cada semana", dura: "20–30 min o informe", quienes: "Distinto (y dueño si hace falta)", agenda: ["Gasto contra presupuesto", "Qué anuncio rinde", "Cambios de la semana"], sale: "Ajustes aplicados" },
  { nombre: "Reporte mensual", cuando: "Cada mes", dura: "45 min", quienes: "Dueño + Distinto", agenda: ["Inversión y resultados", "Costo por resultado y retorno", "Plan del mes siguiente"], sale: "Presupuesto del mes siguiente" },
];

/* ---------- Propuesta: servicios de Social Media y Publicidad ---------- */
export function serviciosMensuales(o: { servicios: Servicio[]; social: RespuestasSocial; ads: RespuestasAds }, uid: () => string): { services: ProposalService[]; minimo: string; notas: string[] } {
  const services: ProposalService[] = [];
  const notas: string[] = [];
  let minimo = "";
  const conSocial = o.servicios.includes("social");
  const conAds = o.servicios.includes("ads");
  const planId = conSocial ? (o.social.plan ?? planSugerido(o.social, conAds, o.servicios.includes("web"))) : null;
  if (planId) {
    const plan = PLANES.find((p) => p.id === planId);
    services.push({ ...serviceFromTemplate(planId, uid()), category: "Social Media", frequency: "mensual" });
    if (plan?.minimo) minimo = plan.minimo;
  }
  if (conAds) {
    const inv = o.ads.inversion ?? null;
    if (!incluyePauta(planId)) {
      const sug = priceSuggestion("solo-paid")!;
      services.push({ ...serviceFromTemplate("solo-paid", uid()), name: "Publicidad digital (Paid Media)", summary: "Gestión de campañas con medición de resultados.", scope: sug.scope, price: sug.price, frequency: "mensual" });
    }
    if (inv) {
      notas.push(`Inversión publicitaria sugerida: S/ ${new Intl.NumberFormat("es-PE").format(inv)} al mes, pagada por el cliente directamente a la plataforma.`);
      const fee = excessAdFee(inv);
      if (fee > 0) services.push({ ...serviceFromTemplate("personalizado", uid()), name: "Fee por inversión mayor a S/ 3,000", category: "Publicidad", summary: "10% sobre la inversión mensual que excede S/ 3,000.", price: fee, frequency: "mensual" });
      if (fee > 0) notas.push(`Como la inversión supera S/ 3,000 al mes, se suma un fee de 10% sobre el excedente: S/ ${new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2 }).format(fee)} al mes.`);
    }
  }
  return { services, minimo, notas };
}
