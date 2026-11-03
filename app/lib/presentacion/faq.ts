import { HORARIO_EQUIPO, PLANES } from "../planes/catalogo";
import { incluyePauta, type Servicio } from "./servicios";
import { FAQ as FAQ_WEB } from "./web";

type PreguntaFrecuente = { p: string; r: string };

const METODOS: PreguntaFrecuente = {
  p: "¿Qué métodos de pago aceptan?",
  r: "Puedes pagar por transferencia o depósito a la cuenta indicada por Distinto. Si prefieres Yape, coordinamos el número autorizado antes del pago. Envíanos el comprobante para identificar el abono y el mes o servicio que estás pagando.",
};
const FECHAS: PreguntaFrecuente = {
  p: "¿Cuándo se paga la mensualidad?",
  r: "La modalidad base es 50% al iniciar el primer mes y 50% al finalizarlo. Los meses siguientes se pagan al cierre de cada mes trabajado. El importe, la fecha y cualquier acuerdo distinto quedan por escrito en tu propuesta.",
};
const HORARIO: PreguntaFrecuente = {
  p: "¿Cuál es el horario de trabajo?",
  r: `Trabajamos de ${HORARIO_EQUIPO}. En ese horario coordinamos solicitudes, revisiones y reuniones. Las grabaciones o trabajos fuera de ese horario se coordinan previamente según disponibilidad y alcance; no ofrecemos atención permanente 24/7.`,
};
const EXTRAS: PreguntaFrecuente = {
  p: "¿Cómo se solicitan los trabajos extras?",
  r: "Registra el pedido en el sistema o comunícalo por el canal acordado. Revisamos si está dentro del plan. Si es una pieza, campaña, grabación o servicio adicional, te enviamos el costo y el plazo para tu aprobación antes de comenzar. Queda registrado por separado de la mensualidad.",
};
const AJUSTES: PreguntaFrecuente = {
  p: "¿Cuántas correcciones incluye cada pieza?",
  r: "Los planes del catálogo incluyen hasta dos rondas de ajustes por pieza. Agrupa tus observaciones en cada revisión y márcalas en el sistema para conservar el historial. Un cambio de idea después de aprobar, una nueva grabación o rondas adicionales se evalúan y cotizan aparte. Prevalece el alcance de tu propuesta.",
};
const INVERSION: PreguntaFrecuente = {
  p: "¿La mensualidad incluye el dinero de los anuncios?",
  r: "La inversión publicitaria se paga por separado, directamente a Meta, Google o TikTok desde la cuenta del cliente. La gestión y el límite de inversión administrada dependen del plan. Antes de activar campañas acordamos el presupuesto y cualquier cargo adicional de gestión.",
};

function campanasSocial(planId?: string | null): PreguntaFrecuente {
  const plan = PLANES.find((p) => p.categoria === "social" && p.id === planId);
  let alcance = "La cantidad de campañas y las plataformas dependen del plan elegido y se dejan por escrito en la propuesta.";
  if (plan && !incluyePauta(plan.id)) {
    alcance = `El plan ${plan.nombre} incluye asesoría de anuncios, pero no la ejecución de campañas. Para que las gestionemos se contrata ese servicio por separado.`;
  } else if (plan) {
    // El catálogo no fija una cantidad en todos los planes: no inventarla.
    const detalle = plan.incluye.find((item) => /campaña|^Paid/i.test(item));
    alcance = `En ${plan.nombre}, el alcance del catálogo es: ${detalle ?? "gestión de pauta según la propuesta"}. La cantidad final se confirma en tu propuesta.`;
  }
  return { p: "¿Cuántas campañas publicitarias hacemos al mes?", r: `${alcance} Una campaña puede tener varios anuncios; no son lo mismo. Las campañas extra se cotizan antes de ejecutarlas.` };
}

export function preguntasFrecuentes(servicio: Servicio, planId?: string | null): PreguntaFrecuente[] {
  if (servicio === "web") return FAQ_WEB;
  if (servicio === "social") return [
    METODOS,
    FECHAS,
    { p: "¿Cómo organizamos el trabajo del mes?", r: "Acordamos objetivos y prioridades, preparamos guiones y una grilla con fechas, y coordinamos la grabación. En tu espacio de marca puedes revisar la planificación compartida, las piezas y las observaciones. Definimos un responsable de aprobación para mantener ordenadas las entregas y publicaciones." },
    HORARIO,
    campanasSocial(planId),
    EXTRAS,
    INVERSION,
    AJUSTES,
    { p: "¿Cómo reviso y apruebo el contenido?", r: "Revisa las piezas y deja los cambios en el portal para que el equipo trabaje sobre la versión correcta. Publicamos o dejamos listo para que publiques según tu plan y la aprobación acordada. Si se retrasa una aprobación, coordinamos las nuevas fechas en la grilla." },
    { p: "¿Qué necesita Distinto de mi equipo?", r: "Información actualizada de tus productos o servicios, precios, promociones, identidad de marca y accesos por rol a las cuentas. También necesitamos disponibilidad para la grabación y una persona que reúna las observaciones y apruebe el contenido." },
    { p: "¿Cómo revisamos los resultados?", r: "Revisamos el alcance, las interacciones y el desempeño de las piezas; cuando hay pauta, también su inversión y resultados. Compartimos el reporte mensual y ajustamos el siguiente plan. La frecuencia de reuniones y las redes atendidas son las de tu propuesta; no prometemos una cantidad fija de seguidores o ventas." },
  ];
  return [
    METODOS,
    FECHAS,
    { p: "¿Cómo organizamos las campañas?", r: "Acordamos el objetivo, las plataformas, el presupuesto y los creativos; verificamos accesos y medición, y presentamos la estructura para aprobación. Luego activamos, optimizamos y reportamos según el alcance contratado." },
    HORARIO,
    { p: "¿Cuántas campañas incluye la gestión?", r: "La cantidad, las plataformas y el límite de inversión administrada se confirman en tu propuesta. Una campaña puede incluir varios anuncios o variantes. Las campañas y creativos adicionales se cotizan antes de comenzar." },
    EXTRAS,
    INVERSION,
    { p: "¿Quién conserva las cuentas publicitarias?", r: "Las cuentas y el método de pago quedan a nombre del cliente. Trabajamos con accesos por rol y permisos acordados para gestionar las campañas." },
    { p: "¿Cómo medimos los resultados de la publicidad?", r: "Definimos la métrica según el objetivo: mensajes, contactos, citas o ventas cuando existe medición disponible. Revisamos inversión y costo por resultado, compartimos el reporte y proponemos ajustes. Los resultados dependen también de la oferta y la atención comercial; no se garantizan ventas." },
  ];
}
