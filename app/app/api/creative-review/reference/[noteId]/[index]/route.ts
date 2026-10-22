import { z } from "zod";
import { reviewActor, reviewVersion } from "@/lib/creative-review/server";
import { strategyDB } from "@/lib/estrategia/db";
import { failure, StrategyError } from "@/lib/estrategia/access";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ noteId: string; index: string }> },
) {
  try {
    const a = await reviewActor(req);
    const p = await params;
    z.string().uuid().parse(p.noteId);
    const index = z.coerce.number().int().min(0).max(2).parse(p.index);
    const { rows } = await strategyDB().query(
      "SELECT version_id FROM creative_review_notes WHERE id=$1",
      [p.noteId],
    );
    if (!rows[0]) throw new StrategyError("Referencia no disponible", 404);
    await reviewVersion(a, rows[0].version_id);
    const image = await strategyDB().query(
      "SELECT attachments->>$2::int AS image FROM creative_review_notes WHERE id=$1",
      [p.noteId, index],
    );
    const m = image.rows[0]?.image?.match(
      /^data:(image\/(?:png|jpeg|webp));base64,(.+)$/,
    );
    if (!m) throw new StrategyError("Referencia no disponible", 404);
    return new Response(Buffer.from(m[2], "base64"), {
      headers: {
        "Content-Type": m[1],
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Disposition": "inline",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
