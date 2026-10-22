import "server-only";
import { designFinished } from "@/lib/estrategia/activity-status";
/* Temas para la próxima reunión con una marca (Pedro 19-oct-2026): tareas
   marcadas "Para reunión" en el tablero + temas sueltos escritos a mano. Las
   tareas terminadas se presentan; las pendientes y los temas se conversan.
   Tabla reunion_temas (solo servidor). */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any;

export type TemaReunion = {
  id: string;
  tipo: "tarea" | "diseno" | "tema";
  texto: string;
  /* Estado real del original; marcar para presentar nunca lo completa. */
  hecha: boolean;
  responsable: string | null;
  tareaId: string | null;
  publicacionId: string | null;
  href: string | null;
  creado: string;
};
export type TemasReunion = {
  temas: TemaReunion[];
  ultima: { fecha: string; total: number; notaId: string | null } | null;
};

const nombreCorto = (n: string | null | undefined) => {
  const p = (n ?? "").trim().split(/\s+/)[0] ?? "";
  return p ? p.charAt(0).toUpperCase() + p.slice(1).toLowerCase() : null;
};

/* Marca de una tarea: marca_slug y, si falta, la columna (categoría) con el
   nombre de la marca. Sin fallback a "interno": un tema de reunión necesita
   una marca real. */
export async function marcaDeTarea(
  service: Service,
  t: { marca_slug: string | null; categoria: string | null },
): Promise<{ id: string; slug: string; nombre: string } | null> {
  const slug = (t.marca_slug ?? "").trim().toLowerCase();
  if (slug && slug !== "interno") {
    const { data } = await service.from("marcas").select("id,slug,nombre").eq("slug", slug).maybeSingle();
    if (data) return data;
  }
  const cat = (t.categoria ?? "").trim();
  if (!cat || cat.toLowerCase() === "general") return null;
  /* Igualdad sin distinguir mayúsculas: se escapan los comodines de LIKE para que
     una columna llamada "%" o "_" no coincida con otra marca. */
  const exacto = cat.replace(/[\\%_]/g, (c) => `\\${c}`);
  const { data } = await service.from("marcas").select("id,slug,nombre").ilike("nombre", exacto).limit(1);
  const m = data?.[0];
  return m && m.slug !== "interno" ? m : null;
}

export async function listarTemas(service: Service, marcaId: string): Promise<TemasReunion> {
  const { data, error } = await service
    .from("reunion_temas")
    .select("id,tarea_id,publicacion_id,texto,created_at,tarea:tareas(texto,completada,team_member_id),diseno:publicaciones!publicacion_id(nombre,marca_id,marcas_extra,estado_tarea,es_tarea_diseno,disenado,diseno_terminado_at,fecha_publicacion,disenador_nombre)")
    .eq("marca_id", marcaId)
    .eq("estado", "pendiente")
    .order("created_at", { ascending: true });
  if (error) throw new Error("No se pudieron leer los temas de la reunión.");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  const ids = [...new Set(rows.map((r) => (Array.isArray(r.tarea) ? r.tarea[0] : r.tarea)?.team_member_id).filter(Boolean))];
  const nombres = new Map<string, string>();
  if (ids.length) {
    const { data: miembros } = await service.from("team_members").select("id,nombre").in("id", ids);
    for (const m of miembros ?? []) nombres.set(m.id, m.nombre);
  }
  const temas: TemaReunion[] = rows.flatMap((r) => {
    const t = Array.isArray(r.tarea) ? r.tarea[0] : r.tarea;
    const d = Array.isArray(r.diseno) ? r.diseno[0] : r.diseno;
    // Si el diseño se reasigna, deja de aparecer en la marca anterior.
    if (r.publicacion_id && (!d || ![d.marca_id, ...(d.marcas_extra ?? [])].includes(marcaId))) return [];

    return {
      id: r.id,
      tipo: r.publicacion_id ? "diseno" : r.tarea_id ? "tarea" : "tema",
      texto: d?.nombre ?? t?.texto ?? r.texto,
      hecha: d ? designFinished(d) : Boolean(t?.completada),
      responsable: d ? nombreCorto(d.disenador_nombre) : t ? nombreCorto(nombres.get(t.team_member_id)) : null,
      tareaId: r.tarea_id ?? null,
      publicacionId: r.publicacion_id ?? null,
      href: d ? `/${d.fecha_publicacion ? "publicaciones" : "diseno"}/${r.publicacion_id}` : null,
      creado: r.created_at,
    };
  });

  const { data: ult } = await service
    .from("reunion_temas")
    .select("presentado_at,nota_id")
    .eq("marca_id", marcaId)
    .eq("estado", "presentado")
    .order("presentado_at", { ascending: false })
    .limit(1);
  let ultima: TemasReunion["ultima"] = null;
  if (ult?.[0]?.presentado_at) {
    const { count } = await service
      .from("reunion_temas")
      .select("id", { count: "exact", head: true })
      .eq("marca_id", marcaId)
      .eq("presentado_at", ult[0].presentado_at);
    ultima = { fecha: ult[0].presentado_at, total: count ?? 0, notaId: ult[0].nota_id ?? null };
  }
  return { temas, ultima };
}

/* Orden del día que encabeza la nota de la reunión. Texto plano: el editor
   de Notas y reuniones trabaja en texto. */
export function ordenDelDia(marca: string, temas: TemaReunion[], fecha: Date): string {
  const dia = fecha.toLocaleDateString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "long", year: "numeric" });
  const linea = (t: TemaReunion) => `- ${t.tipo === "diseno" ? `Diseño (${t.hecha ? "terminado" : "en curso"}): ` : ""}${t.texto.replace(/\s+/g, " ").trim()}${t.responsable ? ` (${t.responsable})` : ""}`;
  const presentar = temas.filter((t) => t.tipo === "diseno" || t.hecha);
  const conversar = temas.filter((t) => t.tipo !== "diseno" && !t.hecha);
  const partes = [`Reunión con ${marca} · ${dia}`];
  if (presentar.length) partes.push("", "Para presentar", ...presentar.map(linea));
  if (conversar.length) partes.push("", "Para conversar", ...conversar.map(linea));
  partes.push("", "Notas de la reunión", "");
  return partes.join("\n");
}
