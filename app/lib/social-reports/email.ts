import "server-only";
/* Envío del reporte de redes por correo desde team@distintostudio.com
   (Gmail SMTP con contraseña de aplicación). El PDF lo genera el propio
   servidor abriendo /imprimir/reporte-redes/[slug] con Chromium; esa página
   exige una firma HMAC que vence en 5 minutos. Pedro 18-oct-2026. */
import { createHmac, timingSafeEqual } from "node:crypto";
import nodemailer from "nodemailer";
import { createServiceClient } from "@/lib/supabase/service";
import { todayLima } from "@/lib/estrategia/model";
import { monthOffset, exactSum, delta, type SocialReport } from "./model";
import { socialReport } from "./server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = () => createServiceClient() as any;
const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const correoValido = (e: string) => EMAIL_RE.test(e.trim());

function secreto() {
  const s = process.env.CRON_SECRET;
  if (!s) throw Error("Falta CRON_SECRET en el servidor.");
  return s;
}
export function firmaImpresion(slug: string, mes: string, exp: number) {
  return createHmac("sha256", secreto()).update(`reporte-redes|${slug}|${mes}|${exp}`).digest("hex");
}
export function firmaValida(slug: string, mes: string, exp: number, firma: string) {
  if (!Number.isFinite(exp) || exp < Date.now() || exp > Date.now() + 10 * 60000) return false;
  const a = Buffer.from(firmaImpresion(slug, mes, exp)), b = Buffer.from(firma || "");
  return a.length === b.length && timingSafeEqual(a, b);
}

export function correoConfigurado() {
  return Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);
}
function transporte() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/* PDF con el mismo diseño que "Exportar PDF". */
export async function pdfReporte(slug: string, mes: string): Promise<Buffer> {
  const exp = Date.now() + 5 * 60000;
  const url = `http://127.0.0.1:${process.env.PORT || 3000}/imprimir/reporte-redes/${encodeURIComponent(slug)}?${new URLSearchParams({ mes, exp: String(exp), f: firmaImpresion(slug, mes, exp) })}`;
  const chromium = (await import("@sparticuz/chromium-min")).default;
  const puppeteer = (await import("puppeteer-core")).default;
  const browser = await puppeteer.launch({
    // Opciones de servidor (Linux/Docker); en una Mac basta el Chrome normal.
    args: process.platform === "linux" ? chromium.args : ["--disable-gpu", "--no-first-run"],
    headless: true,
    executablePath: process.env.CHROMIUM_EXECUTABLE_PATH || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage();
    const res = await page.goto(url, { waitUntil: "networkidle0", timeout: 90000 });
    if (!res || !res.ok()) throw Error(`No se pudo preparar el PDF (${res?.status() ?? "sin respuesta"}).`);
    // Solo el documento A4, sin el resto de la página.
    await page.evaluate(() => {
      const doc = document.getElementById("reporte-redes-doc");
      if (doc) document.body.replaceChildren(doc);
      document.body.style.margin = "0";
    });
    return Buffer.from(await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true }));
  } finally {
    await browser.close();
  }
}

const mesLargo = (m: string) => {
  const t = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T12:00:00Z`));
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const n = (v: number | null) => (v === null ? "—" : Math.round(v).toLocaleString("es-PE"));
function money(v: number | null, cur: string) {
  if (v === null) return "—";
  try { return new Intl.NumberFormat("es-PE", { style: "currency", currency: cur }).format(v); } catch { return `${v.toFixed(2)} ${cur}`; }
}
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function cuerpo(marca: string, mes: string, r: SocialReport) {
  const vistas = exactSum(r.channels.map((c) => c.current.views)), antes = exactSum(r.channels.map((c) => c.previous.views));
  const d = delta(vistas, antes);
  const seguidores = exactSum(r.channels.map((c) => c.followers));
  const kpi = (t: string, v: string, s = "") =>
    `<td style="padding:14px 12px;border:1px solid #ece7f5;border-radius:12px;background:#faf8ff;width:25%"><div style="font-size:12px;color:#6b6580">${t}</div><div style="font-size:20px;font-weight:800;color:#1f1a2e;margin-top:4px">${v}</div>${s ? `<div style="font-size:11px;color:#7c3aed;margin-top:2px">${s}</div>` : ""}</td>`;
  return `<!doctype html><html><body style="margin:0;background:#f4f2f8;font-family:Arial,Helvetica,sans-serif;color:#1f1a2e">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:28px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:18px;overflow:hidden">
<tr><td style="background:linear-gradient(135deg,#5b3fd0,#8b5cf6 55%,#b45cf0);background-color:#6d4ce0;padding:26px 28px;color:#fff">
<div style="font-size:11px;letter-spacing:2px;font-weight:700;opacity:.85">REPORTE MENSUAL DE REDES SOCIALES</div>
<div style="font-size:24px;font-weight:800;margin-top:4px">${esc(marca)}</div>
<div style="font-size:14px;opacity:.92;margin-top:2px">${esc(mesLargo(mes))}</div></td></tr>
<tr><td style="padding:24px 28px 8px;font-size:14px;line-height:1.6">
Hola, te compartimos el reporte de redes sociales de <b>${esc(marca)}</b> correspondiente a <b>${esc(mesLargo(mes))}</b>. Encontrarás el detalle completo, con gráficas de crecimiento, en el PDF adjunto.
</td></tr>
<tr><td style="padding:8px 22px 4px"><table role="presentation" width="100%" cellspacing="6" cellpadding="0"><tr>
${kpi("Visualizaciones", n(vistas), d === null ? "" : `${d >= 0 ? "▲" : "▼"} ${Math.abs(d).toFixed(1)}% vs. mes anterior`)}
${kpi("Seguidores", n(seguidores), "Facebook + Instagram")}
${r.ads ? kpi("Inversión en pauta", money(r.ads.current.spend, r.ads.currency)) : ""}
${r.ads ? kpi("Conversaciones", n(r.ads.current.conversations), "desde anuncios") : ""}
</tr></table></td></tr>
<tr><td style="padding:16px 28px 26px;font-size:13px;color:#6b6580;line-height:1.6">
Cualquier consulta, responde a este correo y con gusto la revisamos.<br><br>
<b style="color:#1f1a2e">Equipo Distinto Studio</b><br><a href="https://distintostudio.com" style="color:#7c3aed">distintostudio.com</a>
</td></tr></table>
<div style="font-size:11px;color:#9a93a8;margin-top:14px">Datos de la API oficial de Meta. Reporte generado automáticamente por Distinto.</div>
</td></tr></table></body></html>`;
}

export type MarcaCorreo = { id: string; slug: string; nombre: string; correos: string[] };
export async function marcaCorreo(slug: string): Promise<MarcaCorreo | null> {
  const { data } = await db().from("marcas").select("id, slug, nombre, correos_clientes").eq("slug", slug).maybeSingle();
  return data
    ? { id: data.id, slug: data.slug, nombre: data.nombre, correos: ((data.correos_clientes ?? []) as string[]).map((e) => e.trim()).filter(correoValido) }
    : null;
}

export async function enviarReporte(opts: {
  marca: MarcaCorreo;
  mes: string;
  destinatarios: string[];
  modo: "manual" | "auto";
  enviadoPor?: string | null;
}) {
  const para = [...new Set(opts.destinatarios.map((e) => e.trim().toLowerCase()).filter(correoValido))];
  const log = (status: "sent" | "failed", error: string | null) =>
    db().from("social_report_email_log").insert({
      brand_id: opts.marca.id, month: opts.mes, recipients: para, mode: opts.modo, status, error, sent_by: opts.enviadoPor ?? null,
    });
  try {
    if (!correoConfigurado()) throw Error("El correo de envío no está configurado en el servidor.");
    if (!para.length) throw Error("No hay correos válidos para enviar.");
    const reporte = (await socialReport(opts.marca.id, opts.mes, "report")) as SocialReport;
    const pdf = await pdfReporte(opts.marca.slug, opts.mes);
    await transporte().sendMail({
      from: `"Distinto Studio" <${process.env.SMTP_USER}>`,
      to: para.join(", "),
      replyTo: process.env.SMTP_USER,
      subject: `Reporte de redes sociales · ${opts.marca.nombre} · ${mesLargo(opts.mes)}`,
      html: cuerpo(opts.marca.nombre, opts.mes, reporte),
      attachments: [{ filename: `Reporte redes ${opts.marca.nombre} - ${mesLargo(opts.mes)}.pdf`, content: pdf, contentType: "application/pdf" }],
    });
    await log("sent", null);
    return { ok: true as const, enviados: para };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await log("failed", msg.slice(0, 500));
    return { ok: false as const, error: msg };
  }
}

/* Mes que corresponde enviar en automático: el mes anterior (cerrado). */
export const mesAnterior = () => monthOffset(todayLima().slice(0, 7), -1);
