import "server-only";
import https from "node:https";
import { lookup } from "node:dns/promises";
import { Readable } from "node:stream";
import type { IncomingMessage } from "node:http";
import { publicAddress } from "@/lib/creative-studio/web-source";
import { idPortadaDrive, tipoPortada } from "@/lib/cliente/portada";
import { StrategyError } from "@/lib/estrategia/access";
import type { DeliveryVersion } from "./model";
import { strategyDB } from "@/lib/estrategia/db";
import {
  metaArchivo,
  dentroDeRaiz,
  driveFolderId,
} from "@/lib/integrations/google-drive";

export async function openMedia(
  input: string,
  range: string | null,
  redirects = 0,
  driveToken?: string,
): Promise<IncomingMessage> {
  const u = new URL(input);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    redirects > 4
  )
    throw new StrategyError(
      "El previsualizador necesita un enlace HTTPS directo a un archivo",
      422,
    );
  const addresses = await lookup(u.hostname.replace(/^\[|\]$/g, ""), {
    all: true,
  });
  if (!addresses.length || addresses.some((a) => !publicAddress(a.address)))
    throw new StrategyError(
      "El archivo debe estar en un servidor público",
      422,
    );
  const res = await new Promise<IncomingMessage>((resolve, reject) => {
    const req = https.get(
      u,
      {
        headers: {
          "User-Agent": "Distinto-Review/1.0",
          ...(driveToken && u.origin === "https://www.googleapis.com"
            ? { Authorization: `Bearer ${driveToken}` }
            : {}),
          ...(range ? { Range: range } : {}),
        },
        family: addresses[0].family,
        lookup: (_h, _o, cb) =>
          cb(null, addresses[0].address, addresses[0].family),
      },
      resolve,
    );
    req.setTimeout(30000, () =>
      req.destroy(new Error("El archivo tardó demasiado en responder")),
    );
    req.on("error", reject);
  });
  if (
    [301, 302, 303, 307, 308].includes(res.statusCode || 0) &&
    res.headers.location
  ) {
    res.destroy();
    return openMedia(
      new URL(res.headers.location, u).href,
      range,
      redirects + 1,
    );
  }
  if (![200, 206].includes(res.statusCode || 0)) {
    res.destroy();
    throw new StrategyError(
      "No se pudo abrir el archivo. Revisa su enlace y acceso.",
      422,
    );
  }
  return res;
}
async function mediaSource(v: DeliveryVersion) {
  const id = idPortadaDrive(v.url);
  return id
    ? `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`
    : v.url;
}
export async function serveMedia(v: DeliveryVersion, req: Request) {
  const probe = new URL(req.url).searchParams.has("info");
  const range = probe ? "bytes=0-65535" : req.headers.get("range");
  if (range && !/^bytes=\d*-\d*$/.test(range))
    throw new StrategyError("Rango no válido", 416);
  let upstream: IncomingMessage;
  try {
    upstream = await openMedia(await mediaSource(v), range);
    if (
      idPortadaDrive(v.url) &&
      String(upstream.headers["content-type"]).includes("text/html")
    ) {
      upstream.destroy();
      throw new Error("Private Drive file");
    }
  } catch (publicError) {
    const fileId = idPortadaDrive(v.url);
    if (!fileId) throw publicError;
    const { rows } = await strategyDB().query(
      "SELECT m.drive_url FROM publicaciones p JOIN marcas m ON m.id=p.marca_id WHERE p.id=$1",
      [v.publicacion_id],
    );
    const root = driveFolderId(rows[0]?.drive_url);
    const meta = root ? await metaArchivo(fileId) : null;
    if (!root || !meta || !(await dentroDeRaiz(fileId, root, meta.token)))
      throw new StrategyError(
        "No se pudo acceder a este archivo. Comprueba su permiso o que pertenezca a la carpeta de Drive de la marca.",
        422,
      );
    upstream = await openMedia(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
      range,
      0,
      meta.token,
    );
  }
  const type = String(upstream.headers["content-type"] || "").split(";")[0];
  // A server-held link is the only source; callers cannot supply a proxy URL.
  if (type.includes("html") || type.includes("svg") || type.includes("json")) {
    upstream.destroy();
    throw new StrategyError(
      "Este enlace abre una página o carpeta. Usa el enlace directo de la imagen, PDF o video.",
      422,
    );
  }
  let mime = type;
  if (probe) {
    const iterator = upstream[Symbol.asyncIterator]();
    const part = await iterator.next();
    const bytes = Buffer.from(part.value || []);
    const image = tipoPortada(bytes);
    if (image) mime = image.mime;
    else if (bytes.subarray(0, 5).toString() === "%PDF-")
      mime = "application/pdf";
    else if (
      bytes.subarray(4, 8).toString() === "ftyp" ||
      /^video\//.test(type)
    )
      mime = type.startsWith("video/") ? type : "video/mp4";
    else if (bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])))
      mime = "video/webm";
    else {
      upstream.destroy();
      throw new StrategyError(
        "Formato no compatible. Usa JPG, PNG, WebP, PDF, MP4 o WebM.",
        422,
      );
    }
    upstream.destroy();
    return Response.json(
      { mime },
      { headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    !/^(image\/(png|jpeg|webp|gif|avif)|application\/pdf|video\/|application\/octet-stream)/.test(
      mime,
    )
  ) {
    upstream.destroy();
    throw new StrategyError(
      "No se pudo identificar el formato del archivo",
      422,
    );
  }
  const headers = new Headers({
    "Content-Type": mime,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'none'; sandbox",
    "Accept-Ranges": "bytes",
  });
  for (const k of ["content-length", "content-range"]) {
    const value = upstream.headers[k];
    if (value) headers.set(k, String(value));
  }
  return new Response(Readable.toWeb(upstream) as ReadableStream, {
    status: upstream.statusCode,
    headers,
  });
}
