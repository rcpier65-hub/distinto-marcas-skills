// Enlace firmado (7 días) para que el CLIENTE conecte el TikTok de su marca sin
// entrar a la app. Sin firma válida no hace nada. Pedro 18-oct-2026.
import { createServiceClient } from "@/lib/supabase/service";
import { enlaceValido, urlAutorizacion } from "@/lib/tiktok/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params, q = new URL(req.url).searchParams;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://app.distintostudio.com").replace(/\/$/, "");
  if (!enlaceValido(slug, Number(q.get("exp")), q.get("f") ?? ""))
    return Response.redirect(`${base}/tiktok/listo?error=enlace`, 302);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any;
  const { data: marca } = await service.from("marcas").select("id, activa").eq("slug", slug).maybeSingle();
  if (!marca || marca.activa === false) return Response.redirect(`${base}/tiktok/listo?error=enlace`, 302);
  /* Enlace de un solo uso en la práctica: si la marca ya tiene TikTok conectado,
     no sirve (para cambiar la cuenta, administración desconecta primero). */
  const { data: ya } = await service.from("tiktok_brand_accounts").select("brand_id").eq("brand_id", marca.id).maybeSingle();
  if (ya) return Response.redirect(`${base}/tiktok/listo?error=conectada`, 302);
  try {
    return Response.redirect(await urlAutorizacion(marca.id, null, true), 302);
  } catch {
    return Response.redirect(`${base}/tiktok/listo?error=config`, 302);
  }
}
