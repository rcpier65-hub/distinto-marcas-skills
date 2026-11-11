// Datos extra del PDF del reporte de redes: mejores publicaciones y videos de
// TikTok con sus imágenes actuales incrustadas (los enlaces guardados vencen).
// Mismos permisos que el reporte. Solo lectura. Pedro 11-nov-2026.
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { obtener } from "@/lib/social-reports/snapshots";
import { imagenesParaPdf } from "@/lib/social-reports/imagenes";
import type { PostReport } from "@/lib/social-reports/model";
import type { TikTokReporte } from "@/lib/tiktok/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const a = await actor(req);
    if (!a.canViewReports || a.client) throw new StrategyError("No tienes permiso para exportar el reporte de redes.", 403);
    const q = z.object({ marca: z.string().min(1), mes: z.string().regex(/^\d{4}-\d{2}$/) }).strict()
      .parse(Object.fromEntries(new URL(req.url).searchParams));
    const brand = await brandAccess(a, q.marca);
    const por = { id: a.user.id, nombre: (a.member as { nombre?: string } | null)?.nombre ?? null };
    const [posts, tiktok] = await Promise.all([
      obtener<PostReport>(brand.id, q.mes, "posts", por).then((g) => g.data).catch(() => null),
      obtener<TikTokReporte>(brand.id, q.mes, "tiktok", por).then((g) => g.data).catch(() => null),
    ]);
    return Response.json(await imagenesParaPdf(brand.id, posts, tiktok), { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return failure(e);
  }
}
