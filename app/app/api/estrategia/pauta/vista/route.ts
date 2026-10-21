// Vista previa de un anuncio (el «ojito» del panel de Publicidad). Pide a Meta
// el iframe oficial de vista previa, solo si el anuncio pertenece a la cuenta
// publicitaria de la marca. Pedro 21-oct-2026.
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { brandBinding, metaAccessToken } from "@/lib/meta-mcp/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FORMATOS = new Set(["MOBILE_FEED_STANDARD", "INSTAGRAM_STANDARD", "INSTAGRAM_STORY", "INSTAGRAM_REELS", "DESKTOP_FEED_STANDARD"]);

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    const a = await actor(req);
    const brand = await brandAccess(a, q.get("marca") ?? "");
    const ad = q.get("anuncio") ?? "";
    const formato = q.get("formato") ?? "INSTAGRAM_STANDARD";
    if (!/^\d{5,25}$/.test(ad) || !FORMATOS.has(formato)) throw new StrategyError("Anuncio inválido.");
    const binding = await brandBinding(brand.id);
    if (!binding?.ad_account_id) throw new StrategyError("La marca no tiene cuenta publicitaria.", 409);
    const token = await metaAccessToken();
    const g = async (path: string, params: Record<string, string>) => {
      const r = await fetch(`https://graph.facebook.com/v26.0/${path}?${new URLSearchParams(params)}`, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000) }).catch(() => null);
      const j = r ? await r.json().catch(() => null) : null;
      if (!r?.ok || !j || j.error) throw new StrategyError("Meta no entregó la vista previa de este anuncio.", 502);
      return j;
    };
    const info = await g(ad, { fields: "account_id" });
    if (String(info.account_id) !== binding.ad_account_id) throw new StrategyError("Este anuncio no es de la cuenta de la marca.", 403);
    const prev = await g(`${ad}/previews`, { ad_format: formato });
    const html = String(prev.data?.[0]?.body ?? "");
    const src = html.match(/src="([^"]+)"/)?.[1]?.replace(/&amp;/g, "&") ?? "";
    /* Solo se acepta el iframe oficial de Facebook. */
    if (!/^https:\/\/www\.facebook\.com\/ads\/api\/preview_iframe\.php\?/.test(src)) throw new StrategyError("Meta no tiene vista previa en este formato.", 404);
    return Response.json({ src }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return failure(e);
  }
}
