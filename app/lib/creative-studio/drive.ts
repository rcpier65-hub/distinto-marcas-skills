import "server-only";
import { getValidAccessToken } from "@/lib/integrations/google-calendar";
import { driveFolderId, dentroDeRaiz } from "@/lib/integrations/google-drive";
import { type Actor, StudioError } from "./server";
export async function driveContext(
  a: Actor,
  brand: { drive_url: string | null },
  folder: string | null,
) {
  const { data, error } = await a.db
    .from("google_oauth_tokens")
    .select("scope")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw error;
  if (
    !data?.scope?.split(" ").includes("https://www.googleapis.com/auth/drive")
  )
    throw new StudioError(
      "Autoriza Google Drive para elegir carpetas y guardar el Word.",
      428,
    );
  const token = await getValidAccessToken();
  if (!token)
    throw new StudioError("Reconecta Google Drive para continuar.", 428);
  const root = a.manager ? "root" : driveFolderId(brand.drive_url);
  if (!root)
    throw new StudioError(
      "La marca necesita una carpeta de Drive configurada por un administrador.",
      403,
    );
  const id = folder || root;
  if (!/^[\w-]{1,180}$/.test(id)) throw new StudioError("Carpeta inválida");
  if (!a.manager && !(await dentroDeRaiz(id, root, token)))
    throw new StudioError(
      "Elige una carpeta dentro del Drive de esta marca.",
      403,
    );
  return { token, id, root };
}
export async function uploadWord(
  token: string,
  folder: string,
  name: string,
  buffer: Buffer,
) {
  const meta = await fetch(
    `https://www.googleapis.com/drive/v3/files/${folder}?fields=id,mimeType,capabilities(canAddChildren)&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(12000),
    },
  );
  if (!meta.ok)
    throw new StudioError("No se pudo abrir esa carpeta de Drive", 502);
  const folderData = await meta.json();
  if (
    folderData.mimeType !== "application/vnd.google-apps.folder" ||
    !folderData.capabilities?.canAddChildren
  )
    throw new StudioError("No tienes permiso para guardar en esa carpeta", 403);
  const boundary = `distinto_${crypto.randomUUID()}`;
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({ name, parents: [folderData.id], mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" })}\r\n--${boundary}\r\nContent-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`,
    ),
    buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);
  const res = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: new Uint8Array(body),
      signal: AbortSignal.timeout(45000),
    },
  );
  if (!res.ok)
    throw new StudioError(
      "Drive no pudo guardar el documento. Revisa los permisos de la carpeta.",
      502,
    );
  return res.json();
}
