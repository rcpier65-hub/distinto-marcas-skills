// Mapa de marca (Pedro 21-oct-2026). GET ?marca=slug → el mapa de la marca
// (todo el equipo con acceso a la marca). PUT { marca, mapa } → guarda (solo
// dirección/administración). Tabla marca_mapas, solo servidor.
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { leerMapa, mapaSchema } from "@/lib/marca-mapa/model";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const sinCache = { headers: { "Cache-Control": "private, no-store" } };
const guardar = z.object({ marca: z.string(), mapa: mapaSchema });

async function respuesta(db: { from: (t: string) => unknown }, marcaId: string, puedeEditar: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any).from("marca_mapas").select("data,updated_at,updated_by_name").eq("marca_id", marcaId).maybeSingle();
  if (error) throw new Error(error.message);
  return {
    mapa: leerMapa(data?.data),
    existe: Boolean(data),
    actualizado: data?.updated_at ?? null,
    actualizadoPor: data?.updated_by_name ?? null,
    puedeEditar,
  };
}

export async function GET(req: Request) {
  try {
    const a = await actor(req);
    const brand = await brandAccess(a, new URL(req.url).searchParams.get("marca") ?? "");
    return Response.json(await respuesta(a.service, brand.id, a.manager), sinCache);
  } catch (e) {
    return failure(e);
  }
}

export async function PUT(req: Request) {
  try {
    const a = await actor(req);
    const q = guardar.parse(await req.json());
    const brand = await brandAccess(a, q.marca);
    if (!a.manager) throw new StrategyError("Solo dirección puede editar el mapa de marca.", 403);
    const yo = a.member as { id?: string; nombre?: string } | null;
    const { error } = await a.service.from("marca_mapas").upsert({
      marca_id: brand.id,
      data: q.mapa,
      updated_by: yo?.id ?? null,
      updated_by_name: yo?.nombre ?? null,
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
    return Response.json(await respuesta(a.service, brand.id, true), sinCache);
  } catch (e) {
    return failure(e);
  }
}
