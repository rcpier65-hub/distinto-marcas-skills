import { createHash } from "node:crypto";
import { z } from "zod";
import { actor, documents, failure, FinanceError } from "@/lib/finanzas/server";
import { strategyDB as db } from "@/lib/estrategia/db";
import { money, currency, monthSchema } from "@/lib/finanzas/model";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: Request) {
  try {
    return Response.json(await documents(await actor(req, true)), {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const a = await actor(req, true);
    if (Number(req.headers.get("content-length")) > 8500000)
      throw new FinanceError("Máximo 8 MB por archivo", 413);
    const f = await req.formData(),
      file = f.get("file");
    if (!(file instanceof File) || !file.size || file.size > 8388608)
      throw new FinanceError("Adjunta un PDF o una imagen de hasta 8 MB");
    const kind = z.enum(["rh", "expense"]).parse(f.get("kind"));
    if (kind === "expense" && !a.manager)
      throw new FinanceError("Sin acceso", 403);
    const number = z
        .string()
        .trim()
        .min(1)
        .max(100)
        .parse(f.get("number"))
        .toUpperCase(),
      period = monthSchema.parse(f.get("period"));
    const gross = money.parse(Number(f.get("gross"))),
      withholding = z
        .number()
        .int()
        .min(0)
        .max(gross)
        .parse(Number(f.get("withholding") || 0)),
      cur = currency.parse(f.get("currency"));
    const bytes = Buffer.from(await file.arrayBuffer());
    const mime =
      bytes.subarray(0, 5).toString() === "%PDF-"
        ? "application/pdf"
        : bytes
              .subarray(0, 8)
              .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          ? "image/png"
          : bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
            ? "image/jpeg"
            : bytes.subarray(0, 4).toString() === "RIFF" &&
                bytes.subarray(8, 12).toString() === "WEBP"
              ? "image/webp"
              : null;
    if (!mime)
      throw new FinanceError("Formato no admitido. Usa PDF, JPG, PNG o WebP.");
    const chargeId = f.get("charge_id")
      ? z.string().uuid().parse(f.get("charge_id"))
      : null;
    if (chargeId) {
      const linked = await db().query(
        "SELECT id FROM finance_charges WHERE id=$1 AND ($2::boolean OR member_id=$3)",
        [chargeId, a.manager, a.id],
      );
      if (!linked.rowCount)
        throw new FinanceError("No puedes adjuntar a ese registro", 403);
    }
    const hash = createHash("sha256").update(bytes).digest("hex");
    const r = await db().query(
      `INSERT INTO finance_documents(member_id,kind,number,period,gross,withholding,currency,filename,mime,bytes,hash,charge_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
      [
        a.id,
        kind,
        number,
        period + "-01",
        gross,
        withholding,
        cur,
        file.name.slice(0, 150),
        mime,
        bytes,
        hash,
        chargeId,
      ],
    );
    return Response.json(
      { ok: true, id: r.rows[0].id },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
