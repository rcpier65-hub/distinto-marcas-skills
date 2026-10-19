import "server-only";
/* Conexión con TikTok (Login Kit + Display API v2) por marca. Cada cuenta de
   TikTok autoriza una vez; guardamos sus tokens cifrados y los renovamos solos
   (el de acceso dura 24 h, el de renovación ~1 año). Solo lectura: perfil,
   estadísticas y videos públicos. Pedro 18-oct-2026. */
import { createHmac, timingSafeEqual } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/service";
import { decrypt, encrypt, nonce } from "@/lib/meta-mcp/crypto";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createServiceClient() as any;
const API = "https://open.tiktokapis.com/v2";
export const TIKTOK_SCOPES = "user.info.basic,user.info.profile,user.info.stats,video.list";
const appUrl = () => (process.env.NEXT_PUBLIC_APP_URL || "https://app.distintostudio.com").replace(/\/$/, "");
export const redirectUri = () => `${appUrl()}/api/tiktok/callback`;
export const tiktokConfigurado = () => Boolean(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
const ctx = (brandId: string, kind: string) => `tiktok:${kind}:${brandId}`;

/* ── Enlace firmado para que el CLIENTE conecte su cuenta sin entrar a la app ── */
function secreto() {
  const s = process.env.CRON_SECRET;
  if (!s) throw Error("Falta CRON_SECRET en el servidor.");
  return s;
}
export function firmaEnlace(slug: string, exp: number) {
  return createHmac("sha256", secreto()).update(`tiktok-conectar|${slug}|${exp}`).digest("hex");
}
export function enlaceValido(slug: string, exp: number, f: string) {
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const a = Buffer.from(firmaEnlace(slug, exp)), b = Buffer.from(f || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
export function enlaceCliente(slug: string, dias = 3) {
  const exp = Date.now() + dias * 86400000;
  return `${appUrl()}/tiktok/conectar/${encodeURIComponent(slug)}?${new URLSearchParams({ exp: String(exp), f: firmaEnlace(slug, exp) })}`;
}

/* ── OAuth ── */
export async function urlAutorizacion(brandId: string, createdBy: string | null, viaLink: boolean) {
  if (!tiktokConfigurado()) throw Error("TikTok aún no está configurado en el servidor.");
  const state = nonce();
  const { error } = await db().from("tiktok_oauth_states").insert({
    state, brand_id: brandId, created_by: createdBy, via_link: viaLink, expires_at: new Date(Date.now() + 15 * 60000).toISOString(),
  });
  if (error) throw Error("No se pudo iniciar la conexión con TikTok.");
  return `https://www.tiktok.com/v2/auth/authorize/?${new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY!, scope: TIKTOK_SCOPES, response_type: "code", redirect_uri: redirectUri(), state,
  })}`;
}

type Tokens = { access_token: string; refresh_token: string; expires_in: number; refresh_expires_in: number; open_id: string; scope: string };
async function token(params: Record<string, string>): Promise<Tokens> {
  const r = await fetch(`${API}/oauth/token/`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cache-Control": "no-cache" },
    body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!, ...params }),
    cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) throw Error(j.error_description || j.error || "TikTok rechazó la autorización.");
  return j as Tokens;
}

/* Callback: valida el state (un solo uso, 15 min) y guarda la cuenta. */
export async function completarConexion(state: string, code: string) {
  const { data: st } = await db().from("tiktok_oauth_states").select("*").eq("state", state).maybeSingle();
  if (!st || st.used_at || Date.parse(st.expires_at) < Date.now()) throw Error("El enlace de conexión venció. Vuelve a intentarlo.");
  await db().from("tiktok_oauth_states").update({ used_at: new Date().toISOString() }).eq("state", state);
  const t = await token({ code, grant_type: "authorization_code", redirect_uri: redirectUri() });
  /* Un enlace para el cliente NUNCA reemplaza una cuenta ya conectada: para
     cambiarla, administración debe desconectarla primero desde la app. */
  if (st.via_link) {
    const { data: previa } = await db().from("tiktok_brand_accounts").select("open_id").eq("brand_id", st.brand_id).maybeSingle();
    if (previa && previa.open_id !== t.open_id) throw Error("Esta marca ya tiene otra cuenta de TikTok conectada. Pide a Distinto Studio que la desconecte primero.");
  }
  const faltan = TIKTOK_SCOPES.split(",").filter((s) => !t.scope.split(",").includes(s));
  const perfil = await userInfo(t.access_token).catch(() => null);
  const { error } = await db().from("tiktok_brand_accounts").upsert({
    brand_id: st.brand_id,
    open_id: t.open_id,
    username: perfil?.username ?? null,
    display_name: perfil?.display_name ?? null,
    avatar_url: perfil?.avatar_url ?? null,
    scope: t.scope,
    access_token_enc: encrypt(t.access_token, ctx(st.brand_id, "access")),
    refresh_token_enc: encrypt(t.refresh_token, ctx(st.brand_id, "refresh")),
    access_expires_at: new Date(Date.now() + (t.expires_in - 120) * 1000).toISOString(),
    refresh_expires_at: new Date(Date.now() + t.refresh_expires_in * 1000).toISOString(),
    connected_by: st.created_by,
    connected_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) throw Error("No se pudo guardar la cuenta de TikTok.");
  // Primera foto de seguidores (desde aquí se mide el crecimiento).
  if (perfil) {
    const hoy = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Lima" }).format(new Date());
    await db().from("tiktok_follower_snapshots").upsert({ brand_id: st.brand_id, day: hoy, followers: perfil.follower_count, likes: perfil.likes_count, videos: perfil.video_count });
  }
  // La versión guardada del reporte sin TikTok deja de valer: se consultará de nuevo.
  await db().from("social_report_snapshots").delete().eq("brand_id", st.brand_id).eq("kind", "tiktok");
  const { data: marca } = await db().from("marcas").select("slug, nombre").eq("id", st.brand_id).maybeSingle();
  return { brandId: st.brand_id as string, slug: marca?.slug as string, nombre: marca?.nombre as string, viaLink: !!st.via_link, faltan, username: perfil?.username ?? null };
}

/* Token vigente de la marca (renueva si venció). null = sin conexión. */
async function accessToken(brandId: string): Promise<string | null> {
  const { data: a } = await db().from("tiktok_brand_accounts").select("*").eq("brand_id", brandId).maybeSingle();
  if (!a) return null;
  if (Date.parse(a.access_expires_at) > Date.now()) return decrypt(a.access_token_enc, ctx(brandId, "access"));
  if (Date.parse(a.refresh_expires_at) < Date.now()) throw Error("La conexión con TikTok venció. Vuelve a conectar la cuenta.");
  const t = await token({ grant_type: "refresh_token", refresh_token: decrypt(a.refresh_token_enc, ctx(brandId, "refresh")) });
  await db().from("tiktok_brand_accounts").update({
    access_token_enc: encrypt(t.access_token, ctx(brandId, "access")),
    refresh_token_enc: encrypt(t.refresh_token, ctx(brandId, "refresh")),
    access_expires_at: new Date(Date.now() + (t.expires_in - 120) * 1000).toISOString(),
    refresh_expires_at: new Date(Date.now() + t.refresh_expires_in * 1000).toISOString(),
    scope: t.scope,
    updated_at: new Date().toISOString(),
  }).eq("brand_id", brandId);
  return t.access_token;
}

export async function desconectar(brandId: string) {
  const { data: a } = await db().from("tiktok_brand_accounts").select("access_token_enc").eq("brand_id", brandId).maybeSingle();
  if (a) {
    try {
      await fetch(`${API}/oauth/revoke/`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ client_key: process.env.TIKTOK_CLIENT_KEY!, client_secret: process.env.TIKTOK_CLIENT_SECRET!, token: decrypt(a.access_token_enc, ctx(brandId, "access")) }),
        signal: AbortSignal.timeout(10000),
      });
    } catch { /* se borra igual */ }
  }
  await db().from("tiktok_brand_accounts").delete().eq("brand_id", brandId);
}

/* ── Lectura (Display API) ── */
export type TikTokPerfil = {
  username: string | null; display_name: string | null; avatar_url: string | null; profile_deep_link: string | null;
  follower_count: number | null; following_count: number | null; likes_count: number | null; video_count: number | null;
};
async function userInfo(at: string): Promise<TikTokPerfil> {
  const fields = "open_id,avatar_url,display_name,username,profile_deep_link,follower_count,following_count,likes_count,video_count";
  const r = await fetch(`${API}/user/info/?fields=${fields}`, { headers: { Authorization: `Bearer ${at}` }, cache: "no-store", signal: AbortSignal.timeout(15000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.error?.code !== "ok") throw Error(j.error?.message || "TikTok no devolvió el perfil.");
  const u = j.data?.user ?? {};
  const n = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  return {
    username: u.username ?? null, display_name: u.display_name ?? null, avatar_url: u.avatar_url ?? null, profile_deep_link: u.profile_deep_link ?? null,
    follower_count: n(u.follower_count), following_count: n(u.following_count), likes_count: n(u.likes_count), video_count: n(u.video_count),
  };
}
export type TikTokVideo = {
  id: string; title: string; created: string; cover: string | null; url: string | null; duration: number | null;
  views: number | null; likes: number | null; comments: number | null; shares: number | null;
};
/* Videos publicados entre [desde, hasta) (YYYY-MM-DD, hora Lima). Pagina hasta 10 páginas. */
async function videos(at: string, desde: string, hasta: string): Promise<TikTokVideo[]> {
  const fields = "id,title,video_description,create_time,cover_image_url,share_url,duration,view_count,like_count,comment_count,share_count";
  const ini = Date.parse(`${desde}T00:00:00-05:00`) / 1000, fin = Date.parse(`${hasta}T00:00:00-05:00`) / 1000;
  const out: TikTokVideo[] = [];
  let cursor: number | undefined;
  for (let page = 0; page < 10; page++) {
    const r = await fetch(`${API}/video/list/?fields=${fields}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${at}`, "Content-Type": "application/json" },
      body: JSON.stringify({ max_count: 20, ...(cursor ? { cursor } : {}) }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.error?.code !== "ok") throw Error(j.error?.message || "TikTok no devolvió los videos.");
    const lista = (j.data?.videos ?? []) as Record<string, unknown>[];
    let masViejo = Infinity;
    for (const v of lista) {
      const t = Number(v.create_time);
      masViejo = Math.min(masViejo, t);
      if (t >= ini && t < fin) {
        const n = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
        out.push({
          id: String(v.id), title: String(v.title || v.video_description || "").slice(0, 160),
          created: new Date(t * 1000).toISOString(), cover: (v.cover_image_url as string) || null, url: (v.share_url as string) || null,
          duration: n(v.duration), views: n(v.view_count), likes: n(v.like_count), comments: n(v.comment_count), shares: n(v.share_count),
        });
      }
    }
    if (!j.data?.has_more || masViejo < ini) break;
    cursor = j.data.cursor;
  }
  return out.sort((a, b) => (b.views ?? 0) - (a.views ?? 0));
}

export type TikTokReporte = {
  conectado: boolean;
  configurado: boolean;
  perfil: TikTokPerfil | null;
  mes: { videos: number; views: number | null; likes: number | null; comments: number | null; shares: number | null; top: TikTokVideo[] } | null;
  seguidores: { day: string; followers: number | null }[];
  error: string | null;
  checkedAt: string;
};
const suma = (vs: (number | null)[]) => (vs.length && vs.every((v) => v !== null) ? vs.reduce<number>((s, v) => s + (v as number), 0) : vs.length ? null : 0);

export async function tiktokReporte(brandId: string, desde: string, hasta: string): Promise<TikTokReporte> {
  const base: TikTokReporte = { conectado: false, configurado: tiktokConfigurado(), perfil: null, mes: null, seguidores: [], error: null, checkedAt: new Date().toISOString() };
  try {
    const at = await accessToken(brandId);
    if (!at) return base;
    const [perfil, vids, snaps] = await Promise.all([
      userInfo(at),
      videos(at, desde, hasta),
      db().from("tiktok_follower_snapshots").select("day, followers").eq("brand_id", brandId).order("day", { ascending: true }).limit(400),
    ]);
    return {
      ...base,
      conectado: true,
      perfil,
      mes: {
        videos: vids.length,
        views: suma(vids.map((v) => v.views)), likes: suma(vids.map((v) => v.likes)),
        comments: suma(vids.map((v) => v.comments)), shares: suma(vids.map((v) => v.shares)),
        top: vids.slice(0, 6),
      },
      seguidores: (snaps.data ?? []) as { day: string; followers: number | null }[],
    };
  } catch (e) {
    return { ...base, conectado: true, error: e instanceof Error ? e.message : String(e) };
  }
}

/* Foto diaria de seguidores (cron): TikTok no da historial, así que lo construimos. */
export async function guardarFotosDiarias(hoy: string) {
  const { data: cuentas } = await db().from("tiktok_brand_accounts").select("brand_id");
  const r: { brand: string; ok: boolean }[] = [];
  for (const c of cuentas ?? []) {
    try {
      const at = await accessToken(c.brand_id);
      if (!at) continue;
      const p = await userInfo(at);
      await db().from("tiktok_follower_snapshots").upsert({ brand_id: c.brand_id, day: hoy, followers: p.follower_count, likes: p.likes_count, videos: p.video_count });
      await db().from("tiktok_brand_accounts").update({ username: p.username, display_name: p.display_name, avatar_url: p.avatar_url }).eq("brand_id", c.brand_id);
      r.push({ brand: c.brand_id, ok: true });
    } catch {
      r.push({ brand: c.brand_id, ok: false });
    }
  }
  return r;
}

/* Seguidores guardados (última foto diaria) para la tarjeta de redes del resumen.
   No consulta TikTok en vivo. null = la marca no tiene TikTok conectado. */
export async function seguidoresGuardados(brandId: string): Promise<{ followers: number | null; day: string } | null> {
  const { data: cuenta } = await db().from("tiktok_brand_accounts").select("brand_id").eq("brand_id", brandId).maybeSingle();
  if (!cuenta) return null;
  const { data } = await db().from("tiktok_follower_snapshots").select("day, followers").eq("brand_id", brandId).order("day", { ascending: false }).limit(1).maybeSingle();
  return data ? { followers: data.followers, day: data.day } : { followers: null, day: "" };
}
