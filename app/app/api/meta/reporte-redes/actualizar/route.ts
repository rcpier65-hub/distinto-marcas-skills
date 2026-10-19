// "Actualizar" del reporte de redes: vuelve a consultar Meta y TikTok y guarda
// la nueva versión para todos (solo administración). Pedro 18-oct-2026.
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { todayLima } from "@/lib/estrategia/model";
import { reportPeriod } from "@/lib/social-reports/model";
import { actualizar } from "@/lib/social-reports/snapshots";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;
export async function POST(req: Request) {
  try {
    const a = await actor(req);
    if (!a.manager || a.client) throw new StrategyError("Solo administración puede actualizar el reporte.", 403);
    const q = z.object({ marca: z.string().min(1), mes: z.string() }).strict().parse(await req.json());
    try { reportPeriod(q.mes, todayLima()); } catch { throw new StrategyError("Elige un mes válido."); }
    const brand = await brandAccess(a, q.marca);
    return Response.json(await actualizar(brand.id, q.mes, { id: a.user.id, nombre: (a.member as { nombre?: string } | null)?.nombre ?? null }));
  } catch (e) {
    return failure(e);
  }
}
