import { actor, body, failure } from "@/lib/estrategia/access";
import { sheetData, sheetAction } from "@/lib/estrategia/sheets";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const requested = new URL(req.url).searchParams.get("revision");
    const knownRevision =
      requested && /^\d{1,9}$/.test(requested) ? Number(requested) : -1;
    const data = await sheetData(
      await actor(req),
      (await params).id,
      knownRevision,
    );
    const same = knownRevision === data.scene.revision;
    return Response.json(
      { ...data, scene: same ? null : data.scene },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json(
      await sheetAction(await actor(req), (await params).id, await body(req)),
    );
  } catch (e) {
    return failure(e);
  }
}
