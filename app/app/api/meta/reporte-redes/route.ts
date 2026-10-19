import { z } from "zod";
import {
  actor,
  brandAccess,
  failure,
  StrategyError,
} from "@/lib/estrategia/access";
import { obtener, type Kind } from "@/lib/social-reports/snapshots";
import { reportPeriod } from "@/lib/social-reports/model";
import { todayLima } from "@/lib/estrategia/model";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const a = await actor(req);
    if (!a.manager || a.client)
      throw new StrategyError(
        "Solo administración puede consultar el reporte de redes.",
        403,
      );
    const q = z
      .object({
        marca: z.string().min(1),
        mes: z.string(),
        detalle: z.enum(["report", "posts", "tendencia"]).default("report"),
      })
      .strict()
      .parse(Object.fromEntries(new URL(req.url).searchParams));
    try {
      reportPeriod(q.mes, todayLima());
    } catch {
      throw new StrategyError("Elige un mes válido de los últimos dos años.");
    }
    const brand = await brandAccess(a, q.marca);
    const kind: Kind = q.detalle === "tendencia" ? "trend" : q.detalle;
    const g = await obtener<Record<string, unknown>>(brand.id, q.mes, kind, { id: a.user.id, nombre: (a.member as { nombre?: string } | null)?.nombre ?? null });
    const body = { ...g.data, guardadoEn: g.fetchedAt, guardadoPor: g.fetchedBy };
    return Response.json(body, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
