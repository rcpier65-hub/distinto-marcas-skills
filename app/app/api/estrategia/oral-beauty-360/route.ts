// Reporte 360 Oral Beauty (Pedro 21-oct-2026). GET ?marca&mes → última versión
// guardada. POST { marca, mes } → «Actualizar»: Meta + clínica. Solo dirección.
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { actualizar360, leer360 } from "@/lib/oral-beauty/sync";
import { todayLima } from "@/lib/estrategia/model";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 90;

const MARCA = "oral-bueaty";
const mesOk = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Mes inválido");
const sinCache = { headers: { "Cache-Control": "private, no-store" } };

async function ctx(req: Request, marca: string) {
  const a = await actor(req);
  if (!a.manager || a.client) throw new StrategyError("Solo dirección puede ver el reporte 360.", 403);
  if (marca !== MARCA) throw new StrategyError("El reporte 360 es solo para Oral Beauty.", 404);
  await brandAccess(a, marca);
  return a;
}

export async function GET(req: Request) {
  try {
    const q = new URL(req.url).searchParams;
    await ctx(req, q.get("marca") ?? "");
    const mes = mesOk.parse(q.get("mes") ?? todayLima().slice(0, 7));
    return Response.json({ reporte: await leer360(mes) }, sinCache);
  } catch (e) { return failure(e); }
}

export async function POST(req: Request) {
  try {
    const body = z.object({ marca: z.string(), mes: mesOk }).strict().parse(await req.json());
    const a = await ctx(req, body.marca);
    if (body.mes > todayLima().slice(0, 7)) throw new StrategyError("Ese mes todavía no empieza.");
    const reporte = await actualizar360(body.mes, (a.member as { nombre?: string } | null)?.nombre ?? null);
    return Response.json({ reporte }, sinCache);
  } catch (e) { return failure(e); }
}
