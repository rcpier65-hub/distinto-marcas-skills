import {
  studioActor,
  brandAccess,
  apiError,
  StudioError,
} from "@/lib/creative-studio/server";
import { driveContext } from "@/lib/creative-studio/drive";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    const a = await studioActor(req);
    const url = new URL(req.url);
    const brand = await brandAccess(a, url.searchParams.get("brand") || "");
    const { token, id, root } = await driveContext(
      a,
      brand,
      url.searchParams.get("folder"),
    );
    const page = url.searchParams.get("page");
    if (page && page.length > 2000) throw new StudioError("Página inválida");
    const query = new URLSearchParams({
      q: `'${id}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
      pageSize: "100",
      orderBy: "name",
      fields: "files(id,name),nextPageToken",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
      ...(page ? { pageToken: page } : {}),
    });
    const res = await fetch(
      `https://www.googleapis.com/drive/v3/files?${query}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      },
    );
    if (!res.ok)
      throw new StudioError(
        "No se pueden listar carpetas. Revisa los permisos de Drive.",
        502,
      );
    return Response.json({ ...(await res.json()), id, root });
  } catch (e) {
    return apiError(e);
  }
}
