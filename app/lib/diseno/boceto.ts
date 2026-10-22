import "server-only";
import { type Actor, brandAccess, StrategyError } from "@/lib/estrategia/access";
import { strategyDB } from "@/lib/estrategia/db";

export async function permitirBoceto(a: Actor, slug: string) {
  if (a.client || (!a.access.owner && a.permisos.diseno?.acceso !== true))
    throw new StrategyError("Sin permiso para crear bocetos de Diseño", 403);
  if (!slug || slug === "interno")
    throw new StrategyError("Selecciona la marca principal para guardar el boceto en Planificación");
  return brandAccess(a, slug);
}

export async function bocetosDeDisenos(a: Actor, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length || a.client || (!a.access.owner && a.permisos.marcas?.acceso !== true)) return new Map();
  const { rows } = await strategyDB().query<{ id: string; slug: string; boceto_publicacion_id: string }>(`
    SELECT r.id,m.slug,r.boceto_publicacion_id FROM strategy_records r
    JOIN marcas m ON m.id=r.marca_id JOIN publicaciones p ON p.id=r.boceto_publicacion_id
    WHERE r.boceto_publicacion_id=ANY($1::uuid[]) AND r.marca_id=p.marca_id AND m.activa
      AND ($2::uuid[] IS NULL OR m.id=ANY($2::uuid[]))`, [ids, a.brands]);
  return new Map(rows.map(r => [r.boceto_publicacion_id, `/marca/${r.slug}/estrategia/hoja/${r.id}`]));
}
