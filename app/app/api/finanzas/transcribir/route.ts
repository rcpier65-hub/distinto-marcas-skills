import { actor, failure, FinanceError } from "@/lib/finanzas/server";
import { strategyDB } from "@/lib/estrategia/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const limit = 6 * 1024 * 1024;
export async function POST(req: Request) {
  try {
    await actor(req);
    if (Number(req.headers.get("content-length")) > limit + 16384)
      throw new FinanceError("Usa un audio de hasta 6 MB.", 413);
    const form = await req.formData(),
      file = form.get("audio");
    if (!(file instanceof File) || !file.size || file.size > limit)
      throw new FinanceError("Selecciona un audio de hasta 6 MB.");
    if (
      !/^(audio\/(mp4|mpeg|mp3|webm|wav|x-wav|ogg|aac|x-m4a)|video\/(mp4|webm))(;|$)/i.test(
        file.type,
      )
    )
      throw new FinanceError("Usa un audio M4A, MP3, WAV, OGG o WebM.");
    const endpoint = process.env.FINANCE_TRANSCRIBER_URL;
    if (!endpoint)
      throw new FinanceError(
        "El dictado no está disponible. Puedes escribir o usar el micrófono del teclado.",
        503,
      );
    const connection = await strategyDB().connect();
    let locked = false;
    try {
      locked = (
        await connection.query(
          "SELECT pg_try_advisory_lock(hashtext('distinto-finance-transcription')) AS locked",
        )
      ).rows[0].locked;
      if (!locked)
        throw new FinanceError(
          "Se está transcribiendo otro audio. Reintenta en un momento.",
          429,
        );
      const fd = new FormData();
      fd.append(
        "audio_file",
        file,
        "registro." + (file.name.split(".").pop() || "m4a"),
      );
      const url = new URL(endpoint);
      url.searchParams.set("language", "es");
      url.searchParams.set("output", "json");
      url.searchParams.set("vad_filter", "true");
      url.searchParams.set(
        "initial_prompt",
        "Gastos y cobros en soles. BCP, BBVA, Interbank, Yape, Pedro, Nayeli.",
      );
      const r = await fetch(url, {
        method: "POST",
        body: fd,
        signal: AbortSignal.timeout(45000),
      });
      if (!r.ok)
        throw new FinanceError(
          "No se pudo transcribir. Reintenta o escribe la frase; no se guardó ningún pago.",
          503,
        );
      const j = await r.json(),
        text = typeof j.text === "string" ? j.text.trim() : "";
      if (!text)
        throw new FinanceError(
          "No se escuchó una frase. Reintenta o escribe el gasto.",
          422,
        );
      if (text.length > 2000)
        throw new FinanceError(
          "Usa un audio corto con una sola operación.",
          422,
        );
      return Response.json(
        { text },
        { headers: { "Cache-Control": "private, no-store" } },
      );
    } finally {
      try {
        if (locked)
          await connection.query(
            "SELECT pg_advisory_unlock(hashtext('distinto-finance-transcription'))",
          );
      } finally {
        connection.release();
      }
    }
  } catch (e) {
    return failure(e);
  }
}
