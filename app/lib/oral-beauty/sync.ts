import "server-only";
/* Sincronización del reporte 360 Oral Beauty (Pedro 21-oct-2026). Solo corre
   cuando alguien pulsa «Actualizar»: trae el gasto por anuncio de Meta de las
   dos cuentas, lo pasa a soles (SUNAT), hace UN envío saliente a la clínica y
   guarda el embudo que devuelve. La URL de destino viene del entorno, nunca
   del navegador. */
import { createServiceClient } from "@/lib/supabase/service";
import { metaAccessToken } from "@/lib/meta-mcp/server";
import { StrategyError } from "@/lib/estrategia/access";
import { tipoCambioSunatMes } from "@/lib/integrations/tipo-cambio";
import { todayLima } from "@/lib/estrategia/model";
import { addDays, monthOffset } from "@/lib/social-reports/model";
import { SEDES, respuestaClinica, type FilaEmbudo, type GastoAnuncio } from "./modelo360";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createServiceClient() as any;
const num = (v: unknown) => { const n = Number(v); return Number.isFinite(n) ? n : 0; };

export type Reporte360 = { mes: string; gasto: GastoAnuncio[]; embudo: FilaEmbudo[]; tipoCambio: number | null; embudoGeneradoAt: string | null; actualizadoAt: string; actualizadoPor: string | null };

export async function leer360(mes: string): Promise<Reporte360 | null> {
  const { data } = await db().from("ob_reporte_360").select("*").eq("mes", mes).maybeSingle();
  if (!data) return null;
  return { mes: data.mes, gasto: data.gasto ?? [], embudo: data.embudo ?? [], tipoCambio: data.tipo_cambio == null ? null : Number(data.tipo_cambio), embudoGeneradoAt: data.embudo_generado_at ?? null, actualizadoAt: data.actualizado_at, actualizadoPor: data.actualizado_por ?? null };
}

export async function gastoMeta(mes: string, tc: number): Promise<GastoAnuncio[]> {
  const token = await metaAccessToken();
  const hoy = todayLima();
  const fin = addDays(monthOffset(mes, 1) + "-01", -1);
  const hasta = fin < hoy ? fin : hoy;
  const out: GastoAnuncio[] = [];
  for (const s of SEDES) {
    const cuenta = await fetch(`https://graph.facebook.com/v26.0/act_${s.cuenta}?fields=account_id,currency`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) }).then((r) => r.json()).catch(() => null);
    if (!cuenta || cuenta.error || cuenta.account_id !== s.cuenta) throw new StrategyError(`Meta no entregó la cuenta de ${s.sede}. Revisa el acceso a ${s.cuenta}.`, 502);
    const moneda = String(cuenta.currency);
    let url: string | null = `https://graph.facebook.com/v26.0/act_${s.cuenta}/insights?${new URLSearchParams({
      level: "ad", limit: "500", time_range: JSON.stringify({ since: `${mes}-01`, until: hasta }),
      fields: "ad_id,ad_name,adset_name,campaign_id,campaign_name,spend,impressions,inline_link_clicks,actions",
    })}`;
    for (let page = 0; url && page < 10; page++) {
      const j = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(20000) }).then((r) => r.json()).catch(() => null);
      if (!j || j.error || !Array.isArray(j.data)) throw new StrategyError(`Meta no entregó el gasto por anuncio de ${s.sede}.`, 502);
      for (const f of j.data) {
        const gasto = num(f.spend);
        const msj = (f.actions ?? []).find((a: { action_type: string }) => a.action_type === "onsite_conversion.messaging_conversation_started_7d");
        out.push({
          sede: s.sede, id_empresa: s.id_empresa, ad_id: String(f.ad_id), ad_name: String(f.ad_name ?? ""), adset_name: String(f.adset_name ?? ""),
          campaign_id: String(f.campaign_id ?? ""), campaign_name: String(f.campaign_name ?? ""),
          gasto, moneda, gasto_pen: Math.round((moneda === "USD" ? gasto * tc : gasto) * 100) / 100,
          impresiones: num(f.impressions), clics: num(f.inline_link_clicks), resultados: num(msj?.value),
        });
      }
      /* Solo se sigue la paginación de graph.facebook.com. */
      const next: unknown = j.paging?.next;
      url = typeof next === "string" && next.startsWith("https://graph.facebook.com/") ? next : null;
    }
  }
  return out;
}

async function registrar(e: { mes: string; por: string | null; ok: boolean; status?: number | null; filas?: number | null; ms: number; error?: string | null }) {
  await db().from("ob_sync_log").insert({ mes: e.mes, por: e.por, ok: e.ok, status: e.status ?? null, filas: e.filas ?? null, ms: e.ms, error: e.error?.slice(0, 300) ?? null });
}

export async function actualizar360(mes: string, por: string | null): Promise<Reporte360> {
  /* Límite: una actualización cada 30 s (protege a Meta y a la clínica). */
  const { data: ultima } = await db().from("ob_sync_log").select("at").order("at", { ascending: false }).limit(1).maybeSingle();
  if (ultima && Date.now() - Date.parse(ultima.at) < 30_000) throw new StrategyError("Se acaba de actualizar. Espera unos segundos e intenta de nuevo.", 429);

  const url = process.env.OB_SYNC_URL ?? "";
  const token = process.env.INTEGRACION_OB_TOKEN ?? "";
  if (!/^https:\/\/[a-z0-9.-]+\.[a-z]{2,}\//i.test(url) || token.length < 32) throw new StrategyError("La conexión con la clínica no está configurada en el servidor.", 503);

  const inicio = Date.now();
  const tc = (await tipoCambioSunatMes(mes)) ?? (await tipoCambioSunatMes(monthOffset(mes, -1)));
  if (!tc) throw new StrategyError("No se pudo obtener el tipo de cambio SUNAT del mes.", 502);
  const gasto = await gastoMeta(mes, tc);

  /* Si la clínica falla, el gasto igual queda guardado (el embudo anterior se conserva). */
  const soloGasto = async () => { await db().from("ob_reporte_360").upsert({ mes, gasto, tipo_cambio: tc, actualizado_at: new Date().toISOString(), actualizado_por: por }); };
  let respuesta: Response | null = null;
  try {
    respuesta = await fetch(url, {
      method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(30_000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ mes, tipo_cambio_usd_pen: tc, anuncios: gasto.map((g) => ({ id_empresa: g.id_empresa, ad_id: g.ad_id, gasto: g.gasto, moneda: g.moneda, gasto_pen: g.gasto_pen })) }),
    });
  } catch {
    await soloGasto();
    await registrar({ mes, por, ok: false, ms: Date.now() - inicio, error: "sin respuesta / timeout" });
    throw new StrategyError("La clínica no respondió en 30 segundos. Se guardó el gasto de Meta; el embudo se mantiene en su última versión. Intenta de nuevo más tarde.", 504);
  }
  if (!respuesta.ok) {
    await soloGasto();
    await registrar({ mes, por, ok: false, status: respuesta.status, ms: Date.now() - inicio, error: `HTTP ${respuesta.status}` });
    throw new StrategyError(`La clínica no respondió correctamente (código ${respuesta.status}). Se guardó el gasto de Meta; el embudo se mantiene en su última versión.`, 502);
  }
  const texto = await respuesta.text();
  if (texto.length > 2_000_000) throw new StrategyError("La respuesta de la clínica es demasiado grande.", 502);
  let cuerpo: unknown = null;
  try { cuerpo = JSON.parse(texto); } catch { /* se valida abajo */ }
  const r = respuestaClinica.safeParse(cuerpo);
  if (!r.success || r.data.mes !== mes) {
    await soloGasto();
    await registrar({ mes, por, ok: false, status: respuesta.status, ms: Date.now() - inicio, error: "respuesta con formato inválido" });
    throw new StrategyError("La clínica respondió con un formato que no se reconoce. Se guardó solo el gasto de Meta.", 502);
  }
  const fila = { mes, gasto, embudo: r.data.filas, tipo_cambio: tc, embudo_generado_at: r.data.generado_at, actualizado_at: new Date().toISOString(), actualizado_por: por };
  const { error } = await db().from("ob_reporte_360").upsert(fila);
  if (error) throw new Error(error.message);
  await registrar({ mes, por, ok: true, status: respuesta.status, filas: r.data.filas.length, ms: Date.now() - inicio });
  return { mes, gasto, embudo: r.data.filas, tipoCambio: tc, embudoGeneradoAt: r.data.generado_at, actualizadoAt: fila.actualizado_at, actualizadoPor: por };
}
