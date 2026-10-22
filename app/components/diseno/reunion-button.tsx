"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Loader2, Presentation } from "lucide-react";
import { toast } from "sonner";

const URL = "/api/diseno/reunion";
const ReunionContext = createContext<{
  ids: Set<string>; pendientes: Set<string>; cambiar: (id: string) => Promise<void>;
} | null>(null);

// Una lectura por tablero, compartida por sus tarjetas y filas.
export function DisenoReunionProvider({ initialIds, children }: { initialIds: string[]; children: ReactNode }) {
  const [ids, setIds] = useState(() => new Set(initialIds));
  const [pendientes, setPendientes] = useState(new Set<string>());
  const ocupados = useRef(new Set<string>());
  const revision = useRef(0);
  const leyendo = useRef(false);
  const cargar = useCallback(async () => {
    if (leyendo.current || ocupados.current.size || document.visibilityState !== "visible") return;
    leyendo.current = true;
    const version = revision.current;
    try {
      const r = await fetch(URL, { cache: "no-store" });
      if (r.ok) {
        const data = await r.json();
        if (version === revision.current) setIds(new Set(data.ids));
      }
    } catch { /* Conserva el estado confirmado si no hay red. */ }
    finally { leyendo.current = false; }
  }, []);
  useEffect(() => {
    const inicio = setTimeout(() => void cargar(), 0);
    const intervalo = setInterval(() => void cargar(), 30000);
    window.addEventListener("focus", cargar);
    window.addEventListener("distinto:reunion-temas", cargar);
    document.addEventListener("visibilitychange", cargar);
    return () => {
      clearTimeout(inicio); clearInterval(intervalo);
      window.removeEventListener("focus", cargar);
      window.removeEventListener("distinto:reunion-temas", cargar);
      document.removeEventListener("visibilitychange", cargar);
    };
  }, [cargar]);

  async function cambiar(id: string) {
    if (ocupados.current.has(id)) return;
    ocupados.current.add(id); revision.current++;
    setPendientes(new Set(ocupados.current));
    try {
      const r = await fetch(URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ publicacionId: id, activa: !ids.has(id) }) });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || "No se pudo guardar la selección");
      setIds((actual) => {
        const next = new Set(actual);
        if (out.activa) next.add(id); else next.delete(id);
        return next;
      });
      toast.success(out.activa ? `Para presentar en reunión · ${out.marcas.join(", ")}` : "Diseño retirado de la próxima reunión");
      window.dispatchEvent(new Event("distinto:reunion-temas"));
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally {
      ocupados.current.delete(id); revision.current++;
      setPendientes(new Set(ocupados.current));
    }
  }
  return <ReunionContext.Provider value={{ ids, pendientes, cambiar }}>{children}</ReunionContext.Provider>;
}

export function DisenoReunionButton({ id, marcas }: { id: string; marcas: { slug: string; nombre: string }[] }) {
  const ctx = useContext(ReunionContext);
  if (!ctx) return null;
  const activa = ctx.ids.has(id), pendiente = ctx.pendientes.has(id);
  const nombres = [...new Set(marcas.filter((m) => m.slug !== "interno" && m.slug !== "unknown").map((m) => m.nombre))];
  return (
    <button type="button" aria-pressed={activa} disabled={pendiente || !nombres.length}
      title={nombres.length ? `${activa ? "Quitar de" : "Mostrar en"} la próxima reunión de ${nombres.join(", ")}` : "Asigna una marca al diseño para presentarlo"}
      onClick={(e) => { e.stopPropagation(); void ctx.cambiar(id); }}
      onPointerDown={(e) => e.stopPropagation()} draggable={false}
      className="inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-[11px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      style={{ background: activa ? "#f3e8ff" : "transparent", color: activa ? "#7e22ce" : "var(--mk-text-secondary, #6b657a)", borderColor: activa ? "#d8b4fe" : "var(--mk-border-subtle, #e9e2f2)", cursor: pendiente ? "wait" : undefined }}>
      {pendiente ? <Loader2 size={13} className="shrink-0 animate-spin" /> : activa ? <Check size={13} className="shrink-0" /> : <Presentation size={13} className="shrink-0" />}
      <span>Para presentar en reunión</span>
    </button>
  );
}
