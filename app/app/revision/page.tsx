import { redirect } from "next/navigation";
import { reviewActor } from "@/lib/creative-review/server";
import { ReviewMetrics } from "@/components/creative-review/metrics";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ marca?: string; area?: string }>;
}) {
  try {
    await reviewActor();
  } catch {
    redirect("/inicio");
  }
  const p = await searchParams;
  return (
    <main className="p-6">
      <ReviewMetrics brand={p.marca} initialArea={p.area} />
    </main>
  );
}
