// Temas para la próxima reunión de una marca (Pedro 19-oct-2026).
// GET ?marca=slug → lista pendiente. POST { marca, accion } → agregar tema
// suelto, quitar, empezar reunión (abre una nota con el orden del día) o
// marcar todo como presentado. Solo el equipo con acceso a la marca.
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { listarTemas, ordenDelDia } from "@/lib/reuniones/temas";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const entrada = z.discriminatedUnion("accion", [
  z.object({ accion: z.literal("agregar"), marca: z.string(), texto: z.string().trim().min(1, "Escribe el tema").max(600, "El tema es muy largo") }),
  z.object({ accion: z.literal("quitar"), marca: z.string(), id: z.string().uuid() }),
  z.object({ accion: z.literal("empezar"), marca: z.string() }),
  z.object({ accion: z.literal("presentado"), marca: z.string() }),
]);
const sinCache = { headers: { "Cache-Control": "private, no-store" } };

export async function GET(req: Request) {
  try {
    const a = await actor(req);
    const brand = await brandAccess(a, new URL(req.url).searchParams.get("marca") ?? "");
    return Response.json(await listarTemas(a.service, brand.id), sinCache);
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
    const memberId = (a.member as { id?: string } | null)?.id ?? null;

    if (q.accion === "agregar") {
      const { error } = await db.from("reunion_temas").insert({ marca_id: brand.id, texto: q.texto, created_by: memberId });
      if (error) throw new Error(error.message);
    }

    if (q.accion === "quitar") {
      const { error } = await db.from("reunion_temas").delete().eq("id", q.id).eq("marca_id", brand.id).eq("estado", "pendiente");
      if (error) throw new Error(error.message);
    }

    if (q.accion === "presentado") {
      /* Los temas agregados después de abrir la nota también quedan ligados a ella. */
      const { data: ligadas } = await db
        .from("reunion_temas")
        .select("nota_id")
        .eq("marca_id", brand.id)
        .eq("estado", "pendiente")
        .not("nota_id", "is", null)
        .limit(1);
      const notaId = ligadas?.[0]?.nota_id ?? null;
      const { error } = await db
        .from("reunion_temas")
        .update({ estado: "presentado", presentado_at: new Date().toISOString(), ...(notaId ? { nota_id: notaId } : {}) })
        .eq("marca_id", brand.id)
        .eq("estado", "pendiente");
      if (error) throw new Error(error.message);
    }

    if (q.accion === "empezar") {
      if (!memberId) throw new StrategyError("Necesitas una cuenta activa del equipo.", 403);
      const { temas } = await listarTemas(db, brand.id);
      /* Si la lista ya tiene una nota abierta, se reutiliza (doble clic o
         volver a entrar no crea notas repetidas). */
      const { data: ligadas } = await db
        .from("reunion_temas")
        .select("nota_id")
        .eq("marca_id", brand.id)
        .eq("estado", "pendiente")
        .not("nota_id", "is", null)
        .limit(1);
      let notaId: string | null = ligadas?.[0]?.nota_id ?? null;
      if (notaId) {
        const { data: nota } = await db.from("notas_reuniones").select("id").eq("id", notaId).maybeSingle();
        if (!nota) notaId = null;
      }
      if (!notaId) {
        const { data: nota, error } = await db
          .from("notas_reuniones")
          .insert({
            team_member_id: memberId,
            titulo: `Reunión ${brand.nombre}`,
            cuerpo: ordenDelDia(brand.nombre, temas, new Date()),
            transcript: "",
            chat: [],
            estado: "borrador",
            marca_id: brand.id,
          })
          .select("id")
          .single();
        if (error) throw new Error(error.message);
        notaId = nota.id as string;
        await db.from("reunion_temas").update({ nota_id: notaId }).eq("marca_id", brand.id).eq("estado", "pendiente");
      }
      return Response.json({ notaId, ...(await listarTemas(db, brand.id)) }, sinCache);
    }

    return Response.json(await listarTemas(db, brand.id), sinCache);
  } catch (e) {
    return failure(e);
  }
}
