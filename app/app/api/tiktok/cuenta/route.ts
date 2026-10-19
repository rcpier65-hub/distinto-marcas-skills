// Estado y métricas de TikTok de una marca (GET), enlace para el cliente (POST)
// y desconexión (DELETE). Solo administración.
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { todayLima } from "@/lib/estrategia/model";
import { monthOffset, reportPeriod } from "@/lib/social-reports/model";
import { desconectar, enlaceCliente, tiktokReporte } from "@/lib/tiktok/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
async function ctx(req: Request, slug: string) {
  const a = await actor(req);
  if (!a.manager || a.client) throw new StrategyError("Solo administración puede gestionar TikTok.", 403);
  return { a, brand: await brandAccess(a, slug) };
}
export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const { brand } = await ctx(req, q.get("marca") ?? "");
    const mes = q.get("mes") ?? todayLima().slice(0, 7);
    let desde: string, hasta: string;
    try { const p = reportPeriod(mes, todayLima()); desde = p.current.start; hasta = p.current.end; }
    catch { throw new StrategyError("Elige un mes válido."); }
    if (desde === hasta) hasta = monthOffset(mes, 1) + "-01";
    return Response.json(await tiktokReporte(brand.id, desde, hasta), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const { marca } = (await req.json()) as { marca?: string };
    const { brand } = await ctx(req, marca ?? "");
    return Response.json({ enlace: enlaceCliente(brand.slug) });
  } catch (e) {
    return failure(e);
  }
}
export async function DELETE(req: Request) {
  try {
    const { brand } = await ctx(req, new URL(req.url).searchParams.get("marca") ?? "");
    await desconectar(brand.id);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
