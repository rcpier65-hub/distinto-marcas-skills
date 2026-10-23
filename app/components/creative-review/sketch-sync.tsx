"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReviewData } from "@/lib/creative-review/model";
export function SketchSync({
  publicationId,
  onSynced,
}: {
  publicationId: string;
  onSynced: () => Promise<void>;
}) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const sync = useCallback(async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setStatus("Comprobando entregas…");
    try {
      const response = await fetch(`/api/creative-review/${publicationId}`, {
        cache: "no-store",
      });
      if (!response.ok) throw Error("No se pudieron comprobar las entregas");
      const data: ReviewData = await response.json();
      if (!data.canSketch) {
        setStatus("");
        return;
      }
      const latest = [
        ...new Map(
          data.versions.map((v) => [v.publicacion_id + ":" + v.slot, v]),
        ).values(),
      ];
      let added = 0,
        preview = false;
      for (const v of latest) {
        const r = await fetch(`/api/creative-review/${publicationId}/boceto`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ versionId: v.id }),
        });
        const out = await r.json();
        if (!r.ok)
          throw Error(out.error || "No se pudo incorporar una entrega");
        if (out.inserted) {
          added++;
          await onSynced();
        }
        if (out.requiresPreview) preview = true;
      }
      setStatus(
        `${added ? `${added} entrega(s) incorporadas. ` : "Imágenes al día. "}${preview ? "PDF y video: elige la página o fotograma en Revisión." : "Cada versión conserva su espacio."}`,
      );
    } catch (e) {
      setStatus((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }, [publicationId, onSynced]);
  useEffect(() => {
    const timer = setTimeout(() => void sync(), 0);
    return () => clearTimeout(timer);
  }, [sync]);
  return (
    <div className="st-sketch-sync">
      <span role="status">{status}</span>
      <button disabled={busy} onClick={() => void sync()}>
        Actualizar entregas
      </button>
    </div>
  );
}
