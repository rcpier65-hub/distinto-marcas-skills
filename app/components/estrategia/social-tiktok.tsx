"use client";
/* Sección TikTok del reporte de redes: conectar la cuenta de la marca (desde la
   app o con un enlace para el cliente) y ver sus métricas. Pedro 18-oct-2026. */
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link2, LogIn, Unplug, ArrowUpRight, Loader2 } from "lucide-react";
import type { TikTokReporte } from "@/lib/tiktok/server";
import { TikTokLogo } from "./social-icons";

const n = (v: number | null | undefined) => (v === null || v === undefined ? "—" : Math.round(v).toLocaleString("es-PE"));

export function useTikTok(slug: string, month: string, enabled = true) {
  const [state, setState] = useState<{ data?: TikTokReporte; error?: string }>({});
  const [rev, setRev] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const c = new AbortController();
    void fetch(`/api/tiktok/cuenta?${new URLSearchParams({ marca: slug, mes: month })}`, { signal: c.signal, cache: "no-store" })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw Error(j.error || "No se pudo consultar TikTok.");
        return j as TikTokReporte;
      })
      .then((data) => { if (!c.signal.aborted) setState({ data }); })
      .catch((e) => { if (!c.signal.aborted) setState({ error: e.message }); });
    return () => c.abort();
  }, [slug, month, enabled, rev]);
  return { ...state, recargar: () => setRev((x) => x + 1) };
}

const card: React.CSSProperties = { background: "#fff", border: "1px solid #e8e2ef", borderRadius: 18, padding: "20px 22px", marginTop: 28, boxShadow: "0 8px 24px #32215805" };
const btn = (primary = false): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 7, height: 38, padding: "0 14px", borderRadius: 10, fontWeight: 600, fontSize: 13.5, cursor: "pointer", textDecoration: "none",
  border: primary ? "0" : "1px solid #dfd5f3", background: primary ? "#000" : "#fff", color: primary ? "#fff" : "#6d3ace",
});

export function TikTokSection({ slug, month }: { slug: string; month: string }) {
  const { data, error, recargar } = useTikTok(slug, month);
  const [copiando, setCopiando] = useState(false);
  const [quitando, setQuitando] = useState(false);

  async function copiarEnlace() {
    setCopiando(true);
    try {
      const r = await fetch("/api/tiktok/cuenta", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marca: slug }) });
      const j = await r.json();
      if (!r.ok) throw Error(j.error || "No se pudo crear el enlace.");
      await navigator.clipboard.writeText(j.enlace);
      toast.success("Enlace copiado. Envíaselo al cliente: vence en 3 días y sirve una sola vez.");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setCopiando(false);
    }
  }
  async function quitar() {
    if (!window.confirm("¿Desconectar la cuenta de TikTok de esta marca? Dejará de aparecer en los reportes.")) return;
    setQuitando(true);
    try {
      const r = await fetch(`/api/tiktok/cuenta?marca=${encodeURIComponent(slug)}`, { method: "DELETE" });
      if (!r.ok) throw Error("No se pudo desconectar.");
      toast.success("TikTok desconectado");
      recargar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setQuitando(false);
    }
  }

  const header = (extra?: React.ReactNode) => (
    <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
      <TikTokLogo size={34} />
      <div style={{ flex: 1, minWidth: 160 }}>
        <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>TikTok</h3>
        <p style={{ margin: 0, fontSize: 13, color: "#767084" }}>
          {data?.perfil?.username ? `@${data.perfil.username}` : data?.conectado ? "Cuenta conectada" : "Cuenta sin conectar"}
        </p>
      </div>
      {extra}
    </div>
  );

  if (error) return <div style={card}>{header()}<p role="alert" style={{ color: "#b42318", fontSize: 13, marginTop: 12 }}>{error}</p></div>;
  if (!data) return <div style={card}>{header(<Loader2 size={18} className="animate-spin" />)}</div>;

  if (!data.conectado)
    return (
      <div style={card}>
        {header()}
        <p style={{ fontSize: 13.5, color: "#5b5470", margin: "12px 0 14px" }}>
          {data.configurado
            ? "Conecta la cuenta de TikTok de esta marca para sumar seguidores, likes y el rendimiento de sus videos al reporte. Si no tienes el acceso, copia el enlace y envíaselo al cliente: lo abre, acepta en TikTok y listo."
            : "La conexión con TikTok aún no está configurada en el servidor."}
        </p>
        {data.configurado && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href={`/api/tiktok/conectar?marca=${encodeURIComponent(slug)}`} style={btn(true)}><LogIn size={15} /> Conectar TikTok</a>
            <button type="button" onClick={() => void copiarEnlace()} disabled={copiando} style={btn()}>
              {copiando ? <Loader2 size={15} className="animate-spin" /> : <Link2 size={15} />} Copiar enlace para el cliente
            </button>
          </div>
        )}
      </div>
    );

  const p = data.perfil, m = data.mes;
  const snaps = data.seguidores.filter((s) => s.followers !== null);
  const ganados = snaps.length >= 2 ? (snaps[snaps.length - 1].followers! - snaps[0].followers!) : null;
  return (
    <div style={card}>
      {header(
        <div style={{ display: "flex", gap: 8 }}>
          {p?.profile_deep_link && <a href={p.profile_deep_link} target="_blank" rel="noopener noreferrer" style={btn()}>Ver perfil <ArrowUpRight size={14} /></a>}
          <button type="button" onClick={() => void quitar()} disabled={quitando} style={{ ...btn(), color: "#b42318", borderColor: "#f3d0cc" }} title="Desconectar TikTok">
            <Unplug size={15} />
          </button>
        </div>,
      )}
      {data.error && <p role="alert" style={{ color: "#b42318", fontSize: 13, marginTop: 12 }}>{data.error}</p>}
      {p && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginTop: 16 }}>
          {[
            ["Seguidores", n(p.follower_count), ganados !== null ? `${ganados >= 0 ? "+" : ""}${ganados.toLocaleString("es-PE")} desde ${snaps[0].day}` : "total actual"],
            ["Likes totales", n(p.likes_count), "acumulado de la cuenta"],
            ["Videos", n(p.video_count), "publicados en total"],
            ["Videos del mes", n(m?.videos ?? null), "publicados en el periodo"],
          ].map(([t, v, s]) => (
            <div key={t} style={{ background: "#faf8ff", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontSize: 11.5, color: "#767084", fontWeight: 600 }}>{t}</div>
              <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-.02em" }}>{v}</div>
              <div style={{ fontSize: 10.5, color: "#9a93a8" }}>{s}</div>
            </div>
          ))}
        </div>
      )}
      {m && m.videos > 0 && (
        <>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", fontSize: 13, color: "#5b5470", margin: "16px 0 10px" }}>
            <span><b style={{ color: "#1f1a2e" }}>{n(m.views)}</b> vistas</span>
            <span><b style={{ color: "#1f1a2e" }}>{n(m.likes)}</b> me gusta</span>
            <span><b style={{ color: "#1f1a2e" }}>{n(m.comments)}</b> comentarios</span>
            <span><b style={{ color: "#1f1a2e" }}>{n(m.shares)}</b> compartidos</span>
            <span style={{ color: "#9a93a8" }}>· de los videos publicados en el periodo (acumulado al consultar)</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: 10 }}>
            {m.top.map((v) => (
              <a key={v.id} href={v.url ?? "#"} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", color: "inherit", borderRadius: 12, overflow: "hidden", border: "1px solid #efe9f7", background: "#fff" }}>
                <div style={{ aspectRatio: "9 / 14", background: "#111", position: "relative" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v.cover && <img src={v.cover} alt="" referrerPolicy="no-referrer" loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                  <span style={{ position: "absolute", bottom: 6, left: 6, background: "rgba(0,0,0,.65)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>▶ {n(v.views)}</span>
                </div>
                <div style={{ padding: "6px 8px", fontSize: 11, color: "#5b5470", lineHeight: 1.35, maxHeight: 44, overflow: "hidden" }}>{v.title || "Video"}</div>
              </a>
            ))}
          </div>
        </>
      )}
      {m && m.videos === 0 && <p style={{ fontSize: 13, color: "#767084", marginTop: 14 }}>No hay videos publicados en este periodo.</p>}
      <p style={{ fontSize: 11, color: "#9a93a8", marginTop: 12 }}>
        Datos de la API oficial de TikTok (Display API). TikTok no entrega historial de seguidores: el crecimiento se mide desde que la cuenta se conectó, con una foto diaria.
      </p>
    </div>
  );
}
