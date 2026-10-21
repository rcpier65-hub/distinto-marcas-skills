/* Reporte 360 Oral Beauty (Pedro 21-oct-2026): la app aporta el gasto de Meta
   por anuncio y el sistema de la clínica el embudo de WhatsApp; se unen por el
   ID del anuncio. Puro (se prueba en scripts/test-oral-beauty-360.ts). */
import { z } from "zod";

export const SEDES = [
  { sede: "LIMA", id_empresa: 6, cuenta: "8397325756961575", nombre: "Oral Beauty" },
  { sede: "RIOJA", id_empresa: 20, cuenta: "2044444659791967", nombre: "Cojal" },
] as const;
export type Sede = (typeof SEDES)[number]["sede"];

const entero = z.number().int().min(0).max(10_000_000);
/* Respuesta de la clínica: solo números agregados por anuncio. `.strict()`
   rechaza cualquier campo extra, así no pueden viajar datos personales. */
export const filaEmbudo = z.object({
  id_empresa: z.union([z.literal(6), z.literal(20)]),
  sede: z.enum(["LIMA", "RIOJA"]),
  ad_id: z.string().regex(/^\d{1,30}$/),
  titulo: z.string().max(300).nullable(),
  url: z.string().max(500).nullable(),
  escribieron: entero, personas: entero, ficha: entero, cita: entero, asistio: entero,
  presupuesto: entero, inicio: entero, termino: entero,
  cobrado_pen: z.number().min(0).max(1_000_000_000),
}).strict();
export type FilaEmbudo = z.infer<typeof filaEmbudo>;
export const respuestaClinica = z.object({
  mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  generado_at: z.string().max(40),
  gasto_guardado: entero,
  filas: z.array(filaEmbudo).max(2000),
}).strict();

export type GastoAnuncio = {
  sede: Sede; id_empresa: number; ad_id: string; ad_name: string; campaign_id: string; campaign_name: string; adset_name: string;
  gasto: number; moneda: string; gasto_pen: number; impresiones: number; clics: number; resultados: number;
};

export type Fila360 = {
  sede: Sede; ad_id: string; nombre: string; campana: string; gasto_pen: number;
  escribieron: number; cita: number; asistio: number; inicio: number; termino: number; cobrado_pen: number;
  costoChat: number | null; costoCita: number | null; costoAsistencia: number | null; costoInicio: number | null; retorno: number | null;
  alerta: "gasto-sin-chats" | "chats-sin-gasto" | null;
};

const div = (a: number, b: number) => (b > 0 && a > 0 ? a / b : null);
function costos<T extends { gasto_pen: number; escribieron: number; cita: number; asistio: number; inicio: number; cobrado_pen: number }>(x: T) {
  return {
    costoChat: div(x.gasto_pen, x.escribieron), costoCita: div(x.gasto_pen, x.cita), costoAsistencia: div(x.gasto_pen, x.asistio),
    costoInicio: div(x.gasto_pen, x.inicio), retorno: x.gasto_pen > 0 ? x.cobrado_pen / x.gasto_pen : null,
  };
}

export function combinar(gasto: GastoAnuncio[], embudo: FilaEmbudo[]): Fila360[] {
  const ids = new Set([...gasto.map((g) => g.ad_id), ...embudo.map((e) => e.ad_id)]);
  const out: Fila360[] = [];
  for (const id of ids) {
    const g = gasto.find((x) => x.ad_id === id);
    const e = embudo.find((x) => x.ad_id === id);
    const base = {
      sede: (g?.sede ?? e!.sede) as Sede, ad_id: id,
      nombre: g?.ad_name || e?.titulo || `Anuncio ${id}`, campana: g?.campaign_name || "Sin campaña (cuenta anterior)",
      gasto_pen: Math.round((g?.gasto_pen ?? 0) * 100) / 100,
      escribieron: e?.escribieron ?? 0, cita: e?.cita ?? 0, asistio: e?.asistio ?? 0, inicio: e?.inicio ?? 0, termino: e?.termino ?? 0, cobrado_pen: e?.cobrado_pen ?? 0,
    };
    out.push({ ...base, ...costos(base), alerta: base.gasto_pen > 0 && base.escribieron === 0 ? "gasto-sin-chats" : base.gasto_pen === 0 && base.escribieron > 0 ? "chats-sin-gasto" : null });
  }
  return out.sort((a, b) => b.gasto_pen - a.gasto_pen || b.escribieron - a.escribieron);
}

export function totales(filas: Fila360[]) {
  const s = (k: "gasto_pen" | "escribieron" | "cita" | "asistio" | "inicio" | "termino" | "cobrado_pen") => filas.reduce((a, f) => a + f[k], 0);
  const t = { gasto_pen: Math.round(s("gasto_pen") * 100) / 100, escribieron: s("escribieron"), cita: s("cita"), asistio: s("asistio"), inicio: s("inicio"), termino: s("termino"), cobrado_pen: s("cobrado_pen") };
  return { ...t, ...costos(t) };
}
