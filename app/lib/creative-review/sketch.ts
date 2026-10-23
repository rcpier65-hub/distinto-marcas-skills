import "server-only";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { z } from "zod";
import { type Actor, StrategyError } from "@/lib/estrategia/access";
import { strategyDB, transaction } from "@/lib/estrategia/db";
import { permitirBoceto } from "@/lib/diseno/boceto";
import { reviewPublication } from "./server";
import { serveMedia } from "./media";
import type { DeliveryVersion } from "./model";

const inputSchema = z.object({
  versionId: z.string().uuid(),
  page: z.number().int().min(1).max(10000).default(1),
  seconds: z.number().min(0).max(86400).nullable().default(null),
  image: z
    .string()
    .max(3_000_000)
    .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/)
    .optional(),
  create: z.boolean().default(false),
});

type Element = Record<string, unknown> & {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isDeleted: boolean;
};

export async function sketchVersion(a: Actor, id: string, raw: unknown) {
  const input = inputSchema.parse(raw);
  const pub = await reviewPublication(a, id);
  await permitirBoceto(a, pub.slug);
  // A child deliverable always uses its design task's canonical planning sheet.
  const parent = (
    await strategyDB().query(
      `SELECT p.* FROM publicaciones p WHERE p.marca_id=$2 AND p.es_tarea_diseno AND (p.id=$1 OR p.id IN (SELECT tarea_id FROM diseno_entregables WHERE publicacion_id=$1)) ORDER BY (p.id=$1) ASC LIMIT 1`,
      [id, pub.marca_id],
    )
  ).rows[0];
  if (!parent)
    throw new StrategyError(
      "Esta entrega no pertenece a una tarea de Diseño",
      400,
    );
  const version = (
    await strategyDB().query(
      `SELECT v.*,p.nombre AS title FROM creative_versions v JOIN publicaciones p ON p.id=v.publicacion_id WHERE v.id=$1 AND p.marca_id=$3 AND (p.id=$2 OR p.id IN (SELECT publicacion_id FROM diseno_entregables WHERE tarea_id=$2))`,
      [input.versionId, parent.id, pub.marca_id],
    )
  ).rows[0] as DeliveryVersion | undefined;
  if (!version)
    throw new StrategyError("Versión no disponible en esta tarea", 404);
  const anchorId = `delivery-${version.id}-p${input.page}-t${input.seconds === null ? "image" : Math.round(input.seconds * 1000)}`;
  const existing = (
    await strategyDB().query(
      `SELECT r.id,r.archived,s.elements FROM strategy_records r JOIN strategy_scenes s ON s.sheet_id=r.id WHERE r.boceto_publicacion_id=$1 AND r.marca_id=$2`,
      [parent.id, pub.marca_id],
    )
  ).rows[0];
  const result = (sheetId: string, inserted: boolean) => ({
    href: `/marca/${pub.slug}/estrategia/hoja/${sheetId}?zona=${anchorId}`,
    anchorId,
    inserted,
  });
  if (existing?.archived || parent.archived_at || parent.estado_tarea === "archivado")
    throw new StrategyError("El boceto está archivado", 409);
  // Deleted imported bases are tombstones too: don't resurrect a deliberate removal.
  if (existing?.elements.some((e: Element) => e.id === anchorId))
    return result(existing.id, false);
  if (!existing && !input.create)
    throw new StrategyError(
      "Activa el boceto de esta tarea para incorporar sus entregas",
      409,
    );
  let bytes: Buffer;
  if (input.image) {
    bytes = Buffer.from(input.image.split(",")[1], "base64");
  } else {
    const response = await serveMedia(
      version,
      new Request("https://distinto.internal/media"),
    );
    if (
      !/^image\/(png|jpeg|webp|gif|avif)(;|$)/i.test(
        response.headers.get("content-type") || "",
      )
    ) {
      await response.body?.cancel();
      return {
        requiresPreview: true,
        message:
          "Abre el PDF o video en Revisión para llevar una página o fotograma al boceto.",
      };
    }
    const reader = response.body!.getReader();
    const chunks: Uint8Array[] = [];
    let length = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 20_000_000)
          throw new StrategyError(
            "La imagen supera 20 MB; abre su vista previa para incorporarla",
            413,
          );
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    bytes = Buffer.concat(chunks);
  }
  let picture;
  try {
    const source = sharp(bytes, { limitInputPixels: 50_000_000 });
    const meta = await source.metadata();
    if (
      !["png", "jpeg", "webp", "gif", "avif", "heif"].includes(
        meta.format || "",
      )
    )
      throw Error();
    picture = await source
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: 86 })
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new StrategyError(
      "No se pudo preparar la imagen del boceto. Usa PNG, JPG o WebP.",
      422,
    );
  }
  if (picture.data.length > 1_500_000)
    throw new StrategyError(
      "Reduce el tamaño de la imagen antes de añadirla al boceto",
      413,
    );
  return transaction(async (c) => {
    // Lock the task before its sheet, matching the existing sketch trigger order.
    const task = (
      await c.query(
        "SELECT * FROM publicaciones WHERE id=$1 AND marca_id=$2 FOR UPDATE",
        [parent.id, pub.marca_id],
      )
    ).rows[0];
    if (!task || !task.es_tarea_diseno || task.archived_at || task.estado_tarea === "archivado")
      throw new StrategyError(
        "La tarea cambió de marca o está archivada. Actualiza la página.",
        409,
      );
    let sheet = (
      await c.query(
        "SELECT * FROM strategy_records WHERE boceto_publicacion_id=$1",
        [parent.id],
      )
    ).rows[0];
    if (!sheet) {
      const sheetId = randomUUID();
      sheet = (
        await c.query(
          `INSERT INTO strategy_records(id,marca_id,kind,title,data,created_by,boceto_publicacion_id) VALUES($1,$2,'sheet',$3,$4,$5,$6) RETURNING *`,
          [
            sheetId,
            pub.marca_id,
            `Boceto · ${task.nombre}`,
            JSON.stringify({
              state: "Borrador",
              sharedWithClient: false,
              ownerId: a.member.id,
              objective: "Boceto y referencias de la tarea de Diseño",
            }),
            a.member.id,
            parent.id,
          ],
        )
      ).rows[0];
      await c.query("INSERT INTO strategy_scenes(sheet_id) VALUES($1)", [
        sheetId,
      ]);
      await c.query("UPDATE publicaciones SET tiene_boceto=true WHERE id=$1", [
        parent.id,
      ]);
    }
    if (sheet.archived || sheet.marca_id !== pub.marca_id)
      throw new StrategyError("Boceto no disponible", 409);
    const scene = (
      await c.query(
        "SELECT * FROM strategy_scenes WHERE sheet_id=$1 FOR UPDATE",
        [sheet.id],
      )
    ).rows[0];
    if (scene.elements.some((e: Element) => e.id === anchorId))
      return result(sheet.id, false);
    const elements: Element[] = scene.elements;
    const x =
      Math.max(
        0,
        ...elements
          .filter((e) => !e.isDeleted)
          .map((e) => (Number(e.x) || 0) + Math.abs(Number(e.width) || 0)),
      ) + 120;
    const y = 80;
    const scale = Math.min(
      1,
      760 / picture.info.width,
      850 / picture.info.height,
    );
    const width = Math.round(picture.info.width * scale),
      height = Math.round(picture.info.height * scale);
    const now = Date.now(),
      fileId = `file-${anchorId}`;
    const label = `${version.label || version.slot} · V${version.version} · ${version.title}${input.page > 1 ? ` · página ${input.page}` : ""}${input.seconds !== null ? ` · ${input.seconds.toFixed(1)} s` : ""}`;
    const common = {
      angle: 0,
      strokeColor: "#6d4acb",
      backgroundColor: "transparent",
      fillStyle: "solid",
      strokeWidth: 2,
      strokeStyle: "solid",
      roundness: null,
      roughness: 0,
      opacity: 100,
      seed: 1,
      version: 1,
      versionNonce: 1,
      index: null,
      isDeleted: false,
      groupIds: [],
      frameId: null,
      boundElements: null,
      updated: now,
      link: null,
      locked: false,
    };
    const added = [
      {
        ...common,
        id: `${anchorId}-label`,
        type: "text",
        x,
        y,
        width: 1120,
        height: 56,
        text: label,
        originalText: label,
        fontSize: 22,
        fontFamily: 2,
        textAlign: "left",
        verticalAlign: "top",
        containerId: null,
        autoResize: false,
        lineHeight: 1.25,
      },
      {
        ...common,
        id: anchorId,
        type: "image",
        x,
        y: y + 80,
        width,
        height,
        fileId,
        scale: [1, 1],
        status: "saved",
        crop: null,
        locked: true,
        customData: {
          deliveryVersionId: version.id,
          deliveryLabel: label,
          page: input.page,
          seconds: input.seconds,
          importedAt: new Date().toISOString(),
        },
      },
      {
        ...common,
        id: `${anchorId}-references`,
        type: "rectangle",
        x: x + width + 50,
        y: y + 80,
        width: 420,
        height: Math.max(320, height),
        strokeStyle: "dashed",
        strokeColor: "#c7b9e8",
        backgroundColor: "#f6f1ff",
      },
      {
        ...common,
        id: `${anchorId}-hint`,
        type: "text",
        x: x + width + 70,
        y: y + 105,
        width: 380,
        height: 70,
        text: "Referencias y propuestas\nPega capturas, dibuja y añade notas",
        originalText:
          "Referencias y propuestas\nPega capturas, dibuja y añade notas",
        fontSize: 18,
        fontFamily: 2,
        textAlign: "left",
        verticalAlign: "top",
        containerId: null,
        autoResize: false,
        lineHeight: 1.25,
      },
    ];
    const files = {
      ...scene.files,
      [fileId]: {
        id: fileId,
        mimeType: "image/webp",
        dataURL: `data:image/webp;base64,${picture.data.toString("base64")}`,
        created: now,
      },
    };
    const merged = [...elements, ...added];
    if (
      JSON.stringify({ elements: merged, files }).length > 15_000_000 ||
      merged.length > 6000
    )
      throw new StrategyError(
        "El lienzo está lleno. Reduce las referencias o crea otra hoja antes de añadir más versiones.",
        413,
      );
    await c.query(
      `INSERT INTO strategy_history(record_id,actor_id,label,snapshot) VALUES($1,$2,'Antes de incorporar entrega',$3)`,
      [sheet.id, a.user.id, JSON.stringify({ elements, files: scene.files })],
    );
    await c.query(
      "DELETE FROM strategy_history WHERE record_id=$1 AND id NOT IN (SELECT id FROM strategy_history WHERE record_id=$1 ORDER BY id DESC LIMIT 30)",
      [sheet.id],
    );
    await c.query(
      "UPDATE strategy_scenes SET elements=$2,files=$3,revision=revision+1,updated_at=now() WHERE sheet_id=$1",
      [sheet.id, JSON.stringify(merged), JSON.stringify(files)],
    );
    return result(sheet.id, true);
  });
}
