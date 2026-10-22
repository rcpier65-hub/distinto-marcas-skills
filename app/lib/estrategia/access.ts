import "server-only";
import { getUser } from "@/lib/auth/get-user";
import { createServiceClient } from "@/lib/supabase/service";
import { loadTaskAccess } from "@/lib/tareas/access-server";
import { strategyDB } from "./db";
import { uid, type StrategyRecord, type Brand } from "./model";
import { z } from "zod";

export class StrategyError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function actor(req?: Request) {
  if (req && req.method !== "GET") {
    const origin = req.headers.get("origin");
    // Next reconstructs req.url with the internal hostname behind Traefik and
    // in dev. Compare the browser origin against the request's external host.
    const host = req.headers.get("host") || new URL(req.url).host;
    if (origin && new URL(origin).host !== host)
      throw new StrategyError("Origen no permitido", 403);
  }
  const user = await getUser();
  if (!user) throw new StrategyError("Inicia sesión para continuar", 401);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any;
  const { member, access, permisos } = await loadTaskAccess(service, user.id);
  const { data: team, error } = await service
    .from("team_members")
    .select("marcas_acceso,activo")
    .eq("auth_user_id", user.id)
    .maybeSingle();
  if (error) throw new StrategyError("No se pudo comprobar el acceso", 503);
  const client = !team
    ? await service
        .from("marca_clientes")
        .select("marca_id,nombre")
        .eq("auth_user_id", user.id)
    : { data: [] };
  if (!member && !client.data?.length)
    throw new StrategyError("No tienes acceso a este espacio", 403);
  if (team?.activo === false)
    throw new StrategyError("Tu acceso está desactivado", 403);
  return {
    user,
    service,
    member,
    access,
    permisos,
    brands: (access.owner ? null : (team?.marcas_acceso ?? null)) as
      string[] | null,
    clientBrands: (client.data ?? []) as { marca_id: string; nombre: string }[],
    client: !member,
    manager: access.owner || ["director", "admin"].includes(member?.rol_base),
  };
}
export type Actor = Awaited<ReturnType<typeof actor>>;
export async function brandAccess(a: Actor, slug: string): Promise<Brand> {
  if (a.client) throw new StrategyError("Este espacio es para el equipo", 403);
  if (a.permisos.marcas?.acceso !== true && !a.access.owner)
    throw new StrategyError("Sin permiso para acceder a Marcas", 403);
  const { data, error } = await a.service
    .from("marcas")
    .select(
      "id,slug,nombre,logo_url,drive_url,emoji_marca,grabaciones_objetivo_mensual",
    )
    .eq("slug", slug)
    .eq("activa", true)
    .maybeSingle();
  if (error || !data) throw new StrategyError("Marca no encontrada", 404);
  if (a.brands && !a.brands.includes(data.id))
    throw new StrategyError("No tienes acceso a esta marca", 403);
  return data;
}
export async function recordAccess(
  a: Actor,
  id: string,
  kind?: string,
  write = false,
): Promise<StrategyRecord> {
  uid.parse(id);
  const { rows } = await strategyDB().query(
    "SELECT * FROM strategy_records WHERE id=$1",
    [id],
  );
  const r = rows[0] as StrategyRecord | undefined;
  if (!r || (kind && r.kind !== kind))
    throw new StrategyError("Registro no encontrado", 404);
  if (a.client) {
    if (
      write ||
      r.archived ||
      r.kind !== "sheet" ||
      r.data.sharedWithClient !== true ||
      !a.clientBrands.some((b) => b.marca_id === r.marca_id)
    )
      throw new StrategyError("Registro no compartido contigo", 403);
  } else {
    if (
      (a.permisos.marcas?.acceso !== true && !a.access.owner) ||
      (a.brands && !a.brands.includes(r.marca_id))
    )
      throw new StrategyError("Sin acceso a esta marca", 403);
    if (write && r.archived)
      throw new StrategyError("Restaura la hoja antes de modificarla", 409);
  }
  return r;
}
export function mayManage(a: Actor, r: StrategyRecord) {
  if (
    a.client ||
    (!a.manager &&
      r.created_by !== a.member?.id &&
      r.data.ownerId !== a.member?.id)
  )
    throw new StrategyError(
      "Solo el responsable puede confirmar o compartir este plan",
      403,
    );
}
export async function body(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 18000000)
    throw new StrategyError("La hoja supera el límite de 18 MB", 413);
  const raw = await req.text();
  if (raw.length > 18000000)
    throw new StrategyError("La hoja supera el límite de 18 MB", 413);
  try {
    return JSON.parse(raw);
  } catch {
    throw new StrategyError("Solicitud inválida");
  }
}
export function failure(e: unknown) {
  if (e instanceof z.ZodError)
    return Response.json(
      { error: e.issues[0]?.message ?? "Revisa los datos" },
      { status: 400 },
    );
  if (e instanceof StrategyError)
    return Response.json({ error: e.message }, { status: e.status });
  console.error("[estrategia]", e instanceof Error ? e.message : "error");
  return Response.json(
    {
      error:
        "No se pudo guardar. Conserva esta ventana e inténtalo nuevamente.",
    },
    { status: 500 },
  );
}
