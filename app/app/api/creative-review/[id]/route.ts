import { revalidatePath } from "next/cache";
import { body, failure } from "@/lib/estrategia/access";
import {
  reviewActor,
  reviewData,
  mutateReview,
} from "@/lib/creative-review/server";
export const dynamic = "force-dynamic";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    return Response.json(
      await reviewData(await reviewActor(req), (await params).id),
      { headers: { "Cache-Control": "no-store" } },
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
    const a = await reviewActor(req);
    const id = (await params).id;
    await mutateReview(a, id, await body(req));
    for (const path of [
      "/diseno",
      "/editor",
      `/publicaciones/${id}`,
      `/diseno/${id}`,
    ])
      revalidatePath(path);
    return Response.json(await reviewData(a, id), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
