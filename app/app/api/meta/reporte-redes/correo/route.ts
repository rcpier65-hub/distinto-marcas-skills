// Envío del reporte de redes por correo (solo administración).
// GET: correos del cliente, configuración automática e historial.
// POST: enviar ahora. PATCH: activar/desactivar el envío automático mensual.
import { z } from "zod";
import { actor, brandAccess, failure, StrategyError } from "@/lib/estrategia/access";
import { todayLima } from "@/lib/estrategia/model";
import { reportPeriod } from "@/lib/social-reports/model";
import { correoConfigurado, correoValido, enviarReporte, marcaCorreo } from "@/lib/social-reports/email";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 300;

async function contexto(req: Request, slug: string) {
  const a = await actor(req);
  if (!a.manager || a.client) throw new StrategyError("Solo administración puede enviar reportes.", 403);
  const brand = await brandAccess(a, slug);
  const marca = await marcaCorreo(brand.slug);
  if (!marca) throw new StrategyError("Marca no encontrada", 404);
  return { a, marca };
}

export async function GET(req: Request) {
  try {
    const slug = new URL(req.url).searchParams.get("marca") ?? "";
    const { a, marca } = await contexto(req, slug);
    const [{ data: cfg }, { data: log }] = await Promise.all([
      a.service.from("social_report_email_settings").select("auto_enabled, recipients, last_auto_month").eq("brand_id", marca.id).maybeSingle(),
      a.service.from("social_report_email_log").select("month, recipients, mode, status, error, created_at").eq("brand_id", marca.id).order("created_at", { ascending: false }).limit(8),
    ]);
    return Response.json(
      {
        configurado: correoConfigurado(),
        remitente: process.env.SMTP_USER ?? null,
        correosCliente: marca.correos,
        auto: cfg?.auto_enabled ?? false,
        destinatariosAuto: (cfg?.recipients?.length ? cfg.recipients : marca.correos) as string[],
        ultimoAuto: cfg?.last_auto_month ?? null,
        historial: log ?? [],
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}

const Correos = z.array(z.string().trim().max(200)).max(20);

export async function POST(req: Request) {
  try {
    const body = z.object({ marca: z.string().min(1), mes: z.string(), destinatarios: Correos.min(1) }).strict().parse(await req.json());
    try { reportPeriod(body.mes, todayLima()); } catch { throw new StrategyError("Elige un mes válido."); }
    const { a, marca } = await contexto(req, body.marca);
    const malos = body.destinatarios.filter((e) => !correoValido(e));
    if (malos.length) throw new StrategyError(`Correo no válido: ${malos[0]}`);
    const r = await enviarReporte({ marca, mes: body.mes, destinatarios: body.destinatarios, modo: "manual", enviadoPor: a.user.id });
    if (!r.ok) throw new StrategyError(r.error, 502);
    return Response.json(r);
  } catch (e) {
    return failure(e);
  }
}

export async function PATCH(req: Request) {
  try {
    const body = z.object({ marca: z.string().min(1), auto: z.boolean(), destinatarios: Correos.optional() }).strict().parse(await req.json());
    const { a, marca } = await contexto(req, body.marca);
    const dest = (body.destinatarios ?? []).map((e) => e.trim().toLowerCase()).filter(correoValido);
    if (body.auto && !dest.length && !marca.correos.length) throw new StrategyError("Esta marca no tiene correos de cliente registrados.");
    const { error } = await a.service.from("social_report_email_settings").upsert({
      brand_id: marca.id, auto_enabled: body.auto, recipients: dest, updated_at: new Date().toISOString(), updated_by: a.user.id,
    });
    if (error) throw new StrategyError("No se pudo guardar la configuración.", 503);
    return Response.json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
