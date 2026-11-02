import {
  actor,
  failure,
  loadFinance,
  mutate,
  readBody,
} from "@/lib/finanzas/server";
import { today } from "@/lib/finanzas/model";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET(req: Request) {
  try {
    return Response.json(
      await loadFinance(
        await actor(req),
        new URL(req.url).searchParams.get("mes") || today().slice(0, 7),
      ),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    return Response.json(await mutate(await actor(req), await readBody(req)), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
