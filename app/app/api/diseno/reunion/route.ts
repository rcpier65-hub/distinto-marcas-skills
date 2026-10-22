import { z } from "zod";
import { actor, body, failure } from "@/lib/estrategia/access";
import { disenosParaReunion, marcarDiseno } from "@/lib/reuniones/diseno";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const sinCache = { headers: { "Cache-Control": "private, no-store" } };
const entrada = z.object({ publicacionId: z.string().uuid(), activa: z.boolean() }).strict();

export async function GET(req: Request) {
  try {
    return Response.json({ ids: await disenosParaReunion(await actor(req)) }, sinCache);
  } catch (e) { return failure(e); }
}

export async function POST(req: Request) {
  try {
    const a = await actor(req);
    const q = entrada.parse(await body(req));
    return Response.json(await marcarDiseno(a, q.publicacionId, q.activa), sinCache);
  } catch (e) { return failure(e); }
}
