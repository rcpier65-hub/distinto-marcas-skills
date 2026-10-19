// Estado y métricas de TikTok de una marca (GET), enlace para el cliente (POST)
// y desconexión (DELETE). Solo administración.
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { todayLima } from "@/lib/estrategia/model";
import { reportPeriod } from "@/lib/social-reports/model";
import { desconectar, enlaceCliente } from "@/lib/tiktok/server";
import { borrarGuardado, obtener } from "@/lib/social-reports/snapshots";
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
    const { a, brand } = await ctx(req, q.get("marca") ?? "");
    const mes = q.get("mes") ?? todayLima().slice(0, 7);
    try { reportPeriod(mes, todayLima()); } catch { throw new StrategyError("Elige un mes válido."); }
    const g = await obtener<Record<string, unknown>>(brand.id, mes, "tiktok", { id: a.user.id, nombre: (a.member as { nombre?: string } | null)?.nombre ?? null });
    return Response.json({ ...g.data, guardadoEn: g.fetchedAt, guardadoPor: g.fetchedBy }, { headers: { "Cache-Control": "private, no-store" } });
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
    await borrarGuardado(brand.id, "tiktok");
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
