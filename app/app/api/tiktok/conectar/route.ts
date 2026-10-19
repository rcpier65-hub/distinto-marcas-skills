// Inicia la conexión de TikTok de una marca desde la app (solo administración).
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { urlAutorizacion } from "@/lib/tiktok/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const a = await actor(req);
    if (!a.manager || a.client) throw new StrategyError("Solo administración puede conectar TikTok.", 403);
    const brand = await brandAccess(a, new URL(req.url).searchParams.get("marca") ?? "");
    return Response.redirect(await urlAutorizacion(brand.id, a.user.id, false), 302);
  } catch (e) {
    return failure(e);
  }
}
