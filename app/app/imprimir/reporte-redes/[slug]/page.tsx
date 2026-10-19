// Página interna para generar el PDF del reporte de redes en el servidor
// (la abre Chromium al enviar el correo). Exige firma HMAC que vence en 5 min;
// sin firma válida responde 404. Pedro 18-oct-2026.
import { notFound } from "next/navigation";
import { firmaValida, marcaCorreo } from "@/lib/social-reports/email";
import type { SocialReport, SocialTrend } from "@/lib/social-reports/model";
import { obtener } from "@/lib/social-reports/snapshots";
import type { TikTokReporte } from "@/lib/tiktok/server";
import { SocialReportDoc } from "@/components/estrategia/social-report-pdf";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ mes?: string; exp?: string; f?: string }>;
}) {
  const { slug } = await params,
    q = await searchParams;
  const mes = q.mes ?? "";
  if (!/^\d{4}-\d{2}$/.test(mes) || !firmaValida(slug, mes, Number(q.exp), q.f ?? "")) notFound();
  const marca = await marcaCorreo(slug);
  if (!marca) notFound();
  const por = { id: null, nombre: "Envío de reporte" };
  const [report, trend, tiktok] = await Promise.all([
    obtener<SocialReport>(marca.id, mes, "report", por).then((g) => g.data),
    obtener<SocialTrend>(marca.id, mes, "trend", por).then((g) => g.data).catch(() => null),
    obtener<TikTokReporte>(marca.id, mes, "tiktok", por).then((g) => g.data).catch(() => null),
  ]);
  return (
    <div id="reporte-redes-doc" style={{ background: "#fff" }}>
      <SocialReportDoc brand={marca.nombre} report={report} trend={trend} tiktok={tiktok} />
    </div>
  );
}
