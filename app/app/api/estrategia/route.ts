import { actor, body, failure, StrategyError } from "@/lib/estrategia/access";
import { loadBrand } from "@/lib/estrategia/load";
import { saveRecord, duplicateSheet, linkWork } from "@/lib/estrategia/records";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const month = url.searchParams.get("mes") || undefined;
    if (month && !/^(20\d{2})-(0[1-9]|1[0-2])$/.test(month)) throw new StrategyError("Mes inválido");
    return Response.json(
      await loadBrand(
        await actor(req),
        new URL(req.url).searchParams.get("marca") || "",
        month,
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const a = await actor(req),
      b = await body(req);
    if (b.action === "save")
      return Response.json(await saveRecord(a, b.slug, b.record));
    if (b.action === "duplicate")
      return Response.json(await duplicateSheet(a, b.id));
    if (b.action === "link") return Response.json(await linkWork(a, b.slug, b));
    throw new StrategyError("Acción no disponible");
  } catch (e) {
    return failure(e);
  }
}
