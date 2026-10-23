import { body, failure } from "@/lib/estrategia/access";
import { reviewActor } from "@/lib/creative-review/server";
import { sketchVersion } from "@/lib/creative-review/sketch";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json(
      await sketchVersion(
        await reviewActor(req),
        (await params).id,
        await body(req),
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
