// Comentarios de una publicación del reporte de redes (Pedro 21-oct-2026:
// «poner los comentarios para revisarlos»). Se consultan a Meta al abrirlos,
// solo para publicaciones de las cuentas asignadas a la marca. Solo lectura.
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { brandBinding, metaAccessToken } from "@/lib/meta-mcp/server";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type J = Record<string, unknown>;
async function graph(path: string, params: Record<string, string>, token: string): Promise<J> {
  const r = await fetch(`https://graph.facebook.com/v26.0/${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: "no-store", redirect: "error", signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  const j = r ? ((await r.json().catch(() => null)) as J & { error?: { message?: string } } | null) : null;
  if (!r?.ok || !j || j.error) throw new StrategyError("Meta no entregó los comentarios de esta publicación.", 502);
  return j;
}

export type Comentario = { id: string; autor: string; texto: string; fecha: string; meGusta: number | null; respuestas: number };

export async function GET(req: Request) {
  try {
    const a = await actor(req);
    if (!a.manager || a.client) throw new StrategyError("Solo administración puede revisar comentarios.", 403);
    const q = z.object({ marca: z.string().min(1), red: z.enum(["instagram", "facebook"]), id: z.string().regex(/^\d+(?:_\d+)?$/) }).strict()
      .parse(Object.fromEntries(new URL(req.url).searchParams));
    const brand = await brandAccess(a, q.marca);
    const b = await brandBinding(brand.id);
    const token = await metaAccessToken();
    let comentarios: Comentario[] = [];
    let total: number | null = null;

    if (q.red === "instagram") {
      if (!b?.instagram_user_id) throw new StrategyError("La marca no tiene Instagram asignado.", 409);
      const media = await graph(q.id, { fields: "owner{id},comments_count" }, token);
      if ((media.owner as J | undefined)?.id !== b.instagram_user_id) throw new StrategyError("La publicación no es de la cuenta de la marca.", 403);
      total = typeof media.comments_count === "number" ? media.comments_count : null;
      const c = await graph(`${q.id}/comments`, { fields: "id,text,username,timestamp,like_count,replies.limit(25){id}", limit: "50" }, token);
      comentarios = ((c.data as J[]) ?? []).map((x) => ({
        id: String(x.id), autor: String(x.username ?? "Usuario de Instagram"), texto: String(x.text ?? "").slice(0, 1000), fecha: String(x.timestamp ?? ""),
        meGusta: typeof x.like_count === "number" ? x.like_count : null,
        respuestas: Number(((x.replies as J | undefined)?.data as unknown[] | undefined)?.length ?? 0),
      }));
    } else {
      /* Leer comentarios de Facebook exige el permiso pages_read_user_content,
         que la app de Meta de la agencia aún no tiene aprobado. */
      throw new StrategyError("Los comentarios de Facebook todavía no se pueden leer desde la app: Meta exige el permiso «pages_read_user_content». Ábrelos en Facebook mientras tanto.", 409);
    }
    return Response.json({ total, comentarios }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (e) {
    return failure(e);
  }
}
