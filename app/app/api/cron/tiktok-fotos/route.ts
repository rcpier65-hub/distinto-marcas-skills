// Foto diaria de seguidores de TikTok por marca conectada (para la gráfica de
// crecimiento: TikTok no entrega historial). Auth: Bearer CRON_SECRET.
import { todayLima } from "@/lib/estrategia/model";
import { guardarFotosDiarias } from "@/lib/tiktok/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return new Response("No autorizado", { status: 401 });
  return Response.json({ ok: true, resultados: await guardarFotosDiarias(todayLima()) });
}
