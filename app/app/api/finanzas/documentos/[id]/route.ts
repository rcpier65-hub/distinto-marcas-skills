import { actor, failure, FinanceError } from "@/lib/finanzas/server";
import { strategyDB as db } from "@/lib/estrategia/db";
import { z } from "zod";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const a = await actor(req, true),
      id = z
        .string()
        .uuid()
        .parse((await params).id);
    const r = (
      await db().query(
        "SELECT filename,mime,bytes FROM finance_documents WHERE id=$1 AND ($2::boolean OR member_id=$3)",
        [id, a.manager, a.id],
      )
    ).rows[0];
    if (!r) throw new FinanceError("Documento no encontrado", 404);
    return new Response(new Uint8Array(r.bytes), {
      headers: {
        "Content-Type": r.mime,
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(r.filename)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
