import "server-only";
import { getUser } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/service";
import { esPedroEmail } from "@/lib/planes/catalogo";
import { z } from "zod";
export class StudioError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function studioActor(request: Request) {
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin)
      throw new StudioError("Origen no permitido", 403);
  }
  const user = await getUser();
  if (!user) throw new StudioError("Inicia sesión para continuar", 401);
  // All studio reads/writes stay server-side. A missing team row is not an admin grant.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = createServiceClient() as any;
  const { data: team, error } = await db
    .from("team_members")
    .select("id,activo,rol_base,marcas_acceso")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw new StudioError("No se pudo verificar tu acceso", 503);
  if (team?.activo === false || (!team && !esPedroEmail(user.email)))
    throw new StudioError("Este módulo es para el equipo de la agencia", 403);
  const manager =
    esPedroEmail(user.email) || ["director", "admin"].includes(team?.rol_base);
  return {
    db,
    user,
    manager,
    brands: (esPedroEmail(user.email)
      ? null
      : (team?.marcas_acceso ?? null)) as string[] | null,
  };
}
export type Actor = Awaited<ReturnType<typeof studioActor>>;
export async function brandAccess(a: Actor, id: string) {
  z.string().uuid().parse(id);
  if (a.brands && !a.brands.includes(id))
    throw new StudioError("No tienes acceso a esta marca", 403);
  const { data, error } = await a.db
    .from("marcas")
    .select("id,nombre,slug,emoji_marca,tono_voz,drive_url")
    .eq("id", id)
    .single();
  if (error || !data) throw new StudioError("Marca no encontrada", 404);
  return data;
}
export async function batchAccess(a: Actor, id: string) {
  z.string().uuid().parse(id);
  const { data, error } = await a.db
    .from("creative_batches")
    .select("*")
    .eq("id", id)
    .single();
  if (error || !data) throw new StudioError("Tanda no encontrada", 404);
  await brandAccess(a, data.marca_id);
  return data;
}
export async function readBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > 1200000)
    throw new StudioError("El contenido es demasiado grande", 413);
  const body = await request.text();
  if (body.length > 1200000)
    throw new StudioError("El contenido es demasiado grande", 413);
  try {
    return JSON.parse(body);
  } catch {
    throw new StudioError("Solicitud inválida");
  }
}
export function apiError(e: unknown) {
  if (e instanceof z.ZodError)
    return Response.json(
      { error: e.issues[0]?.message || "Revisa los campos" },
      { status: 400 },
    );
  if (e instanceof StudioError)
    return Response.json({ error: e.message }, { status: e.status });
  console.error(
    "[creative-studio]",
    e instanceof Error ? e.message : "unknown",
  );
  return Response.json(
    {
      error:
        "No se pudo completar la operación. Tus cambios permanecen en pantalla.",
    },
    { status: 500 },
  );
}
