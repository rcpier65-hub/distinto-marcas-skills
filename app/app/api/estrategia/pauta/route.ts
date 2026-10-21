// Panel de Publicidad de una marca (Pedro 21-oct-2026).
// GET ?marca=slug → configuración, última versión guardada de Meta y bitácora.
// POST { marca, accion }:
//   actualizar → consulta Meta y guarda la versión (equipo con acceso).
//   config     → presupuesto mensual, resultado y meta de costo (dirección); recalcula.
//   nota       → agrega a la bitácora (equipo). borrar → quita una nota (autor o dirección).
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError, type Actor } from "@/lib/estrategia/access";
import { configSchema } from "@/lib/pauta/model";
import { consultarPauta } from "@/lib/pauta/meta";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

const entrada = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("actualizar"), marca: z.string() }),
  z.object({ accion: z.literal("config"), marca: z.string(), config: configSchema }),
  z.object({ accion: z.literal("nota"), marca: z.string(), texto: z.string().trim().min(1, "Escribe qué se cambió").max(1000, "La nota es muy larga"), fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  z.object({ accion: z.literal("borrar"), marca: z.string(), id: z.string().uuid() }),
]);
const sinCache = { headers: { "Cache-Control": "private, no-store" } };

async function estado(a: Actor, marcaId: string) {
  const [p, b] = await Promise.all([
    a.service.from("marca_pauta").select("config,datos,datos_at,datos_por").eq("marca_id", marcaId).maybeSingle(),
    a.service.from("pauta_bitacora").select("id,fecha,texto,autor_id,autor_nombre,created_at").eq("marca_id", marcaId).order("fecha", { ascending: false }).order("created_at", { ascending: false }).limit(40),
  ]);
  if (p.error || b.error) throw new Error((p.error ?? b.error)!.message);
  const yo = (a.member as { id?: string } | null)?.id ?? null;
  return {
    config: configSchema.parse(p.data?.config ?? {}),
    datos: p.data?.datos ?? null,
    datosAt: p.data?.datos_at ?? null,
    datosPor: p.data?.datos_por ?? null,
    bitacora: (b.data ?? []).map((n: { autor_id: string | null }) => ({ ...n, propia: n.autor_id === yo })),
    puedeEditar: a.manager,
  };
}

async function actualizar(a: Actor, marcaId: string, config: z.infer<typeof configSchema>) {
  const datos = await consultarPauta(marcaId, config);
  const { error } = await a.service.from("marca_pauta").upsert({
    marca_id: marcaId, config, datos, datos_at: datos.consultado,
    datos_por: (a.member as { nombre?: string } | null)?.nombre ?? null, updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

export async function GET(req: Request) {
  try {
    const a = await actor(req);
    const brand = await brandAccess(a, new URL(req.url).searchParams.get("marca") ?? "");
    return Response.json(await estado(a, brand.id), sinCache);
  } catch (e) {
    return failure(e);
  }
}

export async function POST(req: Request) {
  try {
    const a = await actor(req);
    const q = entrada.parse(await req.json());
    const brand = await brandAccess(a, q.marca);
    const db = a.service;
    let aviso: string | null = null;

    if (q.accion === "actualizar") {
      const { data } = await db.from("marca_pauta").select("config").eq("marca_id", brand.id).maybeSingle();
      await actualizar(a, brand.id, configSchema.parse(data?.config ?? {}));
    }

    if (q.accion === "config") {
      if (!a.manager) throw new StrategyError("Solo dirección puede cambiar el presupuesto y las metas.", 403);
      const { error } = await db.from("marca_pauta").upsert({ marca_id: brand.id, config: q.config, updated_at: new Date().toISOString() });
      if (error) throw new Error(error.message);
      /* Recalcula con la nueva configuración; si Meta falla, la configuración queda guardada igual. */
      try { await actualizar(a, brand.id, q.config); } catch (e) { aviso = `Configuración guardada. ${e instanceof Error ? e.message : ""} Toca «Actualizar» más tarde.`; }
    }

    if (q.accion === "nota") {
      const yo = a.member as { id?: string; nombre?: string } | null;
      const { error } = await db.from("pauta_bitacora").insert({ marca_id: brand.id, texto: q.texto, ...(q.fecha ? { fecha: q.fecha } : {}), autor_id: yo?.id ?? null, autor_nombre: yo?.nombre ?? null });
      if (error) throw new Error(error.message);
    }

    if (q.accion === "borrar") {
      let borrar = db.from("pauta_bitacora").delete().eq("id", q.id).eq("marca_id", brand.id);
      if (!a.manager) borrar = borrar.eq("autor_id", (a.member as { id?: string } | null)?.id ?? "00000000-0000-0000-0000-000000000000");
      const { error } = await borrar;
      if (error) throw new Error(error.message);
    }

    return Response.json({ ...(await estado(a, brand.id)), aviso }, sinCache);
  } catch (e) {
    return failure(e);
  }
}
