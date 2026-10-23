"use client";
import { useEffect, useRef, useState } from "react";
import { FileImage, FileText, Film, MessageSquare } from "lucide-react";
import type { DeliveryVersion, ReviewNote } from "@/lib/creative-review/model";

function FileThumbnail({ version }: { version: DeliveryVersion }) {
  const holder = useRef<HTMLSpanElement>(null);
  const [mime, setMime] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!holder.current) return;
    const ac = new AbortController();
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void fetch(`/api/creative-review/media/${version.id}?info=1`, {
        signal: ac.signal,
      })
        .then(async (r) => {
          if (r.ok) {
            const d = await r.json();
            setMime(d.mime);
          }
        })
        .catch(() => {});
    });
    observer.observe(holder.current);
    return () => {
      observer.disconnect();
      ac.abort();
    };
  }, [version.id]);
  return (
    <span className="cr-thumbnail" ref={holder}>
      {mime.startsWith("image/") && !failed ? (
        <img
          loading="lazy"
          src={`/api/creative-review/media/${version.id}`}
          alt=""
          onError={() => setFailed(true)}
        />
      ) : mime === "application/pdf" ? (
        <FileText size={25} />
      ) : version.category === "video" ? (
        <Film size={25} />
      ) : (
        <FileImage size={25} />
      )}
    </span>
  );
}

export function FileGallery({
  groups,
  active,
  notes,
  onSelect,
}: {
  groups: DeliveryVersion[];
  active: DeliveryVersion;
  notes: ReviewNote[];
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="cr-gallery" aria-label="Archivos de esta tarea">
      <small>ARCHIVOS · {groups.length}</small>
      {groups.map((g, i) => {
        const count = notes.filter((n) => n.version_id === g.id).length;
        return (
          <button
            key={g.id}
            aria-label={`Archivo ${i + 1}: ${g.title} · ${g.label}`}
            aria-current={
              active.publicacion_id === g.publicacion_id &&
              active.slot === g.slot
                ? "true"
                : undefined
            }
            onClick={() => onSelect(g.id)}
            title={`${g.title} · ${g.label}`}
          >
            <FileThumbnail key={g.id} version={g} />
            <span className="cr-gallery-name">{g.title}</span>
            <span className="cr-gallery-label">
              {g.label} · V{g.version}
            </span>
            {!!count && (
              <span className="cr-gallery-count">
                <MessageSquare size={11} /> {count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
}
