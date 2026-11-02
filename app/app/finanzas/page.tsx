import { redirect } from "next/navigation";
import { financeMember, loadFinance } from "@/lib/finanzas/server";
import { today } from "@/lib/finanzas/model";
import { FinanceView } from "./finance-view";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await financeMember();
  if (!a?.manager) redirect("/inicio");
  return <FinanceView initial={await loadFinance(a, today().slice(0, 7))} />;
}
