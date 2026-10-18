// Envío automático mensual del reporte de redes (día 3, 9:00 Lima). Solo marcas
// con el envío automático ACTIVADO; manda el mes anterior una sola vez.
// Auth: Bearer CRON_SECRET. Pedro 18-oct-2026.
import { createServiceClient } from "@/lib/supabase/service";
import { enviarReporte, marcaCorreo, mesAnterior } from "@/lib/social-reports/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`)
    return new Response("No autorizado", { status: 401 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any;
  const mes = mesAnterior();
  const { data: filas } = await service
    .from("social_report_email_settings")
    .select("brand_id, recipients, last_auto_month, marca:marcas(slug)")
    .eq("auto_enabled", true);
  const resultados: { marca: string; ok: boolean; error?: string }[] = [];
  for (const f of filas ?? []) {
    if (f.last_auto_month === mes) continue;
    const marca = await marcaCorreo(f.marca?.slug ?? "");
    if (!marca) continue;
    const dest = f.recipients?.length ? f.recipients : marca.correos;
    const r = await enviarReporte({ marca, mes, destinatarios: dest, modo: "auto" });
    if (r.ok) await service.from("social_report_email_settings").update({ last_auto_month: mes }).eq("brand_id", f.brand_id);
    resultados.push({ marca: marca.slug, ok: r.ok, ...(r.ok ? {} : { error: r.error }) });
  }
  return Response.json({ ok: true, mes, resultados });
}
