// Página interna para generar el PDF del reporte de redes en el servidor
// (la abre Chromium al enviar el correo). Exige firma HMAC que vence en 5 min;
// sin firma válida responde 404. Pedro 18-oct-2026.
import { notFound } from "next/navigation";
import { firmaValida, marcaCorreo } from "@/lib/social-reports/email";
import { socialReport, socialTrend } from "@/lib/social-reports/server";
import type { SocialReport } from "@/lib/social-reports/model";
import { SocialReportDoc } from "@/components/estrategia/social-report-pdf";
import { tiktokReporte } from "@/lib/tiktok/server";
import { reportPeriod } from "@/lib/social-reports/model";
import { todayLima } from "@/lib/estrategia/model";

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
  const periodo = reportPeriod(mes, todayLima());
  const [report, trend, tiktok] = await Promise.all([
    socialReport(marca.id, mes, "report") as Promise<SocialReport>,
    socialTrend(marca.id, mes).catch(() => null),
    tiktokReporte(marca.id, periodo.current.start, periodo.current.end).catch(() => null),
  ]);
  return (
    <div id="reporte-redes-doc" style={{ background: "#fff" }}>
      <SocialReportDoc brand={marca.nombre} report={report} trend={trend} tiktok={tiktok} />
    </div>
  );
}
