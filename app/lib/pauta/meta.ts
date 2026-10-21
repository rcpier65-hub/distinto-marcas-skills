import "server-only";
/* Lectura de Meta Ads para el panel de Publicidad (solo lectura, Graph API con
   el token central de la agencia). Se llama únicamente al tocar "Actualizar";
   el resultado se guarda y todos ven esa versión (regla de Pedro, 18-oct). */
import { brandBinding, metaAccessToken } from "@/lib/meta-mcp/server";
import { StrategyError } from "@/lib/estrategia/access";
import { reportPeriod, addDays } from "@/lib/social-reports/model";
import { todayLima } from "@/lib/estrategia/model";
import { presupuestoDelMes } from "./historial";
import { alertas, metricas, num, ritmo, type Anuncio, type ConfigPauta, type Metricas, type Alerta } from "./model";

type J = Record<string, unknown>;
async function graph(path: string, params: Record<string, string>, token: string): Promise<J> {
  let r: Response;
  try {
    r = await fetch(`https://graph.facebook.com/v26.0/${path}?${new URLSearchParams(params)}`, {
      headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000),
    });
  } catch {
    throw new StrategyError("Meta no respondió. Intenta de nuevo en unos minutos.", 502);
  }
  const data = (await r.json().catch(() => ({}))) as J & { error?: { code?: number; message?: string } };
  if (data.error) {
    if (data.error.code === 200 || /blocked/i.test(data.error.message ?? "")) throw new StrategyError("Meta bloqueó el acceso de la app de la agencia. Revisa la app en Meta for Developers.", 502);
    if (data.error.code === 190) throw new StrategyError("La autorización de Meta venció. Vuelve a conectar Meta en Configuración → Meta.", 409);
    throw new StrategyError(`Meta respondió con un error: ${data.error.message ?? "desconocido"}`, 502);
  }
  if (!r.ok) throw new StrategyError("Meta no entregó los datos de la cuenta.", 502);
  return data;
}

const CAMPOS = "spend,impressions,reach,frequency,inline_link_clicks,inline_link_click_ctr,cpm,actions,purchase_roas";
const ESTADOS = ["ACTIVE", "PENDING_REVIEW", "DISAPPROVED", "WITH_ISSUES", "IN_PROCESS"];

export type DatosPauta = {
  cuenta: { id: string; nombre: string; moneda: string; estado: number | null };
  periodo: { mes: string; desde: string; hasta: string; anteriorDesde: string; anteriorHasta: string; parcial: boolean };
  actual: Metricas; anterior: Metricas;
  ritmo: ReturnType<typeof ritmo>;
  anuncios: Anuncio[];
  alertas: Alerta[];
  consultado: string;
};

export async function consultarPauta(brandId: string, config: ConfigPauta): Promise<DatosPauta> {
  const binding = await brandBinding(brandId);
  if (!binding?.ad_account_id) throw new StrategyError("Esta marca no tiene una cuenta publicitaria asignada. Elígela en Métricas → Elegir cuentas.", 409);
  const id = binding.ad_account_id;
  const token = await metaAccessToken();
  const hoy = todayLima();
  const p = reportPeriod(hoy.slice(0, 7), hoy);
  const rango = (desde: string, hastaExclusivo: string) => JSON.stringify({ since: desde, until: addDays(hastaExclusivo, -1) });
  /* Día 1 del mes: aún no hay días completos; se muestra lo de hoy. */
  const actualRango = p.current.days ? rango(p.current.start, p.current.end) : JSON.stringify({ since: hoy, until: hoy });

  const [cuenta, actualRaw, anteriorRaw, adsRaw] = await Promise.all([
    graph(`act_${id}`, { fields: "account_id,name,currency,account_status" }, token),
    graph(`act_${id}/insights`, { fields: CAMPOS, level: "account", time_range: actualRango }, token),
    p.previous.days ? graph(`act_${id}/insights`, { fields: CAMPOS, level: "account", time_range: rango(p.previous.start, p.previous.end) }, token) : Promise.resolve({ data: [] }),
    graph(`act_${id}/ads`, {
      fields: `id,name,effective_status,campaign{name,objective,daily_budget},adset{name,daily_budget},creative.thumbnail_width(720).thumbnail_height(720){thumbnail_url,image_url,title,body,instagram_permalink_url,effective_object_story_id},ad_review_feedback,insights.time_range(${actualRango}){${CAMPOS}}`,
      filtering: JSON.stringify([{ field: "effective_status", operator: "IN", value: ESTADOS }]),
      limit: "60",
    }, token),
  ]);
  if (cuenta.account_id !== id) throw new StrategyError("No se pudo consultar la cuenta publicitaria asignada.", 502);
  const fila = (x: J) => (Array.isArray(x.data) ? (x.data[0] as J | undefined) : undefined) ?? null;
  const actual = metricas(fila(actualRaw), config.resultado);
  const anterior = metricas(fila(anteriorRaw), config.resultado);
  const moneda = (v: unknown) => { const n = num(v); return n === null ? null : n / 100; };

  const anuncios: Anuncio[] = (Array.isArray(adsRaw.data) ? (adsRaw.data as J[]) : []).map((a) => {
    const camp = (a.campaign ?? {}) as J, set = (a.adset ?? {}) as J, cr = (a.creative ?? {}) as J;
    const fb = (a.ad_review_feedback ?? {}) as { global?: Record<string, string> };
    const motivo = fb.global ? Object.values(fb.global).join(" ") : null;
    return {
      id: String(a.id), nombre: String(a.name ?? "Anuncio"), estado: String(a.effective_status ?? ""),
      campana: String(camp.name ?? ""), conjunto: String(set.name ?? ""), objetivo: typeof camp.objective === "string" ? camp.objective : null,
      presupuestoDiario: moneda(set.daily_budget) ?? moneda(camp.daily_budget),
      /* image_url es la imagen original; thumbnail_url (pedido a 720 px) cubre videos y carruseles. */
      miniatura: typeof cr.image_url === "string" ? cr.image_url : typeof cr.thumbnail_url === "string" ? cr.thumbnail_url : null,
      enlace: typeof cr.instagram_permalink_url === "string" ? cr.instagram_permalink_url
        : typeof cr.effective_object_story_id === "string" ? `https://www.facebook.com/${cr.effective_object_story_id}` : null,
      titulo: typeof cr.title === "string" ? cr.title : null,
      texto: typeof cr.body === "string" ? cr.body.slice(0, 400) : null,
      motivoRechazo: motivo,
      mes: metricas(fila((a.insights ?? {}) as J), config.resultado),
    };
  }).sort((x, y) => (y.mes.gasto ?? 0) - (x.mes.gasto ?? 0));

  /* El presupuesto vive en el historial mensual (pauta_mensual), compartido con Reportes. */
  const presupuesto = (await presupuestoDelMes(brandId, p.month)) ?? config.presupuestoMensual;
  const r = ritmo(actual.gasto, presupuesto, hoy);
  return {
    cuenta: { id, nombre: String(cuenta.name ?? "Cuenta publicitaria"), moneda: String(cuenta.currency ?? ""), estado: num(cuenta.account_status) },
    periodo: { mes: p.month, desde: p.current.start, hasta: addDays(p.current.end, -1), anteriorDesde: p.previous.start, anteriorHasta: addDays(p.previous.end, -1), parcial: p.partial },
    actual, anterior, ritmo: r, anuncios,
    alertas: alertas({ anuncios, actual, anterior, ritmo: r, metaCosto: config.metaCosto, estadoCuenta: num(cuenta.account_status), resultado: config.resultado }),
    consultado: new Date().toISOString(),
  };
}
