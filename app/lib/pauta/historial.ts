import "server-only";
/* Historial mensual de publicidad (tabla pauta_mensual): presupuesto por mes
   y métricas de Meta por mes. Lo comparten el panel de Publicidad (presupuesto
   del mes actual) y el módulo Reportes (historial completo). Pedro 21-oct-2026. */
import { createServiceClient } from "@/lib/supabase/service";
import { brandBinding, metaAccessToken } from "@/lib/meta-mcp/server";
import { StrategyError } from "@/lib/estrategia/access";
import { todayLima } from "@/lib/estrategia/model";
import { addDays, monthOffset } from "@/lib/social-reports/model";
import { metricas, type Metricas, type Resultado } from "./model";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createServiceClient() as any;
const CAMPOS = "spend,impressions,reach,frequency,inline_link_clicks,inline_link_click_ctr,cpm,actions,purchase_roas";

export type MesPauta = {
  mes: string;
  presupuesto: number | null;
  moneda: string | null;
  resultado: Resultado | null;
  metricas: Metricas | null;
  metricasAt: string | null;
};

export async function presupuestoDelMes(marcaId: string, mes: string): Promise<number | null> {
  const { data } = await db().from("pauta_mensual").select("presupuesto").eq("marca_id", marcaId).eq("mes", mes).maybeSingle();
  return data?.presupuesto == null ? null : Number(data.presupuesto);
}

export async function guardarPresupuesto(marcaId: string, mes: string, presupuesto: number | null) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(mes)) throw new StrategyError("Mes inválido.");
  const { error } = await db().from("pauta_mensual").upsert({ marca_id: marcaId, mes, presupuesto, updated_at: new Date().toISOString() }, { onConflict: "marca_id,mes" });
  if (error) throw new Error(error.message);
}

export async function historialDeMarcas(marcaIds: string[]): Promise<Record<string, MesPauta[]>> {
  if (!marcaIds.length) return {};
  const { data, error } = await db().from("pauta_mensual").select("marca_id,mes,presupuesto,moneda,resultado,metricas,metricas_at").in("marca_id", marcaIds).order("mes", { ascending: true });
  if (error) return {};
  const out: Record<string, MesPauta[]> = {};
  for (const r of data ?? []) {
    (out[r.marca_id] ??= []).push({
      mes: r.mes, presupuesto: r.presupuesto == null ? null : Number(r.presupuesto), moneda: r.moneda ?? null,
      resultado: r.resultado ?? null, metricas: r.metricas ?? null, metricasAt: r.metricas_at ?? null,
    });
  }
  return out;
}

/* Trae de Meta las métricas de los últimos 12 meses (hasta ayer) y las guarda
   mes por mes, sin tocar los presupuestos. Solo se llama al tocar «Actualizar». */
export async function actualizarHistorial(marcaId: string, resultado: Resultado): Promise<number> {
  const binding = await brandBinding(marcaId);
  if (!binding?.ad_account_id) throw new StrategyError("Esta marca no tiene una cuenta publicitaria asignada.", 409);
  const token = await metaAccessToken();
  const hoy = todayLima();
  const hasta = addDays(hoy, -1);
  const desde = monthOffset(hoy.slice(0, 7), -11) + "-01";
  if (hasta < desde) return 0;
  const id = binding.ad_account_id;
  const q = new URLSearchParams({ level: "account", fields: `${CAMPOS},account_currency`, time_increment: "monthly", time_range: JSON.stringify({ since: desde, until: hasta }), limit: "24" });
  const r = await fetch(`https://graph.facebook.com/v26.0/act_${id}/insights?${q}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(20000) }).catch(() => null);
  const j = r ? await r.json().catch(() => null) : null;
  if (!r?.ok || !j || j.error || !Array.isArray(j.data)) throw new StrategyError("Meta no entregó el historial mensual de la cuenta.", 502);
  const ahora = new Date().toISOString();
  const filas = (j.data as Record<string, unknown>[])
    .filter((f) => typeof f.date_start === "string")
    .map((f) => ({
      marca_id: marcaId, mes: String(f.date_start).slice(0, 7), moneda: typeof f.account_currency === "string" ? f.account_currency : null,
      resultado, metricas: metricas(f, resultado), metricas_at: ahora, updated_at: ahora,
    }));
  if (!filas.length) return 0;
  const { error } = await db().from("pauta_mensual").upsert(filas, { onConflict: "marca_id,mes" });
  if (error) throw new Error(error.message);
  return filas.length;
}
