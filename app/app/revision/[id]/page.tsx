import { redirect, notFound } from "next/navigation";
import { reviewActor, reviewData } from "@/lib/creative-review/server";
import { StrategyError } from "@/lib/estrategia/access";
import { ReviewWorkspace } from "@/components/creative-review/workspace";
export const dynamic = "force-dynamic";
export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  let data;
  try {
    data = await reviewData(await reviewActor(), (await params).id);
  } catch (e) {
    if (e instanceof StrategyError && e.status === 401) redirect("/login");
    if (e instanceof StrategyError && [403, 404].includes(e.status)) notFound();
    throw e;
  }
  return <ReviewWorkspace initial={JSON.parse(JSON.stringify(data))} />;
}
