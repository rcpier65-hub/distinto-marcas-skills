import "server-only";
/* Imágenes del PDF del reporte de redes (Pedro 11-nov-2026: «mejores
   publicaciones»). Meta y TikTok entregan enlaces firmados que vencen en días,
   así que al exportar se piden enlaces actuales y se incrustan como data URI:
   el PDF impreso, el del servidor y el correo muestran la foto aunque el enlace
   guardado ya haya vencido. Solo publicaciones de las cuentas de la marca. */
import { brandBinding, metaAccessToken } from "@/lib/meta-mcp/server";
import { portadasTikTok, type TikTokReporte } from "@/lib/tiktok/server";
import { mejoresPublicaciones } from "./mejores";
import type { PostReport } from "./model";

type J = Record<string, unknown>;
const HOSTS = [".fbcdn.net", ".cdninstagram.com", ".tiktokcdn.com", ".tiktokcdn-us.com"];
const MAX_BYTES = 3_000_000;

async function graph(path: string, params: Record<string, string>, token: string): Promise<J | null> {
  const r = await fetch(`https://graph.facebook.com/v26.0/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  const j = r ? ((await r.json().catch(() => null)) as (J & { error?: unknown }) | null) : null;
  return r?.ok && j && !j.error ? j : null;
}

/* Descarga solo desde los CDN de Meta/TikTok, sin redirecciones, y devuelve data URI. */
async function incrustar(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  let u: URL;
  try { u = new URL(url); } catch { return null; }
  if (u.protocol !== "https:" || !HOSTS.some((h) => u.hostname.endsWith(h))) return null;
  const r = await fetch(u, { cache: "no-store", redirect: "error", signal: AbortSignal.timeout(10000) }).catch(() => null);
  const tipo = r?.headers.get("content-type")?.split(";")[0] ?? "";
  if (!r?.ok || !/^image\/(jpeg|png|webp|gif)$/.test(tipo)) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  return buf.length > MAX_BYTES ? null : `data:${tipo};base64,${buf.toString("base64")}`;
}

export async function imagenesParaPdf(brandId: string, posts: PostReport | null, tiktok: TikTokReporte | null) {
  const top = mejoresPublicaciones(posts);
  const frescas: Record<string, string | null> = {};
  if (top.length) {
    const [b, token] = await Promise.all([brandBinding(brandId), metaAccessToken().catch(() => null)]);
    const ig = top.filter((p) => p.network === "instagram").map((p) => p.id);
    const fb = top.filter((p) => p.network === "facebook").map((p) => p.id);
    if (token && b?.instagram_user_id && ig.length) {
      /* v26 ya no acepta ?ids=, se consulta cada publicación por separado. */
      await Promise.all(ig.map(async (id) => {
        const m = await graph(id, { fields: "owner{id},media_type,media_url,thumbnail_url" }, token);
        if (m && (m.owner as J | undefined)?.id === b.instagram_user_id)
          frescas[id] = (m.thumbnail_url as string) || (m.media_type !== "VIDEO" ? (m.media_url as string) : null) || null;
      }));
    }
    const pagina = b?.facebook_page_id;
    const propios = fb.filter((id) => pagina && id.startsWith(`${pagina}_`));
    if (token && pagina && propios.length) {
      const p = await graph(pagina, { fields: "id,access_token" }, token);
      const pt = p?.id === pagina && typeof p.access_token === "string" ? p.access_token : null;
      if (pt) await Promise.all(propios.map(async (id) => {
        frescas[id] = ((await graph(id, { fields: "full_picture" }, pt))?.full_picture as string) || null;
      }));
    }
  }
  const tops = tiktok?.mes?.top.slice(0, 3) ?? [];
  const portadas = await portadasTikTok(brandId, tops.map((v) => v.id)).catch(() => ({} as Record<string, string>));

  /* Si no hay enlace fresco se intenta el guardado; si vencido, queda null y el
     PDF muestra el degradado de marca. */
  const imgs = await Promise.all(top.map((p) => incrustar(frescas[p.id] ?? p.image)));
  const covers = await Promise.all(tops.map((v) => incrustar(portadas[v.id] ?? v.cover)));
  const postsPdf: PostReport | null = posts && {
    ...posts,
    groups: posts.groups.map((g) => ({ ...g, posts: g.posts.filter((p) => top.some((t) => t.id === p.id)).map((p) => ({ ...p, image: imgs[top.findIndex((t) => t.id === p.id)] })) })),
  };
  const tiktokPdf: TikTokReporte | null = tiktok && tiktok.mes
    ? { ...tiktok, mes: { ...tiktok.mes, top: tiktok.mes.top.map((v, i) => (i < covers.length ? { ...v, cover: covers[i] } : v)) } }
    : tiktok;
  return { posts: postsPdf, tiktok: tiktokPdf };
}
