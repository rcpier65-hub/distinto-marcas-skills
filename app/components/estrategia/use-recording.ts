"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState } from "react";
import { api } from "./common";
type Pending = {
  id: string;
  sessionId: string;
  audio: Blob;
  start: number;
  duration: number;
  sheetId: string;
};
async function storage() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const r = indexedDB.open("distinto-strategy-audio", 1);
    r.onupgradeneeded = () =>
      r.result.createObjectStore("segments", { keyPath: "id" });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}
async function persisted(
  mode: "get" | "put" | "delete",
  value?: Pending | string,
) {
  const db = await storage();
  try {
    return await new Promise<any>((resolve, reject) => {
      const tx = db.transaction(
          "segments",
          mode === "get" ? "readonly" : "readwrite",
        ),
        s = tx.objectStore("segments"),
        q =
          mode === "get"
            ? s.getAll()
            : mode === "put"
              ? s.put(value)
              : s.delete(value as string);
      q.onsuccess = () => resolve(q.result);
      q.onerror = () => reject(q.error);
    });
  } finally {
    db.close();
  }
}
export function useRecording(sheetId: string, refresh: () => Promise<void>) {
  const [state, setState] = useState<"idle" | "recording" | "paused">("idle"),
    [elapsed, setElapsed] = useState(0),
    [failed, setFailed] = useState<Pending[]>([]),
    [error, setError] = useState(""),
    [uploading, setUploading] = useState(0);
  const session = useRef(""),
    rec = useRef<MediaRecorder | null>(null),
    stream = useRef<MediaStream | null>(null),
    sources = useRef<MediaStream[]>([]),
    context = useRef<AudioContext | null>(null),
    active = useRef(false),
    paused = useRef(false),
    started = useRef(0),
    cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null),
    chain = useRef(Promise.resolve()),
    controls = useRef(Promise.resolve()),
    refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);
  useEffect(() => {
    persisted("get")
      .then((rows: Pending[]) =>
        setFailed(rows.filter((r) => r.sheetId === sheetId)),
      )
      .catch(() => {});
    return () => {
      if (active.current && session.current) {
        void fetch(`/api/estrategia/hojas/${sheetId}`, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "session",
            id: session.current,
            state: "ended",
            duration: Math.floor((Date.now() - started.current) / 1000),
          }),
        }).catch(() => {});
      }
      active.current = false;
      if (rec.current && rec.current.state !== "inactive") rec.current.stop();
      sources.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      context.current?.close();
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, [sheetId]);
  useEffect(() => {
    if (state === "idle") return;
    const id = setInterval(
      () => setElapsed(Math.floor((Date.now() - started.current) / 1000)),
      1000,
    );
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => {
      clearInterval(id);
      window.removeEventListener("beforeunload", warn);
    };
  }, [state]);
  async function upload(p: Pending) {
    setUploading((n) => n + 1);
    try {
      const fd = new FormData();
      fd.set(
        "audio",
        p.audio,
        `audio.${p.audio.type.includes("mp4") ? "m4a" : "webm"}`,
      );
      fd.set("id", p.id);
      fd.set("sessionId", p.sessionId);
      fd.set("start", String(p.start));
      fd.set("duration", String(p.duration));
      const res = await fetch("/api/estrategia/audio", {
        method: "POST",
        body: fd,
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || "No se pudo guardar el audio");
      await persisted("delete", p.id).catch(() => {});
      setFailed((rows) => rows.filter((x) => x.id !== p.id));
      void api("/api/estrategia/audio", { id: p.id })
        .then(() => refreshRef.current())
        .catch((e) => setError((e as Error).message));
      await refreshRef.current();
    } catch (e) {
      setError((e as Error).message);
      setFailed((rows) => [...rows.filter((x) => x.id !== p.id), p]);
    } finally {
      setUploading((n) => n - 1);
    }
  }
  function cycle() {
    if (!active.current || paused.current || !stream.current) return;
    const mime = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find(
      (x) => MediaRecorder.isTypeSupported(x),
    );
    const r = new MediaRecorder(
        stream.current,
        mime ? { mimeType: mime } : undefined,
      ),
      chunks: BlobPart[] = [],
      start = Math.floor((Date.now() - started.current) / 1000),
      localSession = session.current;
    rec.current = r;
    r.ondataavailable = (e) => {
      if (e.data.size) chunks.push(e.data);
    };
    r.onstop = () => {
      const p = {
        id: crypto.randomUUID(),
        sessionId: localSession,
        sheetId,
        audio: new Blob(chunks, { type: r.mimeType.split(";")[0] }),
        start,
        duration: Math.max(
          1,
          Math.floor((Date.now() - started.current) / 1000) - start,
        ),
      };
      if (p.audio.size) {
        chain.current = chain.current.then(async () => {
          try {
            await persisted("put", p);
          } catch {
            setError(
              "Conserva esta ventana: el navegador no pudo guardar una copia local del audio.",
            );
          }
          await upload(p);
        });
      }
      if (active.current && !paused.current) cycle();
    };
    r.onerror = () => {
      setError(
        "Se interrumpió la captura de audio. Los tramos anteriores están guardados.",
      );
      void stop();
    };
    r.start();
    cycleTimer.current = setTimeout(() => {
      if (r.state === "recording") r.stop();
    }, 30000);
  }
  async function start(id: string, tabAudio: boolean) {
    setError("");
    try {
      const mic = await navigator.mediaDevices.getUserMedia({ audio: true });
      sources.current = [mic];
      let output = mic;
      if (tabAudio) {
        const display = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true,
        });
        sources.current.push(display);
        if (!display.getAudioTracks().length)
          throw new Error(
            "No se seleccionó audio compartido. Activa «Compartir audio» al elegir la pestaña.",
          );
        const ctx = new AudioContext();
        context.current = ctx;
        const dest = ctx.createMediaStreamDestination();
        ctx.createMediaStreamSource(mic).connect(dest);
        ctx
          .createMediaStreamSource(new MediaStream(display.getAudioTracks()))
          .connect(dest);
        output = dest.stream;
      }
      await api(`/api/estrategia/hojas/${sheetId}`, {
        action: "session",
        id,
        state: "recording",
        consent: true,
      });
      session.current = id;
      stream.current = output;
      started.current = Date.now();
      active.current = true;
      paused.current = false;
      setElapsed(0);
      setState("recording");
      cycle();
      await refreshRef.current();
    } catch (e) {
      sources.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
      context.current?.close();
      setError((e as Error).message);
    }
  }
  async function pause() {
    paused.current = !paused.current;
    setState(paused.current ? "paused" : "recording");
    if (paused.current) {
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
      if (rec.current?.state === "recording") rec.current.stop();
    } else cycle();
    const input = {
      action: "session",
      id: session.current,
      state: paused.current ? "paused" : "recording",
      consent: true,
    };
    controls.current = controls.current
      .then(() => api(`/api/estrategia/hojas/${sheetId}`, input))
      .then(() => {})
      .catch((e) => setError((e as Error).message));
    await controls.current;
  }
  async function stop() {
    active.current = false;
    if (cycleTimer.current) clearTimeout(cycleTimer.current);
    if (rec.current && rec.current.state !== "inactive") rec.current.stop();
    sources.current.forEach((s) => s.getTracks().forEach((t) => t.stop()));
    context.current?.close();
    setState("idle");
    await controls.current;
    if (session.current)
      await api(`/api/estrategia/hojas/${sheetId}`, {
        action: "session",
        id: session.current,
        state: "ended",
        duration: Math.floor((Date.now() - started.current) / 1000),
      }).catch((e) => setError((e as Error).message));
    await refreshRef.current();
  }
  return {
    state,
    elapsed,
    error,
    failed,
    uploading,
    start,
    pause,
    stop,
    retry: () => Promise.all(failed.map(upload)),
  };
}
