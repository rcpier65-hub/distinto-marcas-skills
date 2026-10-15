import {
  actor,
  recordAccess,
  failure,
  StrategyError,
} from "@/lib/estrategia/access";
import { loadBrand } from "@/lib/estrategia/load";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const a = await actor(req);
    if (a.client) throw new StrategyError("Solo equipo", 403);
    const s = await recordAccess(a, (await params).id, "sheet");
    const { data: b } = await a.service
      .from("marcas")
      .select("slug")
      .eq("id", s.marca_id)
      .single();
    const data = await loadBrand(a, b.slug);
    return Response.json(
      {
        tasks: data.activities
          .filter((x) => x.source === "task")
          .map((x) => ({ id: x.sourceId, texto: x.title })),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
