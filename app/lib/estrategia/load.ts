/* eslint-disable @typescript-eslint/no-explicit-any */
import "server-only";
import { designFinished } from "./activity-status";
import { scopeTasks, taskAssignable } from "@/lib/tareas/access";
import { type Actor, brandAccess } from "./access";
import { strategyDB } from "./db";
import { type Activity, type StrategyRecord, todayLima } from "./model";

export async function loadBrand(a: Actor, slug: string) {
  const brand = await brandAccess(a, slug),
    db = a.service;
  const warnings: string[] = [];
  async function read(name: string, q: PromiseLike<any>) {
    const r = await q;
    if (r.error) {
      warnings.push(`No se pudo actualizar ${name}.`);
      return null;
    }
    return r.data ?? [];
  }
  const canPub = a.access.owner || a.permisos.publicaciones?.acceso === true,
    canDesign = a.access.owner || a.permisos.diseno?.acceso === true,
    canEdit = a.access.owner || a.permisos.editor?.acceso === true;
  const [
    pubs,
    tasks,
    recordings,
    meetings,
    dates,
    team,
    profile,
    batches,
    observations,
    notes,
    records,
    links,
  ] = await Promise.all([
    canPub || canDesign || canEdit
      ? read(
          "contenidos",
          db
            .from("publicaciones")
            .select(
              "id,nombre,estado,estado_tarea,es_tarea_diseno,fecha_publicacion,hora_publicacion,fecha_edicion,fecha_diseno,fecha_entrega,editor_nombre,editor_id,disenador_nombre,editado,disenado,diseno_terminado_at,archived_at,aprobado_cliente_at,publicado_at,drive_resultado_url,portada_editada_url,tipo_contenido",
            )
            .eq("marca_id", brand.id)
            .is("archived_at", null)
            .or("estado.is.null,estado.neq.archivado")
            .or("estado_tarea.is.null,estado_tarea.neq.archivado")
            .order("created_at", { ascending: false })
            .limit(1800),
        )
      : [],
    read(
      "tareas",
      scopeTasks(
        db
          .from("tareas")
          .select(
            "id,texto,team_member_id,created_by,marca_slug,categoria,fecha_entrega,hora_entrega,estado,completada,diseno_id,created_at,miembro:team_members!tareas_team_member_id_fkey(nombre)",
          )
          .or(
            `marca_slug.eq.${slug},categoria.ilike."${brand.nombre.replace(/[\"\\]/g, "")}"`,
          )
          .order("created_at", { ascending: false })
          .limit(1500),
        a.access,
      ),
    ),
    canPub
      ? read(
          "grabaciones",
          db
            .from("grabaciones")
            .select(
              "id,fecha_planeada,hora_planeada,fecha_real,estado,videos_grabados,notas,enlace_guiones",
            )
            .eq("marca_id", brand.id)
            .order("fecha_planeada", { ascending: false })
            .limit(500),
        )
      : [],
    canPub
      ? read(
          "reuniones",
          db
            .from("marca_reuniones")
            .select("id,titulo,fecha_hora,estado,modalidad,lugar_enlace")
            .eq("marca_id", brand.id)
            .order("fecha_hora", { ascending: false })
            .limit(500),
        )
      : [],
    read(
      "fechas importantes",
      db
        .from("fechas_importantes")
        .select("id,titulo,fecha,nota")
        .eq("marca_id", brand.id)
        .order("fecha")
        .limit(500),
    ),
    read(
      "equipo",
      db
        .from("team_members")
        .select("id,nombre,rol_base,marcas_acceso")
        .eq("activo", true)
        .order("nombre"),
    ),
    read(
      "contexto de marca",
      db
        .from("creative_brand_profiles")
        .select("data,revision,updated_at")
        .eq("marca_id", brand.id),
    ),
    read(
      "guiones",
      db
        .from("creative_batches")
        .select("id,name,recording_id,data,updated_at")
        .eq("marca_id", brand.id)
        .order("updated_at", { ascending: false })
        .limit(100),
    ),
    read(
      "observaciones del cliente",
      db
        .from("marca_observaciones")
        .select("id,texto,autor_nombre,atendida,created_at")
        .eq("marca_id", brand.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ),
    read(
      "reuniones anteriores",
      db
        .from("notas_reuniones")
        .select("id,titulo,resumen,created_at,privada,team_member_id")
        .eq("marca_id", brand.id)
        .order("created_at", { ascending: false })
        .limit(100),
    ),
    strategyDB().query(
      "SELECT * FROM strategy_records WHERE marca_id=$1 ORDER BY updated_at DESC",
      [brand.id],
    ),
    strategyDB().query("SELECT * FROM strategy_links WHERE marca_id=$1", [
      brand.id,
    ]),
  ]);
  if (pubs?.length === 1800 || tasks?.length === 1500)
    warnings.push(
      "Se muestran los registros más recientes; abre el módulo de origen para consultar todo el historial.",
    );
  const activities: Activity[] = [];
  const add = (x: Activity) => activities.push(x);
  const publications = (pubs ?? []).filter((p: any) =>
    p.es_tarea_diseno
      ? canDesign
      : canPub ||
        (canEdit &&
          (!a.permisos.editor?.solo_propias ||
            p.editor_id === a.member.id ||
            p.editor_nombre === a.member.nombre)),
  );
  for (const p of publications) {
    const base = {
      sourceId: p.id,
      source: "publication" as const,
      title: p.nombre || "Sin título",
      state: p.estado || "Pendiente",
      href: `/${p.es_tarea_diseno ? "diseno" : "publicaciones"}/${p.id}`,
    };
    if (!p.es_tarea_diseno && canPub)
      add({
        ...base,
        id: `pub:${p.id}`,
        kind: "Publicación",
        date: p.fecha_publicacion,
        time: p.hora_publicacion ?? "",
        done: !!p.publicado_at || p.estado === "publicado",
        owner: p.editor_nombre || "Sin asignar",
      });
    if (canDesign && (p.es_tarea_diseno || p.fecha_diseno))
      add({
        ...base,
        id: `design:${p.id}`,
        kind: "Diseño",
        date: p.fecha_entrega || p.fecha_diseno,
        done: designFinished(p),
        owner: p.disenador_nombre || "Sin asignar",
        state: p.estado_tarea || "Pendiente",
        delivery: true,
      });
    if (
      canEdit &&
      !p.es_tarea_diseno &&
      (p.fecha_edicion || p.estado === "editar" || p.editor_nombre)
    )
      add({
        ...base,
        id: `edit:${p.id}`,
        kind: "Edición",
        date: p.fecha_edicion || p.fecha_entrega,
        done: !!p.editado,
        owner: p.editor_nombre || "Sin asignar",
        state: p.editado ? "Edición terminada" : p.estado_tarea || p.estado,
        delivery: true,
      });
  }
  const designIds = new Set(
    publications
      .filter((p: any) => p.es_tarea_diseno && canDesign)
      .map((p: any) => p.id),
  );
  for (const t of tasks ?? [])
    if (!t.diseno_id || !designIds.has(t.diseno_id))
      add({
        id: `task:${t.id}`,
        sourceId: t.id,
        source: "task",
        title: t.texto,
        kind: "Tarea",
        date: t.fecha_entrega,
        time: t.hora_entrega ?? "",
        state: t.completada ? "Terminada" : t.estado || "sin_empezar",
        done: t.completada,
        owner:
          (Array.isArray(t.miembro) ? t.miembro[0] : t.miembro)?.nombre ||
          "Sin asignar",
        href: `/tareas?marca=${slug}&tarea=${t.id}`,
        delivery: true,
      });
  for (const r of recordings ?? [])
    add({
      id: `recording:${r.id}`,
      sourceId: r.id,
      source: "recording",
      title: `Grabación · ${brand.nombre}`,
      kind: "Grabación",
      date: r.fecha_planeada,
      time: r.hora_planeada || "",
      state: r.estado,
      done: !!r.fecha_real || r.estado === "realizada",
      owner: "Equipo audiovisual",
      href: `/grabaciones/calendario?marca=${slug}`,
    });
  for (const r of meetings ?? []) {
    const d = new Date(r.fecha_hora);
    add({
      id: `meeting:${r.id}`,
      sourceId: r.id,
      source: "meeting",
      title: r.titulo,
      kind: "Reunión",
      date: new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Lima",
      }).format(d),
      time: new Intl.DateTimeFormat("en-GB", {
        timeZone: "America/Lima",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d),
      state: r.estado || "Programada",
      done: r.estado === "realizada",
      owner: "Equipo",
      href: `/grabaciones/calendario?marca=${slug}`,
    });
  }
  for (const r of dates ?? [])
    add({
      id: `date:${r.id}`,
      sourceId: r.id,
      source: "date",
      title: r.titulo,
      kind: "Fecha importante",
      date: r.fecha,
      state: "Fecha importante",
      done: false,
      owner: "Marca",
      href: "/fechas-importantes",
    });
  const visibleTargets = new Set(
    activities.map((x) => `${x.source}:${x.sourceId}`),
  );
  return {
    brand,
    records: JSON.parse(JSON.stringify(records.rows)) as StrategyRecord[],
    links: links.rows.filter((l) =>
      visibleTargets.has(`${l.target_type}:${l.target_id}`),
    ),
    activities,
    recordings,
    publications,
    observations,
    profile: profile?.[0] ?? null,
    batches: batches ?? [],
    notes: (notes ?? []).filter(
      (n: any) => !n.privada || n.team_member_id === a.member.id,
    ),
    team: (team ?? [])
      .filter(
        (m: any) => !m.marcas_acceso || m.marcas_acceso.includes(brand.id),
      )
      .map((m: any) => ({
        id: m.id,
        nombre: m.nombre,
        rol: m.rol_base,
        assignable: taskAssignable(a.access, m.id),
      })),
    me: {
      id: a.member.id,
      name: a.member.nombre,
      manager: a.manager,
      assign: a.access.assign,
    },
    warnings,
    today: todayLima(),
  };
}
export type BrandPayload = Awaited<ReturnType<typeof loadBrand>>;
