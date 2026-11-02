import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { financeMember, loadFinance } from "@/lib/finanzas/server";
import { today } from "@/lib/finanzas/model";
import { FinanceView } from "./finance-view";

// Identidad propia del acceso directo; la app de la agencia conserva sus iconos.
const iconPath = "/icons/finanzas/v1";
export const metadata: Metadata = {
  title: "Finanzas · Distinto",
  applicationName: "Finanzas",
  manifest: `${iconPath}/manifest.webmanifest`,
  appleWebApp: { capable: true, title: "Finanzas", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: `${iconPath}/icon-32.png`, sizes: "32x32", type: "image/png" },
      { url: `${iconPath}/icon-192.png`, sizes: "192x192", type: "image/png" },
    ],
    shortcut: `${iconPath}/icon-32.png`,
    apple: [{ url: `${iconPath}/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }],
  },
};
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await financeMember();
  if (!a?.manager) redirect("/inicio");
  return <FinanceView initial={await loadFinance(a, today().slice(0, 7))} />;
}
