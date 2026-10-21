/* Panel de Publicidad por marca (Pedro 21-oct-2026): anuncios que corren,
   resultados del mes, ritmo del presupuesto, alertas, plan y bitácora.
   Aquí solo cálculos puros (se prueban en scripts/test-pauta.ts). */
import { z } from "zod";

/* Resultado principal que la marca compra con su pauta. */
export const RESULTADOS = {
  mensajes: { etiqueta: "Mensajes", singular: "mensaje", acciones: ["onsite_conversion.messaging_conversation_started_7d"] },
  compras: { etiqueta: "Compras", singular: "compra", acciones: ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase", "onsite_web_purchase"] },
  leads: { etiqueta: "Leads", singular: "lead", acciones: ["lead", "onsite_conversion.lead_grouped", "offsite_conversion.fb_pixel_lead"] },
  clics: { etiqueta: "Clics al enlace", singular: "clic", acciones: ["link_click"] },
} as const;
export type Resultado = keyof typeof RESULTADOS;

export const configSchema = z.object({
  presupuestoMensual: z.number().nonnegative().max(10_000_000).nullable().default(null),
  resultado: z.enum(["mensajes", "compras", "leads", "clics"]).default("mensajes"),
  metaCosto: z.number().nonnegative().max(1_000_000).nullable().default(null),
});
export type ConfigPauta = z.infer<typeof configSchema>;

type Accion = { action_type?: string; value?: string | number };
export const num = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

/* Cantidad del resultado elegido: toma la primera acción que Meta reporte de
   la lista (no se suman variantes: Meta repite la misma compra con nombres
   distintos). */
export function contarResultado(acciones: unknown, resultado: Resultado): number | null {
  if (!Array.isArray(acciones)) return null;
  for (const tipo of RESULTADOS[resultado].acciones) {
    const a = (acciones as Accion[]).find((x) => x?.action_type === tipo);
    if (a) return num(a.value);
  }
  return 0;
}

export type Metricas = {
  gasto: number | null; impresiones: number | null; alcance: number | null; frecuencia: number | null;
  clics: number | null; ctr: number | null; cpm: number | null; resultados: number | null; costoResultado: number | null;
  roas: number | null;
};
export function metricas(fila: Record<string, unknown> | null | undefined, resultado: Resultado): Metricas {
  const gasto = num(fila?.spend);
  const resultados = fila ? contarResultado(fila.actions, resultado) : null;
  const roas = Array.isArray(fila?.purchase_roas) ? num((fila!.purchase_roas as Accion[])[0]?.value) : null;
  return {
    gasto,
    impresiones: num(fila?.impressions),
    alcance: num(fila?.reach),
    frecuencia: num(fila?.frequency),
    clics: num(fila?.inline_link_clicks ?? fila?.clicks),
    ctr: num(fila?.inline_link_click_ctr ?? fila?.ctr),
    cpm: num(fila?.cpm),
    resultados,
    costoResultado: gasto !== null && resultados ? gasto / resultados : null,
    roas,
  };
}

/* Ritmo del presupuesto: gasto a la fecha vs lo esperado según los días
   transcurridos del mes (Lima), y proyección al cierre. */
export function ritmo(gasto: number | null, presupuesto: number | null, hoy: string) {
  if (gasto === null || !presupuesto) return null;
  const [y, m, d] = hoy.split("-").map(Number);
  const diasMes = new Date(Date.UTC(y, m, 0)).getUTCDate();
  /* El gasto del mes cubre días completos (hasta ayer, como el reporte de
     redes); el día 1 se mide con lo que va de hoy. */
  const transcurridos = Math.max(1, d - 1);
  const proyeccion = (gasto / transcurridos) * diasMes;
  return {
    gastado: gasto,
    presupuesto,
    usado: gasto / presupuesto,
    esperado: transcurridos / diasMes,
    proyeccion,
    desvio: proyeccion / presupuesto - 1,
    diasRestantes: diasMes - d,
  };
}

export type Anuncio = {
  id: string; nombre: string; estado: string; campana: string; conjunto: string; objetivo: string | null;
  presupuestoDiario: number | null; miniatura: string | null; texto: string | null; titulo: string | null;
  motivoRechazo: string | null; mes: Metricas;
  /* Enlace a la publicación (Instagram o Facebook), si Meta lo entrega. */
  enlace?: string | null;
};
export type Alerta = { nivel: "alta" | "media"; texto: string };

export function alertas(input: {
  anuncios: Anuncio[]; actual: Metricas; anterior: Metricas; ritmo: ReturnType<typeof ritmo>;
  metaCosto: number | null; estadoCuenta: number | null; resultado: Resultado;
}): Alerta[] {
  const out: Alerta[] = [];
  if (input.estadoCuenta !== null && input.estadoCuenta !== 1)
    out.push({ nivel: "alta", texto: "La cuenta publicitaria no está activa en Meta (revisa pagos o restricciones)." });
  const rechazados = input.anuncios.filter((a) => a.estado === "DISAPPROVED");
  if (rechazados.length) out.push({ nivel: "alta", texto: `${rechazados.length} anuncio${rechazados.length > 1 ? "s" : ""} rechazado${rechazados.length > 1 ? "s" : ""} por Meta.` });
  const conProblemas = input.anuncios.filter((a) => a.estado === "WITH_ISSUES");
  if (conProblemas.length) out.push({ nivel: "alta", texto: `${conProblemas.length} anuncio${conProblemas.length > 1 ? "s" : ""} con problemas de entrega.` });
  const cansados = input.anuncios.filter((a) => a.estado === "ACTIVE" && (a.mes.frecuencia ?? 0) >= 3.5);
  if (cansados.length) out.push({ nivel: "media", texto: `Frecuencia alta (≥3.5) en ${cansados.map((a) => `«${a.nombre}»`).slice(0, 3).join(", ")}: el público ya lo vio muchas veces, conviene renovar el creativo.` });
  const r = input.ritmo;
  if (r && r.desvio > 0.1) out.push({ nivel: "media", texto: `Al ritmo actual se gastará ${Math.round(r.desvio * 100)}% más que el presupuesto del mes.` });
  if (r && r.desvio < -0.2 && r.diasRestantes > 3) out.push({ nivel: "media", texto: `Al ritmo actual quedará sin usar el ${Math.round(-r.desvio * 100)}% del presupuesto del mes.` });
  const a = input.actual.costoResultado, b = input.anterior.costoResultado;
  if (a !== null && b !== null && b > 0 && a / b - 1 > 0.25)
    out.push({ nivel: "media", texto: `El costo por ${RESULTADOS[input.resultado].singular} subió ${Math.round((a / b - 1) * 100)}% frente al mes anterior.` });
  if (a !== null && input.metaCosto && a > input.metaCosto)
    out.push({ nivel: "media", texto: `El costo por ${RESULTADOS[input.resultado].singular} está por encima de la meta.` });
  if (!input.anuncios.some((x) => x.estado === "ACTIVE"))
    out.push({ nivel: "media", texto: "No hay anuncios activos en este momento." });
  return out;
}
