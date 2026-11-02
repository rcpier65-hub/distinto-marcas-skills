"use client";
import { useEffect, useRef, useState } from "react";
export function useQuickVoice(onText: (text: string) => void) {
  const [status, setStatus] = useState<
    "idle" | "permission" | "recording" | "transcribing"
  >("idle");
  const [error, setError] = useState("");
  const [retryable, setRetryable] = useState(false);
  const recorder = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    abort = useRef<AbortController | null>(null);
  const active = useRef(true),
    generation = useRef(0),
    pending = useRef<File | null>(null);
  const callback = useRef(onText);
  useEffect(() => {
    callback.current = onText;
  }, [onText]);
  function stopTracks() {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (timer.current) clearTimeout(timer.current);
  }
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      // This is a request generation counter, not a DOM ref. Invalidate late permission results.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
      abort.current?.abort();
      if (recorder.current?.state === "recording") {
        recorder.current.onstop = null;
        recorder.current.stop();
      }
      stopTracks();
    };
  }, []);
  async function transcribe(file: File) {
    pending.current = file;
    setRetryable(false);
    setError("");
    setStatus("transcribing");
    const controller = new AbortController();
    abort.current = controller;
    const timeout = setTimeout(() => controller.abort(), 55000);
    try {
      if (file.size > 6 * 1024 * 1024)
        throw Error("Usa un audio de hasta 6 MB.");
      const form = new FormData();
      form.append("audio", file);
      const r = await fetch("/api/finanzas/transcribir", {
          method: "POST",
          body: form,
          signal: controller.signal,
        }),
        j = await r.json();
      if (!r.ok)
        throw Error(
          j.error || "No se pudo transcribir. Puedes escribir la frase.",
        );
      if (active.current) {
        callback.current(j.text);
        pending.current = null;
      }
    } catch (e) {
      if (active.current) {
        setError(
          (e as Error).name === "AbortError"
            ? "El dictado tardó demasiado. Puedes reintentar o escribir."
            : (e as Error).message,
        );
        setRetryable(true);
      }
    } finally {
      clearTimeout(timeout);
      if (active.current) setStatus("idle");
    }
  }
  async function start() {
    if (status !== "idle") return;
    if (
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Usa el micrófono del teclado o adjunta un audio.");
      return;
    }
    setError("");
    setRetryable(false);
    setStatus("permission");
    const version = ++generation.current;
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!active.current || version !== generation.current) {
        media.getTracks().forEach((t) => t.stop());
        return;
      }
      stream.current = media;
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
        (t) => MediaRecorder.isTypeSupported(t),
      );
      const rec = new MediaRecorder(
          media,
          type ? { mimeType: type } : undefined,
        ),
        chunks: Blob[] = [];
      recorder.current = rec;
      rec.ondataavailable = (e) => {
        if (e.data.size) chunks.push(e.data);
      };
      rec.onerror = () => {
        rec.onstop = null;
        stopTracks();
        setStatus("idle");
        setError("No se pudo grabar. Prueba el micrófono del teclado.");
      };
      rec.onstop = () => {
        stopTracks();
        if (!active.current || version !== generation.current) return;
        const blob = new Blob(chunks, { type: rec.mimeType || "audio/mp4" });
        if (blob.size < 100) {
          setStatus("idle");
          setError("El audio quedó vacío. Intenta otra vez.");
          return;
        }
        void transcribe(
          new File(
            [blob],
            `registro.${/webm/.test(blob.type) ? "webm" : "m4a"}`,
            { type: blob.type },
          ),
        );
      };
      rec.start();
      setStatus("recording");
      timer.current = setTimeout(() => {
        if (rec.state === "recording") rec.stop();
      }, 60000);
    } catch {
      stopTracks();
      if (active.current && version === generation.current) {
        setStatus("idle");
        setError("Permite el micrófono en tu navegador o usa el del teclado.");
      }
    }
  }
  function cancel() {
    generation.current++;
    if (recorder.current?.state === "recording") {
      recorder.current.onstop = null;
      recorder.current.stop();
    }
    stopTracks();
    setStatus("idle");
  }
  return {
    status,
    error,
    retryable,
    start,
    cancel,
    stop: () => {
      if (recorder.current?.state === "recording") recorder.current.stop();
    },
    transcribe,
    retry: () => {
      if (pending.current) void transcribe(pending.current);
    },
  };
}
