import "server-only";
import { z } from "zod";
import { actor, StrategyError, type Actor } from "@/lib/estrategia/access";
import { strategyDB, transaction } from "@/lib/estrategia/db";
import { tipoPortada } from "@/lib/cliente/portada";
import type { ReviewData, DeliveryVersion, ReviewNote } from "./model";
const uuid = z.string().uuid();
export async function reviewActor(req?: Request) {
  const a = await actor(req);
  if (a.client || !a.member)
    throw new StrategyError("Este espacio es para el equipo", 403);
  if (
    !a.access.owner &&
    !a.permisos.diseno?.acceso &&
    !a.permisos.editor?.acceso &&
    !a.permisos.publicaciones?.acceso
  )
    throw new StrategyError("Sin permiso para revisar entregas", 403);
  if (req && req.method !== "GET" && !req.headers.get("origin"))
    throw new StrategyError("Origen no permitido", 403);
  return a;
}
export async function reviewPublication(a: Actor, id: string) {
  uuid.parse(id);
  const { rows } = await strategyDB().query(
    `SELECT p.id,p.nombre,p.marca_id,p.es_tarea_diseno,m.slug,m.nombre AS brand FROM publicaciones p JOIN marcas m ON m.id=p.marca_id WHERE p.id=$1 AND m.activa=true`,
    [id],
  );
  const p = rows[0] as ReviewData["publication"] | undefined;
  if (!p || (a.brands && !a.brands.includes(p.marca_id)))
    throw new StrategyError("Diseño o video no disponible para tu cuenta", 404);
  return p;
}
export async function reviewData(a: Actor, id: string): Promise<ReviewData> {
  const publication = await reviewPublication(a, id);
  const children = await strategyDB().query(
    `SELECT p.id,p.nombre FROM diseno_entregables d JOIN publicaciones p ON p.id=d.publicacion_id WHERE d.tarea_id=$1 AND p.marca_id=$2 ORDER BY d.orden`,
    [id, publication.marca_id],
  );
  const items = [
    { id: publication.id, nombre: publication.nombre },
    ...children.rows,
  ] as ReviewData["items"];
  const ids = items.map((i) => i.id);
  const [vs, ns, rs, sk] = await Promise.all([
    strategyDB().query(
      `SELECT v.*,p.nombre AS title,tm.nombre AS author FROM creative_versions v JOIN publicaciones p ON p.id=v.publicacion_id LEFT JOIN team_members tm ON tm.auth_user_id=v.created_by WHERE v.publicacion_id=ANY($1::uuid[]) ORDER BY v.created_at,v.version`,
      [ids],
    ),
    strategyDB().query(
      `SELECT n.id,n.version_id,n.round_id,n.created_at,n.text,n.requested_by,n.page,n.x,n.y,n.width,n.height,n.seconds,n.state,n.applied_version_id,jsonb_array_length(n.attachments) AS reference_count,tm.nombre AS author FROM creative_review_notes n JOIN creative_versions v ON v.id=n.version_id LEFT JOIN team_members tm ON tm.auth_user_id=n.created_by WHERE v.publicacion_id=ANY($1::uuid[]) ORDER BY n.created_at,n.id`,
      [ids],
    ),
    strategyDB().query(
      `SELECT r.* FROM creative_review_rounds r JOIN creative_versions v ON v.id=r.version_id WHERE v.publicacion_id=ANY($1::uuid[]) ORDER BY r.created_at`,
      [ids],
    ),
    strategyDB().query(
      `SELECT s.id,m.slug FROM strategy_records s JOIN marcas m ON m.id=s.marca_id WHERE s.marca_id=$2 AND (s.boceto_publicacion_id=$1 OR s.boceto_publicacion_id IN (SELECT tarea_id FROM diseno_entregables WHERE publicacion_id=$1))`,
      [id, publication.marca_id],
    ),
  ]);
  const sketch = sk.rows[0];
  return {
    publication,
    items,
    versions: vs.rows as DeliveryVersion[],
    notes: ns.rows.map(({ reference_count, ...n }) => ({
      ...n,
      attachments: Array.from(
        { length: reference_count },
        (_, i) => `/api/creative-review/reference/${n.id}/${i}`,
      ),
    })) as ReviewNote[],
    rounds: rs.rows,
    sketchHref: sketch
      ? `/marca/${sketch.slug}/estrategia/hoja/${sketch.id}`
      : null,
    canSketch: !!(publication.es_tarea_diseno || sketch) && (a.access.owner || (!!a.permisos.diseno?.acceso && !!a.permisos.marcas?.acceso)),
    manager: a.manager,
  };
}
const image = z
  .string()
  .max(1_500_000)
  .refine((s) => {
    const m = s.match(
      /^data:(image\/(?:png|jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/,
    );
    if (!m) return false;
    const b = Buffer.from(m[2], "base64");
    return b.length <= 1_000_000 && tipoPortada(b)?.mime === m[1];
  }, "Adjunta una imagen PNG, JPG o WebP de hasta 1 MB");
const coordinate = z.number().min(0).max(1).nullable().default(null);
const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("note"),
    id: uuid,
    versionId: uuid,
    text: z.string().trim().min(1).max(4000),
    requestedBy: z.string().trim().max(160).default("Cliente"),
    page: z.number().int().min(1).max(10000).default(1),
    x: coordinate,
    y: coordinate,
    width: coordinate,
    height: coordinate,
    seconds: z.number().min(0).max(86400).nullable().default(null),
    attachments: z.array(image).max(3).default([]),
  }),
  z.object({
    action: z.literal("state"),
    id: uuid,
    state: z.enum(["pendiente", "en_proceso", "aplicado", "validado"]),
    appliedVersionId: uuid.nullable().default(null),
  }),
  z.object({ action: z.literal("closeRound"), versionId: uuid }),
  z.object({
    action: z.literal("exclude"),
    versionId: uuid,
    reason: z.string().trim().min(8).max(500).nullable(),
  }),
  z.object({
    action: z.literal("manualVersion"),
    versionId: uuid,
    requestId: uuid,
  }),
  z.object({
    action: z.literal("delivery"),
    publicationId: uuid,
    slot: z
      .string()
      .regex(
        /^(diseno|portada|video_con_musica|video_sin_musica|slide_[1-9][0-9]?)$/,
      ),
    url: z
      .string()
      .trim()
      .url()
      .max(4000)
      .refine((s) => {
        const u = new URL(s);
        return (
          ["https:", "http:"].includes(u.protocol) && !u.username && !u.password
        );
      }, "Usa un enlace web sin credenciales"),
  }),
]);
export async function mutateReview(a: Actor, id: string, raw: unknown) {
  const p = await reviewPublication(a, id);
  const input = inputSchema.parse(raw);
  return transaction(async (c) => {
    // Lock all delivery children in a stable order; the database trigger serializes link versions.
    const { rows: pubs } = await c.query(
      `SELECT p.id FROM publicaciones p WHERE p.marca_id=$2 AND (p.id=$1 OR p.id IN (SELECT publicacion_id FROM diseno_entregables WHERE tarea_id=$1)) ORDER BY p.id FOR UPDATE`,
      [id, p.marca_id],
    );
    const ids = pubs.map((r) => r.id);
    const version = async (vid: string) => {
      const { rows } = await c.query(
        "SELECT * FROM creative_versions WHERE id=$1 AND publicacion_id=ANY($2::uuid[])",
        [vid, ids],
      );
      if (!rows[0]) throw new StrategyError("Versión no disponible", 404);
      return rows[0] as DeliveryVersion;
    };
    const event = async (
      vid: string,
      action: string,
      detail: unknown = {},
      noteId: string | null = null,
    ) =>
      c.query(
        "INSERT INTO creative_review_events(version_id,note_id,actor_id,action,detail) VALUES($1,$2,$3,$4,$5)",
        [vid, noteId, a.user.id, action, JSON.stringify(detail)],
      );
    if (input.action === "delivery") {
      if (!ids.includes(input.publicationId))
        throw new StrategyError("Entrega de otra tarea", 403);
      const fields: Record<string, string> = {
        diseno: "drive_resultado_url",
        portada: "portada_editada_url",
        video_con_musica: "video_con_musica_url",
        video_sin_musica: "video_sin_musica_url",
      };
      if (input.slot.startsWith("slide_")) {
        const index = Number(input.slot.slice(6)) - 1;
        if (index >= 20) throw new StrategyError("Máximo 20 láminas");
        const { rows } = await c.query(
          "SELECT carrusel_slides FROM publicaciones WHERE id=$1",
          [input.publicationId],
        );
        const slides: string[] = Array.isArray(rows[0].carrusel_slides)
          ? rows[0].carrusel_slides
          : [];
        while (slides.length <= index) slides.push("");
        slides[index] = input.url;
        await c.query(
          "UPDATE publicaciones SET carrusel_slides=$2,drive_resultado_url=$3,portada_editada_url=$3,updated_by=$4 WHERE id=$1",
          [
            input.publicationId,
            JSON.stringify(slides),
            slides[0] || null,
            a.user.id,
          ],
        );
        await c.query(
          "UPDATE diseno_entregables SET slides=$2,link=$3 WHERE publicacion_id=$1",
          [input.publicationId, JSON.stringify(slides), slides[0] || null],
        );
      } else {
        const field = fields[input.slot];
        const mirrors =
          input.slot === "diseno"
            ? `,portada_editada_url=CASE WHEN EXISTS(SELECT 1 FROM diseno_entregables WHERE publicacion_id=$1) THEN $2 ELSE portada_editada_url END`
            : "";
        await c.query(
          `UPDATE publicaciones SET ${field}=$2${mirrors},updated_by=$3 WHERE id=$1`,
          [input.publicationId, input.url, a.user.id],
        );
        if (input.slot === "diseno")
          await c.query(
            "UPDATE diseno_entregables SET link=$2 WHERE publicacion_id=$1",
            [input.publicationId, input.url],
          );
      }
      return { ok: true };
    }
    if (input.action === "state") {
      const { rows } = await c.query(
        "SELECT * FROM creative_review_notes WHERE id=$1 FOR UPDATE",
        [input.id],
      );
      const note = rows[0];
      if (!note) throw new StrategyError("Observación no disponible", 404);
      const v = await version(note.version_id);
      let applied: string | null = null;
      if (input.appliedVersionId) {
        const target = await version(input.appliedVersionId);
        if (
          target.publicacion_id !== v.publicacion_id ||
          target.slot !== v.slot ||
          target.version < v.version
        )
          throw new StrategyError("Selecciona una versión de esta misma pieza");
        applied = target.id;
      }
      await c.query(
        "UPDATE creative_review_notes SET state=$2,applied_version_id=$3,updated_at=now() WHERE id=$1",
        [note.id, input.state, applied],
      );
      await event(
        v.id,
        "estado_observacion",
        { from: note.state, to: input.state, appliedVersionId: applied },
        note.id,
      );
      return { ok: true };
    }
    const v = await version(input.versionId);
    if (input.action === "note") {
      const existing = await c.query(
        "SELECT version_id,created_by FROM creative_review_notes WHERE id=$1",
        [input.id],
      );
      if (existing.rowCount) {
        if (
          existing.rows[0].version_id !== v.id ||
          existing.rows[0].created_by !== a.user.id
        )
          throw new StrategyError("Solicitud duplicada incompatible", 409);
        return { ok: true };
      }
      if ((input.x === null) !== (input.y === null))
        throw new StrategyError("Marca un punto completo");
      if (
        (input.width === null) !== (input.height === null) ||
        (input.width !== null &&
          (input.x === null ||
            input.y === null ||
            input.x + input.width > 1.000001 ||
            input.y + (input.height || 0) > 1.000001))
      )
        throw new StrategyError("La zona debe quedar dentro del archivo");
      if (v.category !== "video" && input.seconds !== null)
        throw new StrategyError("El tiempo solo se usa en videos");
      let r = await c.query(
        "SELECT id FROM creative_review_rounds WHERE version_id=$1 AND closed_at IS NULL",
        [v.id],
      );
      if (!r.rowCount)
        r = await c.query(
          "INSERT INTO creative_review_rounds(version_id,created_by) VALUES($1,$2) RETURNING id",
          [v.id, a.user.id],
        );
      await c.query(
        `INSERT INTO creative_review_notes(id,version_id,round_id,created_by,text,requested_by,page,x,y,width,height,seconds,attachments) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          input.id,
          v.id,
          r.rows[0].id,
          a.user.id,
          input.text,
          input.requestedBy,
          input.page,
          input.x,
          input.y,
          input.width,
          input.height,
          input.seconds,
          JSON.stringify(input.attachments),
        ],
      );
      await event(v.id, "observacion_creada", {}, input.id);
      return { ok: true };
    }
    if (input.action === "closeRound") {
      await c.query(
        "UPDATE creative_review_rounds SET closed_at=now() WHERE version_id=$1 AND closed_at IS NULL",
        [v.id],
      );
      return { ok: true };
    }
    if (input.action === "exclude") {
      if (!a.manager)
        throw new StrategyError("Solo dirección puede corregir el conteo", 403);
      await c.query(
        "UPDATE creative_versions SET exclusion_reason=$2,excluded_by=$3 WHERE id=$1",
        [v.id, input.reason, a.user.id],
      );
      await event(v.id, "correccion_conteo", { reason: input.reason });
      return { ok: true };
    }
    if (input.action === "manualVersion") {
      const old = await c.query(
        "SELECT publicacion_id,slot FROM creative_versions WHERE request_id=$1",
        [input.requestId],
      );
      if (old.rowCount) {
        if (
          old.rows[0].publicacion_id !== v.publicacion_id ||
          old.rows[0].slot !== v.slot
        )
          throw new StrategyError("Solicitud incompatible", 409);
        return { ok: true };
      }
      const {
        rows: [latest],
      } = await c.query(
        "SELECT * FROM creative_versions WHERE publicacion_id=$1 AND slot=$2 ORDER BY version DESC LIMIT 1",
        [v.publicacion_id, v.slot],
      );
      if (latest.id !== v.id)
        throw new StrategyError(
          "Actualiza la pantalla: ya hay una entrega posterior",
          409,
        );
      const {
        rows: [created],
      } = await c.query(
        `INSERT INTO creative_versions(publicacion_id,slot,category,label,version,url,asset_key,created_by,counts_change,request_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9) RETURNING id`,
        [
          v.publicacion_id,
          v.slot,
          v.category,
          v.label,
          v.version + 1,
          v.url,
          latest.asset_key,
          a.user.id,
          input.requestId,
        ],
      );
      await event(created.id, "version_mismo_enlace");
      return { ok: true };
    }
  });
}
export async function reviewVersion(a: Actor, vid: string) {
  uuid.parse(vid);
  const { rows } = await strategyDB().query(
    "SELECT * FROM creative_versions WHERE id=$1",
    [vid],
  );
  if (!rows[0]) throw new StrategyError("Versión no encontrada", 404);
  await reviewPublication(a, rows[0].publicacion_id);
  return rows[0] as DeliveryVersion;
}
