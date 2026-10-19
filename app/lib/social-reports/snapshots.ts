import "server-only";
/* Versión GUARDADA del reporte de redes (Pedro 18-oct-2026): Meta y TikTok se
   consultan solo al tocar "Actualizar"; todos ven lo mismo hasta la próxima
   actualización. Si una actualización falla, se conserva la versión anterior. */
import { createServiceClient } from "@/lib/supabase/service";
import { reportPeriod } from "./model";
import { todayLima } from "@/lib/estrategia/model";
import { socialReport, socialTrend } from "./server";
import { tiktokReporte } from "@/lib/tiktok/server";
import { metaAccessToken } from "@/lib/meta-mcp/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createServiceClient() as any;
export type Kind = "report" | "trend" | "posts" | "tiktok";
export type Guardado<T> = { data: T; fetchedAt: string; fetchedBy: string | null };

export async function borrarGuardado(brandId: string, kind: Kind) {
  await db().from("social_report_snapshots").delete().eq("brand_id", brandId).eq("kind", kind);
}

export async function leerGuardado<T>(brandId: string, month: string, kind: Kind): Promise<Guardado<T> | null> {
  const { data } = await db()
    .from("social_report_snapshots")
    .select("payload, fetched_at, fetched_by_name")
    .eq("brand_id", brandId).eq("month", month).eq("kind", kind)
    .maybeSingle();
  return data ? { data: data.payload as T, fetchedAt: data.fetched_at, fetchedBy: data.fetched_by_name ?? null } : null;
}

async function guardar(brandId: string, month: string, kind: Kind, payload: unknown, por: { id: string | null; nombre: string | null }) {
  const fetchedAt = new Date().toISOString();
  await db().from("social_report_snapshots").upsert({
    brand_id: brandId, month, kind, payload, fetched_at: fetchedAt, fetched_by: por.id, fetched_by_name: por.nombre,
  });
  return fetchedAt;
}

/* Comprueba que Meta no esté bloqueando la app antes de guardar nada. */
async function verificarMeta() {
  const token = await metaAccessToken();
  const r = await fetch("https://graph.facebook.com/v26.0/me?fields=id", { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(15000) }).catch(() => null);
  if (!r) throw Error("Meta no respondió. Intenta de nuevo en unos minutos.");
  const j = await r.json().catch(() => ({}));
  if (j.error) {
    if (j.error.code === 200 || /blocked/i.test(j.error.message ?? ""))
      throw Error("Meta bloqueó el acceso de la app de la agencia (API access blocked). Revisa la app en Meta for Developers; se mantiene la última versión guardada.");
    if (j.error.code === 190) throw Error("La autorización de Meta venció. Vuelve a conectar Meta en Configuración → Meta.");
    throw Error(`Meta respondió con error: ${j.error.message ?? "desconocido"}`);
  }
}
const conVistas = (r: unknown) => ((r as { channels?: { current: { views: number | null } }[] })?.channels ?? []).some((c) => c.current.views !== null);

/* Consulta en vivo una parte del reporte (sin la caché en memoria). */
async function enVivo(brandId: string, month: string, kind: Kind): Promise<unknown> {
  if (kind !== "tiktok") await verificarMeta();
  if (kind === "report") {
    const r = await socialReport(brandId, month, "report", { forzar: true });
    if ((r as { channels?: unknown[] }).channels?.length && !conVistas(r)) throw Error("Meta no devolvió las métricas del periodo; se mantiene la última versión guardada.");
    return r;
  }
  if (kind === "posts") return socialReport(brandId, month, kind, { forzar: true });
  if (kind === "trend") return socialTrend(brandId, month);
  const p = reportPeriod(month, todayLima());
  const r = await tiktokReporte(brandId, p.current.start, p.current.end);
  if (r.conectado && r.error) throw Error(r.error);
  return r;
}

/* Devuelve la versión guardada; si nunca se consultó, consulta y guarda. */
export async function obtener<T>(brandId: string, month: string, kind: Kind, por: { id: string | null; nombre: string | null }): Promise<Guardado<T>> {
  const g = await leerGuardado<T>(brandId, month, kind);
  if (g) return g;
  const data = (await enVivo(brandId, month, kind)) as T;
  const fetchedAt = await guardar(brandId, month, kind, data, por);
  return { data, fetchedAt, fetchedBy: por.nombre };
}

/* "Actualizar": vuelve a consultar todas las partes ya usadas del mes y guarda.
   Una parte que falla conserva su versión anterior y se informa. */
export async function actualizar(brandId: string, month: string, por: { id: string | null; nombre: string | null }) {
  const { data: existentes } = await db().from("social_report_snapshots").select("kind").eq("brand_id", brandId).eq("month", month);
  const kinds = new Set<Kind>(["report", "trend", "tiktok", ...((existentes ?? []).map((x: { kind: Kind }) => x.kind))]);
  const fallos: string[] = [];
  await Promise.all(
    [...kinds].map(async (kind) => {
      try {
        const nuevo = await enVivo(brandId, month, kind);
        /* Si Meta responde "vacío" (todas las visualizaciones sin dato) y la
           versión anterior sí tenía datos, se conserva la anterior. */
        await guardar(brandId, month, kind, nuevo, por);
      } catch (e) {
        fallos.push(`${kind === "tiktok" ? "TikTok" : kind === "trend" ? "Tendencia" : kind === "posts" ? "Publicaciones" : "Meta"}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }),
  );
  return { ok: true as const, fallos, actualizadoEn: new Date().toISOString() };
}
