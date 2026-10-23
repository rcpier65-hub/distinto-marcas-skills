import "server-only";
import { type Actor, StrategyError } from "@/lib/estrategia/access";
import { strategyDB, transaction } from "@/lib/estrategia/db";

export function puedeMarcarDiseno(a: Actor) {
  return !a.client && (a.access.owner || a.permisos.diseno?.acceso === true);
}

function acceso(a: Actor) {
  if (!puedeMarcarDiseno(a)) throw new StrategyError("Sin permiso para acceder a Diseño", 403);
}

// Validar antes de crear/editar evita guardar media tarea cuando la selección
// automática no tendría ninguna marca autorizada donde mostrarse.
export async function validarPresentacionDiseno(a: Actor, ids: string[]) {
  acceso(a);
  const { rowCount } = await strategyDB().query(`
    SELECT id FROM marcas WHERE activa = true AND slug <> 'interno'
      AND id = ANY($1::uuid[]) AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))
  `, [ids, a.brands]);
  if (!rowCount) throw new StrategyError("Selecciona una marca a la que tengas acceso para presentar el diseño en reunión.", 403);
}

export async function disenosParaReunion(a: Actor): Promise<string[]> {
  acceso(a);
  const { rows } = await strategyDB().query<{ publicacion_id: string }>(`
    SELECT DISTINCT r.publicacion_id
    FROM reunion_temas r
    JOIN publicaciones p ON p.id = r.publicacion_id
    JOIN marcas m ON m.id = r.marca_id
    WHERE r.estado = 'pendiente' AND m.activa = true AND m.slug <> 'interno'
      AND (m.id = p.marca_id OR m.id = ANY(coalesce(p.marcas_extra, '{}'::uuid[])))
      AND ($1::uuid[] IS NULL OR m.id = ANY($1::uuid[]))
  `, [a.brands]);
  return rows.map((r) => r.publicacion_id);
}

export async function marcarDiseno(a: Actor, id: string, activa: boolean) {
  acceso(a);
  return transaction(async (db) => {
    // Bloquea el original: doble clic y peticiones concurrentes son idempotentes;
    // un cambio de marca simultáneo no puede insertar una asociación obsoleta.
    const { rows } = await db.query(`
      SELECT marca_id, marcas_extra, es_tarea_diseno, diseno_terminado_at, disenado
      FROM publicaciones WHERE id = $1 FOR UPDATE
    `, [id]);
    const p = rows[0];
    if (!p) throw new StrategyError("Diseño no encontrado", 404);
    const { rows: marcas } = await db.query<{ id: string; nombre: string }>(`
      SELECT id, nombre FROM marcas WHERE activa = true AND slug <> 'interno'
        AND id = ANY($1::uuid[]) AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))
      ORDER BY nombre
    `, [[...new Set([p.marca_id, ...(p.marcas_extra ?? [])].filter(Boolean))], a.brands]);
    if (!marcas.length)
      throw new StrategyError("Asigna al diseño una marca a la que tengas acceso antes de presentarlo.", 403);
    if (activa && !p.es_tarea_diseno && !p.diseno_terminado_at && !p.disenado)
      throw new StrategyError("Esta publicación no tiene una tarea de diseño.", 400);
    const ids = marcas.map((m) => m.id);
    if (activa) {
      await db.query(`
        INSERT INTO reunion_temas (marca_id, publicacion_id, created_by)
        SELECT unnest($1::uuid[]), $2::uuid, $3::uuid ON CONFLICT DO NOTHING
      `, [ids, id, a.member?.id ?? null]);
    } else {
      await db.query(`DELETE FROM reunion_temas
        WHERE publicacion_id = $1 AND marca_id = ANY($2::uuid[]) AND estado = 'pendiente'`, [id, ids]);
    }
    return { activa, marcas: marcas.map((m) => m.nombre) };
  });
}
