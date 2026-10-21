// Historial mensual de pauta dentro del espacio de marca (Pedro 21-oct-2026:
// «el reporte de anuncios debe estar dentro de la marca, sin pedir código»).
// Misma tabla pauta_mensual que el módulo Reportes. Solo dirección.
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { actualizarHistorial, guardarPresupuesto, historialDeMarcas } from "@/lib/pauta/historial";
import { configSchema } from "@/lib/pauta/model";
import { todayLima } from "@/lib/estrategia/model";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sinCache = { headers: { "Cache-Control": "private, no-store" } };
async function ctx(req: Request, marca: string) {
  const a = await actor(req);
  if (!a.manager || a.client) throw new StrategyError("Solo dirección puede ver el reporte de anuncios.", 403);
  return { a, brand: await brandAccess(a, marca) };
}
const respuesta = async (marcaId: string) => ({ meses: (await historialDeMarcas([marcaId]))[marcaId] ?? [], mesActual: todayLima().slice(0, 7) });

export async function GET(req: Request) {
  try {
    const { brand } = await ctx(req, new URL(req.url).searchParams.get("marca") ?? "");
    return Response.json(await respuesta(brand.id), sinCache);
  } catch (e) { return failure(e); }
}

const entrada = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("actualizar"), marca: z.string() }),
  z.object({ accion: z.literal("presupuesto"), marca: z.string(), mes: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), monto: z.number().min(0).max(10_000_000).nullable() }),
]);
export async function POST(req: Request) {
  try {
    const q = entrada.parse(await req.json());
    const { a, brand } = await ctx(req, q.marca);
    if (q.accion === "actualizar") {
      const { data } = await a.service.from("marca_pauta").select("config").eq("marca_id", brand.id).maybeSingle();
      await actualizarHistorial(brand.id, configSchema.parse(data?.config ?? {}).resultado);
    } else {
      await guardarPresupuesto(brand.id, q.mes, q.monto);
    }
    return Response.json(await respuesta(brand.id), sinCache);
  } catch (e) { return failure(e); }
}
