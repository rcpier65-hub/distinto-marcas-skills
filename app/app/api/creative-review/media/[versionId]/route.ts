import { failure } from "@/lib/estrategia/access";
import { reviewActor, reviewVersion } from "@/lib/creative-review/server";
import { serveMedia } from "@/lib/creative-review/media";
export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(
  req: Request,
  { params }: { params: Promise<{ versionId: string }> },
) {
  try {
    return await serveMedia(
      await reviewVersion(await reviewActor(req), (await params).versionId),
      req,
    );
  } catch (e) {
    return failure(e);
  }
}
