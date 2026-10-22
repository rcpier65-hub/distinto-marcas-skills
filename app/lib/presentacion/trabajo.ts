import "server-only";
/* «Así trabajamos por dentro» (Pedro 21-oct-2026): datos reales del sistema
   para la presentación de Social Media. Por marca: ritmo de publicaciones mes
   a mes, la grilla de un mes, guiones reales, grabaciones y el flujo de
   producción (idea → aprobación → diseño → edición → programado → publicado).
   Solo lectura; no expone copys privados más allá de los guiones de ejemplo. */

const ETAPAS: { id: string; nombre: string; estados: string[] }[] = [
  { id: "idea", nombre: "Idea y guion", estados: ["idear"] },
  { id: "aprobacion", nombre: "Aprobación", estados: ["aprobar", "enviado"] },
  { id: "diseno", nombre: "Diseño", estados: ["disenar", "disenando", "disenado"] },
  { id: "edicion", nombre: "Edición", estados: ["editar", "editando"] },
  { id: "programado", nombre: "Programado", estados: ["programar", "programar_anuncios"] },
  { id: "publicado", nombre: "Publicado", estados: ["publicado"] },
];
const etapaDe = (estado: string) => ETAPAS.find((e) => e.estados.includes(estado))?.id ?? null;

type Pub = { nombre: string | null; estado: string; fecha_publicacion: string | null; tipo_contenido: string[] | null; plataformas: string[] | null; guion: string | null; carrusel_slides: unknown }

/* Guion en tabla «N° | Diálogo | Plano»: se separa en filas para mostrarlo como guion técnico. */
export function filasGuion(texto: string) {
  const filas = texto.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((c) => c.length >= 3);
  const datos = filas.filter((c) => /^\d+$/.test(c[0]));
  if (datos.length >= 2) return datos.slice(0, 8).map((c) => ({ n: c[0], dialogo: c[1].slice(0, 220), plano: c.slice(2).join(" ").slice(0, 260) }));
  return null;
}

export async function trabajoMarca(db: unknown, slug: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = db as any;
  const { data: marcas, error } = await any.from("marcas").select("id,slug,nombre").neq("slug", "interno");
  if (error) throw error;
  if (!slug) {
    /* Conteo exacto por marca (una consulta liviana por marca, sin traer filas). */
    const cuentas = await Promise.all((marcas ?? []).map(async (m: { id: string; slug: string; nombre: string }) => {
      const { count } = await any.from("publicaciones").select("id", { count: "exact", head: true }).eq("marca_id", m.id).is("archived_at", null).not("estado", "in", "(tareas,archivado)");
      return { slug: m.slug, nombre: m.nombre, publicaciones: count ?? 0 };
    }));
    return { marcas: cuentas.filter((m) => m.publicaciones >= 10).sort((a, b) => b.publicaciones - a.publicaciones) };
  }
  const marca = (marcas ?? []).find((m: { slug: string }) => m.slug === slug);
  if (!marca) return { error: "Marca no encontrada." };
  const [{ data: pubs, error: e1 }, { data: grabs }] = await Promise.all([
    any.from("publicaciones").select("nombre,estado,fecha_publicacion,tipo_contenido,plataformas,guion,carrusel_slides").eq("marca_id", marca.id).is("archived_at", null).not("estado", "in", "(tareas,archivado)").order("fecha_publicacion", { ascending: true }).limit(2000),
    any.from("grabaciones").select("fecha_planeada,fecha_real,estado,videos_grabados,duracion_min").eq("marca_id", marca.id).order("fecha_planeada", { ascending: false }).limit(8),
  ]);
  if (e1) throw e1;
  const lista: Pub[] = pubs ?? [];
  /* Ritmo: publicaciones planificadas por mes. */
  const porMes = new Map<string, { total: number; publicadas: number }>();
  for (const p of lista) {
    if (!p.fecha_publicacion) continue;
    const mes = p.fecha_publicacion.slice(0, 7);
    const x = porMes.get(mes) ?? { total: 0, publicadas: 0 };
    x.total++; if (p.estado === "publicado") x.publicadas++;
    porMes.set(mes, x);
  }
  const ritmo = [...porMes.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([mes, v]) => ({ mes, ...v }));
  /* Mes para la grilla: el de más publicaciones entre los últimos 4 con datos. */
  const recientes = ritmo.slice(-4);
  const mesGrilla = recientes.reduce((m, x) => (x.total > (m?.total ?? -1) ? x : m), recientes[0] as { mes: string; total: number } | undefined)?.mes ?? null;
  const grilla = mesGrilla ? lista.filter((p) => p.fecha_publicacion?.startsWith(mesGrilla)).map((p) => ({
    dia: Number(p.fecha_publicacion!.slice(8, 10)), nombre: (p.nombre ?? "Publicación").replace(/^\d+\.\s*/, "").slice(0, 60),
    etapa: etapaDe(p.estado), formato: Array.isArray(p.carrusel_slides) && p.carrusel_slides.length ? "Carrusel" : (p.tipo_contenido?.[0] ?? "Video"),
  })) : [];
  /* Flujo: cuántas piezas pasaron por cada etapa (total histórico). */
  const flujo = ETAPAS.map((e) => ({ id: e.id, nombre: e.nombre, piezas: lista.filter((p) => e.estados.includes(p.estado)).length }));
  /* Guiones reales: los dos primeros con formato técnico. */
  const guiones = lista.filter((p) => p.guion).map((p) => ({ titulo: (p.nombre ?? "").replace(/^\d+\.\s*/, "").slice(0, 70), filas: filasGuion(p.guion!) }))
    .filter((g) => g.filas).slice(0, 3);
  return {
    marca: { nombre: marca.nombre, slug: marca.slug },
    total: lista.length,
    publicadas: lista.filter((p) => p.estado === "publicado").length,
    conGuion: lista.filter((p) => p.guion?.trim()).length,
    ritmo, mesGrilla, grilla, flujo, guiones,
    grabaciones: (grabs ?? []).map((g: { fecha_planeada: string | null; fecha_real: string | null; estado: string; videos_grabados: number | null; duracion_min: number | null }) => ({
      fecha: (g.fecha_real ?? g.fecha_planeada ?? "").slice(0, 10), estado: String(g.estado), videos: g.videos_grabados, minutos: g.duracion_min,
    })),
  };
}
