"use client";
/* «Lo mejor del mes» dentro de Ver crecimiento (Pedro 21-oct-2026): las
   publicaciones con más vistas o más interacción, el más viral destacado,
   verlo ahí mismo y revisar sus comentarios para decidir qué repetir. */
import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Heart, MessageCircle, Play, Share2, Eye, X } from "lucide-react";
import type { Post, PostReport } from "@/lib/social-reports/model";
import { FacebookLogo, InstagramLogo } from "./social-icons";

type Orden = "vistas" | "interaccion";
type Comentario = { id: string; autor: string; texto: string; fecha: string; meGusta: number | null; respuestas: number };

const num = (v: number | null | undefined) => (v == null ? "—" : new Intl.NumberFormat("es-PE").format(v));
const interaccion = (p: Post) => (p.likes ?? 0) + (p.comments ?? 0) + (p.shares ?? 0);
const fecha = (iso: string) => new Date(iso).toLocaleDateString("es-PE", { day: "numeric", month: "short" });

/* Embed oficial: Instagram /embed y el plugin de Facebook. */
function embed(p: Post): string | null {
  if (!p.url) return null;
  if (p.network === "instagram") {
    const m = p.url.match(/^https:\/\/www\.instagram\.com\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    return m ? `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned/` : null;
  }
  if (!/^https:\/\/(www\.)?facebook\.com\//.test(p.url)) return null;
  const plugin = p.mediaType === "video" ? "video.php" : "post.php";
  return `https://www.facebook.com/plugins/${plugin}?href=${encodeURIComponent(p.url)}&show_text=true&width=500`;
}

export function MejoresDelMes({ slug, month, orden }: { slug: string; month: string; orden: Orden }) {
  const [data, setData] = useState<PostReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [abierta, setAbierta] = useState<Post | null>(null);

  useEffect(() => {
    const c = new AbortController();
    fetch(`/api/meta/reporte-redes?${new URLSearchParams({ marca: slug, mes: month, detalle: "posts" })}`, { signal: c.signal, cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "No se pudieron cargar las publicaciones"); setData(j); })
      .catch((e) => { if (!c.signal.aborted) setError(e instanceof Error ? e.message : "No se pudieron cargar las publicaciones"); });
    return () => c.abort();
  }, [slug, month]);

  const lista = useMemo(() => {
    const todas = (data?.groups ?? []).flatMap((g) => g.posts);
    return [...todas].sort((a, b) => (orden === "vistas" ? (b.views ?? -1) - (a.views ?? -1) : interaccion(b) - interaccion(a))).slice(0, 6);
  }, [data, orden]);

  if (error) return <p role="alert" style={{ color: "#b42318", fontSize: 13, marginTop: 18 }}>{error}</p>;
  return (
    <section style={{ marginTop: 22 }}>
      <h3 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 4px" }}>{orden === "vistas" ? "Lo más visto del mes" : "Lo que más interacción generó"}</h3>
      <p style={{ fontSize: 12.5, color: "#767084", margin: "0 0 12px" }}>
        {orden === "vistas" ? "Ordenado por visualizaciones." : "Ordenado por Me gusta + comentarios + compartidos."} Cifras acumuladas hasta la última actualización del reporte.
      </p>
      {!data ? <div role="status" style={{ fontSize: 13, color: "#8a8398" }}>Buscando las publicaciones del mes…</div>
        : !lista.length ? <p style={{ fontSize: 13, color: "#8a8398" }}>Meta no entregó publicaciones con métricas para este mes.</p> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 12 }}>
            {lista.map((p, i) => (
              <article key={p.id} style={{ gridColumn: i === 0 ? "1 / -1" : undefined, display: "grid", gridTemplateColumns: i === 0 ? "minmax(160px,220px) 1fr" : "1fr", gap: 12, border: `1px solid ${i === 0 ? "#c9b3f4" : "#ece6f5"}`, borderRadius: 16, padding: 10, background: i === 0 ? "#faf6ff" : "#fff" }}>
                <button type="button" onClick={() => setAbierta(p)} aria-label={`Ver la publicación ${p.caption.slice(0, 40)}`}
                  style={{ position: "relative", border: 0, padding: 0, borderRadius: 12, overflow: "hidden", background: "#f1ecf9", aspectRatio: i === 0 ? "4 / 5" : "16 / 10", cursor: "pointer" }}>
                  {p.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.image} alt="" loading="lazy" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ) : null}
                  <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ width: 44, height: 44, borderRadius: 999, background: "rgba(20,12,35,.62)", color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      {p.mediaType === "video" ? <Play size={20} fill="#fff" /> : <Eye size={19} />}
                    </span>
                  </span>
                </button>
                <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#767084" }}>
                    {p.network === "facebook" ? <FacebookLogo size={14} /> : <InstagramLogo size={14} />}
                    {fecha(p.publishedAt)}{p.mediaType === "video" ? " · Video" : p.mediaType === "carrusel" ? " · Carrusel" : ""}
                    {i === 0 && <strong style={{ marginLeft: "auto", fontSize: 11.5, color: "#6d28d9", background: "#ede4fd", padding: "2px 8px", borderRadius: 999 }}>{orden === "vistas" ? "El más visto" : "El más viral"}</strong>}
                  </div>
                  <p style={{ margin: 0, fontSize: 13, lineHeight: 1.45, color: "#3a3349", display: "-webkit-box", WebkitLineClamp: i === 0 ? 4 : 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{p.caption}</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 12, fontSize: 12.5, fontWeight: 700, color: "#2b2140" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Eye size={13} /> {num(p.views)}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Heart size={13} /> {num(p.likes)}</span>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><MessageCircle size={13} /> {num(p.comments)}</span>
                    {p.shares != null && <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><Share2 size={13} /> {num(p.shares)}</span>}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setAbierta(p)} style={boton(true)}>{p.mediaType === "video" ? "Ver video" : "Ver publicación"}</button>
                    <button type="button" onClick={() => setAbierta(p)} style={boton(false)}>Comentarios{p.comments != null ? ` (${num(p.comments)})` : ""}</button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      {abierta && <VerPublicacion slug={slug} post={abierta} cerrar={() => setAbierta(null)} />}
    </section>
  );
}

const boton = (principal: boolean): React.CSSProperties => ({
  padding: "7px 12px", borderRadius: 10, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
  border: `1px solid ${principal ? "#6d28d9" : "#e2d8f2"}`, background: principal ? "#6d28d9" : "#fff", color: principal ? "#fff" : "#4c3f66",
});

/* La publicación embebida a la izquierda y sus comentarios a la derecha. */
function VerPublicacion({ slug, post, cerrar }: { slug: string; post: Post; cerrar: () => void }) {
  const [c, setC] = useState<{ total: number | null; comentarios: Comentario[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const src = embed(post);
  useEffect(() => {
    const ctl = new AbortController();
    fetch(`/api/meta/reporte-redes/comentarios?${new URLSearchParams({ marca: slug, red: post.network, id: post.id })}`, { signal: ctl.signal, cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (!r.ok) throw new Error(j.error || "No se pudieron cargar los comentarios"); setC(j); })
      .catch((e) => { if (!ctl.signal.aborted) setError(e instanceof Error ? e.message : "No se pudieron cargar los comentarios"); });
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cerrar(); } };
    window.addEventListener("keydown", esc, true);
    return () => { ctl.abort(); window.removeEventListener("keydown", esc, true); };
  }, [slug, post, cerrar]);
  return (
    <div role="dialog" aria-modal="true" aria-label="Publicación y comentarios" onClick={(e) => { if (e.target === e.currentTarget) cerrar(); }}
      style={{ position: "fixed", inset: 0, zIndex: 80, background: "rgba(20,12,35,.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "min(980px, 96vw)", maxHeight: "92vh", background: "#fff", borderRadius: 20, overflow: "hidden", display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", boxShadow: "0 30px 80px -20px rgba(30,15,60,.5)" }}>
        <div style={{ background: "#f6f2fc", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 420 }}>
          {src ? <iframe src={src} title="Publicación" style={{ width: "100%", height: "min(86vh, 760px)", border: 0, background: "#fff" }} allow="autoplay; encrypted-media; picture-in-picture" />
            : <p style={{ fontSize: 13, color: "#767084", padding: 20 }}>Esta publicación no se puede mostrar aquí.</p>}
        </div>
        <div style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "16px 18px", borderBottom: "1px solid #f0ebf7" }}>
            <MessageCircle size={18} color="#6d28d9" />
            <strong style={{ fontSize: 15, flex: 1 }}>Comentarios{c?.total != null ? ` · ${num(c.total)}` : ""}</strong>
            {post.url && <a href={post.url} target="_blank" rel="noopener noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12.5, fontWeight: 700, color: "#6d28d9" }}><ExternalLink size={13} /> Abrir en {post.network === "instagram" ? "Instagram" : "Facebook"}</a>}
            <button type="button" onClick={cerrar} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 9, border: "1px solid #ece6f5", background: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}><X size={16} /></button>
          </div>
          <div style={{ overflowY: "auto", padding: "8px 18px 18px", flex: 1 }}>
            {error ? <p role="alert" style={{ fontSize: 13, color: "#b42318" }}>{error}</p>
              : !c ? <p role="status" style={{ fontSize: 13, color: "#8a8398" }}>Cargando comentarios…</p>
                : !c.comentarios.length ? <p style={{ fontSize: 13, color: "#8a8398" }}>Esta publicación no tiene comentarios.</p>
                  : c.comentarios.map((x) => (
                    <div key={x.id} style={{ padding: "10px 0", borderBottom: "1px solid #f4f0f9" }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", fontSize: 12.5 }}>
                        <strong>{x.autor}</strong>
                        <span style={{ color: "#9a93a8" }}>{x.fecha ? fecha(x.fecha) : ""}</span>
                        {x.meGusta ? <span style={{ marginLeft: "auto", color: "#9a93a8", display: "inline-flex", alignItems: "center", gap: 3 }}><Heart size={11} /> {x.meGusta}</span> : null}
                      </div>
                      <p style={{ margin: "3px 0 0", fontSize: 13.5, lineHeight: 1.45, color: "#2b2140", whiteSpace: "pre-wrap" }}>{x.texto}</p>
                      {x.respuestas > 0 && <small style={{ color: "#8a8398" }}>{x.respuestas} respuesta{x.respuestas === 1 ? "" : "s"}</small>}
                    </div>
                  ))}
            {c && c.total != null && c.comentarios.length < c.total && <p style={{ fontSize: 12, color: "#8a8398" }}>Se muestran los {c.comentarios.length} más recientes.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
