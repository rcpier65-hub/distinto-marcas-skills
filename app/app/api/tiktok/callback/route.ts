// TikTok vuelve aquí tras la autorización (Redirect URI registrada en la app).
import { completarConexion } from "@/lib/tiktok/server";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const base = (process.env.NEXT_PUBLIC_APP_URL || "https://app.distintostudio.com").replace(/\/$/, "");
  if (q.get("error") || !q.get("code") || !q.get("state"))
    return Response.redirect(`${base}/tiktok/listo?error=cancelado`, 302);
  try {
    const r = await completarConexion(q.get("state")!, q.get("code")!);
    const extra = new URLSearchParams({ ok: "1", marca: r.nombre ?? "", ...(r.username ? { usuario: r.username } : {}), ...(r.faltan.length ? { faltan: r.faltan.join(",") } : {}) });
    return Response.redirect(r.viaLink ? `${base}/tiktok/listo?${extra}` : `${base}/marca/${encodeURIComponent(r.slug)}/estrategia?tiktok=conectado`, 302);
  } catch (e) {
    return Response.redirect(`${base}/tiktok/listo?error=fallo&detalle=${encodeURIComponent(e instanceof Error ? e.message.slice(0, 140) : "")}`, 302);
  }
}
