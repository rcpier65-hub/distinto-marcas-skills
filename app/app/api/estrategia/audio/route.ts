import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  actor,
  recordAccess,
  body,
  failure,
  StrategyError,
} from "@/lib/estrategia/access";
import { strategyDB } from "@/lib/estrategia/db";
import { uid } from "@/lib/estrategia/model";
import { getOpenAIApiKey } from "@/lib/integrations/openai";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;
export async function GET(req: Request) {
  try {
    const a = await actor(req),
      id = uid.parse(new URL(req.url).searchParams.get("id"));
    const s = (
      await strategyDB().query(
        "SELECT s.*,r.sheet_id FROM strategy_segments s JOIN strategy_sessions r ON r.id=s.session_id WHERE s.id=$1",
        [id],
      )
    ).rows[0];
    if (!s || a.client) throw new StrategyError("Audio privado", 403);
    await recordAccess(a, s.sheet_id, "sheet");
    const { data, error } = await a.service.storage
      .from("strategy-recordings")
      .createSignedUrl(s.media_path, 60);
    if (error) throw new StrategyError("No se pudo abrir la grabación", 503);
    return new Response(null, {
      status: 302,
      headers: {
        Location: data.signedUrl,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request) {
  try {
    const a = await actor(req);
    if (a.client) throw new StrategyError("Audio privado", 403);
    if (req.headers.get("content-type")?.includes("application/json")) {
      const input = await body(req),
        id = uid.parse(input.id);
      const s = (
        await strategyDB().query(
          "SELECT s.*,r.sheet_id FROM strategy_segments s JOIN strategy_sessions r ON r.id=s.session_id WHERE s.id=$1",
          [id],
        )
      ).rows[0];
      if (!s) throw new StrategyError("Audio no encontrado", 404);
      await recordAccess(a, s.sheet_id, "sheet", true);
      if (s.transcript) return Response.json({ text: s.transcript });
      const key = await getOpenAIApiKey();
      if (!key)
        throw new StrategyError(
          "Configura la IA en Settings. El audio está guardado y puedes transcribirlo después.",
        );
      const { data: blob, error } = await a.service.storage
        .from("strategy-recordings")
        .download(s.media_path);
      if (error) throw new StrategyError("No se pudo leer el audio", 503);
      const fd = new FormData();
      fd.append(
        "file",
        blob,
        `segmento.${s.mime === "audio/mp4" ? "m4a" : s.mime === "audio/ogg" ? "ogg" : "webm"}`,
      );
      fd.append("model", "gpt-4o-transcribe");
      fd.append("language", "es");
      const transcribe = () =>
        fetch("https://api.openai.com/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: fd,
          signal: AbortSignal.timeout(50000),
        });
      let res = await transcribe();
      if (!res.ok && res.status !== 401) {
        fd.set("model", "whisper-1");
        res = await transcribe();
      }
      if (!res.ok) {
        const reason = await res.json().catch(() => ({}));
        console.warn(
          "[strategy-transcription]",
          res.status,
          reason.error?.code,
          reason.error?.type,
        );
        await strategyDB().query(
          "UPDATE strategy_segments SET state='pending' WHERE id=$1",
          [id],
        );
        throw new StrategyError(
          res.status === 429
            ? "El proveedor de IA no tiene cuota disponible en este momento. El audio está guardado; puedes reintentar después."
            : "No se pudo transcribir este tramo. El audio está guardado; puedes reintentarlo.",
          502,
        );
      }
      const out = await res.json(),
        text = String(out.text || "").slice(0, 30000);
      await strategyDB().query(
        "UPDATE strategy_segments SET transcript=$2,state=$3 WHERE id=$1",
        [id, text, text ? "transcribed" : "silent"],
      );
      return Response.json({ text });
    }
    if (Number(req.headers.get("content-length") || 0) > 27 * 1024 * 1024)
      throw new StrategyError("El audio supera 25 MB", 413);
    const form = await req.formData(),
      file = form.get("audio"),
      sessionId = uid.parse(form.get("sessionId")),
      id = form.get("id") ? uid.parse(form.get("id")) : randomUUID();
    if (!(file instanceof File) || !file.size || file.size > 25 * 1024 * 1024)
      throw new StrategyError("Adjunta un audio de hasta 25 MB");
    const mime = file.type.split(";")[0];
    if (
      ![
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
        "audio/mpeg",
        "audio/wav",
      ].includes(mime)
    )
      throw new StrategyError("Formato de audio no admitido");
    const session = (
      await strategyDB().query("SELECT * FROM strategy_sessions WHERE id=$1", [
        sessionId,
      ])
    ).rows[0];
    if (!session || session.owner_id !== a.user.id || !session.data.consent)
      throw new StrategyError(
        "Inicia una sesión con consentimiento antes de subir audio",
        403,
      );
    const sheet = await recordAccess(a, session.sheet_id, "sheet", true);
    const old = (
      await strategyDB().query("SELECT * FROM strategy_segments WHERE id=$1", [
        id,
      ])
    ).rows[0];
    if (old) {
      if (old.session_id !== sessionId)
        throw new StrategyError("Segmento inválido");
      return Response.json(old);
    }
    const start = z.coerce
        .number()
        .int()
        .min(0)
        .max(86400)
        .parse(form.get("start") || 0),
      duration = z.coerce
        .number()
        .int()
        .min(0)
        .max(86400)
        .parse(form.get("duration") || 0);
    const path = `${sheet.marca_id}/${sessionId}/${id}`;
    const { error } = await a.service.storage
      .from("strategy-recordings")
      .upload(path, file, { contentType: mime, upsert: true });
    if (error)
      throw new StrategyError(
        "No se pudo guardar el audio. Conserva esta ventana y reintenta.",
        503,
      );
    const row = (
      await strategyDB().query(
        "INSERT INTO strategy_segments(id,session_id,start_seconds,duration,media_path,mime) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(id) DO UPDATE SET id=excluded.id RETURNING *",
        [id, sessionId, start, duration, path, mime],
      )
    ).rows[0];
    return Response.json(row);
  } catch (e) {
    return failure(e);
  }
}
