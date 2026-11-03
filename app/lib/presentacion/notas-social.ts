import type { Servicio } from "./servicios";
import { GUIA_NOTAS } from "./web";

/* Preguntas abiertas para conducir cada etapa de una reunión de Social Media.
   Cambiar los servicios solo cambia la guía; nunca reescribe las notas guardadas. */
const GUIA_SOCIAL: string[][] = [
  [
    "¿Qué vende tu marca y qué productos o servicios quieres impulsar en redes?",
    "¿Por qué quieres trabajar tus redes justo ahora?",
    "¿En qué redes tienes presencia y quién las administra hoy?",
    "¿A qué público quieres llegar y en qué ciudades o zonas?",
    "¿Qué quieres conseguir: reconocimiento, comunidad, consultas, citas o ventas?",
    "Muéstranos tus perfiles y dos marcas de referencia: ¿qué te gusta de su contenido?",
  ],
  [
    "¿Qué diferencia a tu marca y por qué te eligen tus clientes?",
    "¿Qué dudas u objeciones tienen tus clientes antes de comprar?",
    "¿Qué publicaciones han generado mejores resultados y cuáles no funcionaron?",
    "¿Qué tono y estilo quieres para tu marca? ¿Qué temas debemos evitar?",
    "¿Qué promociones, lanzamientos o fechas importantes vienen este mes?",
    "¿Qué resultados tienes hoy y qué te gustaría mejorar en los próximos tres meses?",
  ],
  [
    "¿Quién compartirá la información y aprobará los guiones, diseños y videos?",
    "¿Con cuánto tiempo pueden revisar la grilla y reunir sus observaciones?",
    "¿Dónde podemos grabar, quién participará y qué fechas tienen disponibles?",
    "¿Tienen logo, fotos, videos y acceso administrativo a las redes de la marca?",
    "¿Quién responderá los mensajes y dará seguimiento a las consultas de posibles clientes?",
  ],
  [
    "¿Qué dudas quedan sobre las publicaciones, grabaciones o correcciones del plan?",
    "¿Qué necesitan coordinar dentro de nuestro horario de lunes a viernes, de 8 a. m. a 5 p. m.?",
    "¿Qué método y fecha de pago quieren acordar para la mensualidad?",
    "¿Necesitan contenido, campañas o trabajos extras para cotizarlos por separado?",
  ],
  [
    "¿Qué redes vamos a trabajar y qué formatos priorizamos: reels, historias, posts o carruseles?",
    "¿Cuántos videos, diseños y sesiones de grabación acordamos según el plan elegido?",
    "¿Incluiremos gestión de anuncios? ¿Cuántas campañas contempla el plan?",
    "¿Qué presupuesto mensual destinarán a anuncios, aparte del servicio de la agencia?",
    "¿Qué indicadores revisaremos juntos: alcance, interacción, consultas, citas o ventas?",
  ],
  [
    "¿Qué plan, entregables y extras dejamos acordados para la propuesta?",
    "¿Quién aprobará la propuesta y cuándo quieren comenzar?",
    "¿Cuándo hacemos la reunión de arranque y la primera grabación?",
    "¿Cómo prefieren recibir la propuesta y confirmar el calendario de pagos?",
  ],
];

export function guiaNotasPorServicio(servicios: Servicio[], etapa: number): string[] {
  const social = servicios.includes("social");
  const web = servicios.includes("web");
  return [...new Set([
    ...(!social || web ? GUIA_NOTAS[etapa] ?? [] : []),
    ...(social ? GUIA_SOCIAL[etapa] ?? [] : []),
  ])];
}
