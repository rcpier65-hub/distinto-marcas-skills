import { z } from "zod";
import {
  studioActor,
  brandAccess,
  batchAccess,
  readBody,
  apiError,
  StudioError,
} from "@/lib/creative-studio/server";
import { profileSchema, emptyProfile } from "@/lib/creative-studio/model";
import { createWord } from "@/lib/creative-studio/word";
import { driveContext, uploadWord } from "@/lib/creative-studio/drive";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(req: Request) {
  try {
    const a = await studioActor(req);
    const body = await readBody(req);
    const batch = await batchAccess(a, body.batchId);
    const brand = await brandAccess(a, batch.marca_id);
    if (!batch.data.scripts.length)
      throw new StudioError("Agrega al menos un guion");
    const { data: p, error } = await a.db
      .from("creative_brand_profiles")
      .select("data")
      .eq("marca_id", batch.marca_id)
      .maybeSingle();
    if (error) throw error;
    const buffer = await createWord(
      batch,
      brand.nombre,
      profileSchema.parse(p?.data ?? emptyProfile),
    );
    const name = `${brand.nombre} - ${batch.name}.docx`.replace(
      /[\x00-\x1f/\\]/g,
      "-",
    );
    if (body.folderId) {
      const folder = z.string().max(180).parse(body.folderId);
      const { token, id } = await driveContext(a, brand, folder);
      return Response.json(await uploadWord(token, id, name, buffer));
    }
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return apiError(e);
  }
}
