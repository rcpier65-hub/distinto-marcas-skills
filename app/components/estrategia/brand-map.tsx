"use client";
/* Mapa de marca (Pedro 21-oct-2026): mapa mental con la marca al centro,
   posicionamiento y propuesta de valor a la izquierda y las 7 maletas de la
   persuasión a la derecha. Clic en cualquier nodo abre el detalle; dirección
   lo edita ahí. En celular se muestra como lista. */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { BadgeCheck, CircleHelp, Compass, Gem, Luggage, PencilLine, Sparkles } from "lucide-react";
import { Modal, PrettyDate } from "./common";
import { MALETAS, RAMAS, mapaVacio, nodoVacio, type MapaMarca, type Nodo } from "@/lib/marca-mapa/model";

type Datos = { mapa: MapaMarca; existe: boolean; actualizado: string | null; actualizadoPor: string | null; puedeEditar: boolean };
type Sel = { tipo: "centro" } | { tipo: "rama"; id: (typeof RAMAS)[number]["id"] } | { tipo: "maleta"; id: (typeof MALETAS)[number]["id"] };

/* Lienzo de diseño (se escala al ancho disponible). */
const W = 1180, H = 800;
const CENTRO = { x: 380, y: 320, w: 260, h: 160 };
const RAMA_POS = { posicionamiento: { x: 16, y: 130 }, propuesta: { x: 16, y: 480 } } as const;
const RAMA = { w: 290, h: 190 };
const HUB = { x: 700, y: 360, w: 150, h: 80 };
const HOJA = { x: 900, w: 270, h: 96, paso: 113, y0: 12 };

const curva = (x1: number, y1: number, x2: number, y2: number) => {
  const dx = (x2 - x1) / 2;
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
};

export function BrandMap({ slug, brandName }: { slug: string; brandName: string }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const caja = useRef<HTMLDivElement>(null);
  const [escala, setEscala] = useState(1);

  const cargar = useCallback(async () => {
    try {
      const r = await fetch(`/api/estrategia/mapa?marca=${encodeURIComponent(slug)}`, { cache: "no-store" });
      const out = await r.json();
      if (!r.ok) throw new Error(out.error || "No se pudo cargar el mapa");
      setDatos(out);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo cargar el mapa");
    }
  }, [slug]);
  useEffect(() => {
    const t = setTimeout(() => void cargar(), 0);
    return () => clearTimeout(t);
  }, [cargar]);
  useEffect(() => {
    const el = caja.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setEscala(Math.min(1, e.contentRect.width / W)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [datos]);

  const guardar = async (mapa: MapaMarca) => {
    const r = await fetch("/api/estrategia/mapa", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ marca: slug, mapa }) });
    const out = await r.json();
    if (!r.ok) { toast.error(out.error || "No se pudo guardar"); return false; }
    setDatos(out);
    toast.success("Mapa guardado");
    return true;
  };

  if (error) return <section className="st-card st-bm-empty"><p>{error}</p><button onClick={() => void cargar()}>Reintentar</button></section>;
  if (!datos) return <section className="st-card st-bm-empty"><p>Cargando mapa de marca…</p></section>;

  const m = datos.mapa;
  const porValidar = [...RAMAS.map((r) => m.ramas[r.id]), ...MALETAS.map((x) => m.maletas[x.id])].filter((n) => n.propuesta && !nodoVacio(n)).length;
  const vacios = [...RAMAS.map((r) => m.ramas[r.id]), ...MALETAS.map((x) => m.maletas[x.id])].filter(nodoVacio).length;
  const compacto = escala < 0.62;

  const NodoCard = ({ titulo, n, pregunta, numero, onClick, className, style }: { titulo: string; n: Nodo; pregunta: string; numero?: number; onClick: () => void; className: string; style?: React.CSSProperties }) => (
    <button type="button" className={`st-bm-node ${className} ${nodoVacio(n) ? "st-bm-vacio" : ""}`} style={style} onClick={onClick} aria-label={`Abrir ${titulo}`}>
      <span className="st-bm-node-head">
        {numero !== undefined && <span className="st-bm-num">{numero}</span>}
        <strong>{titulo}</strong>
        {n.propuesta && !nodoVacio(n) && <span className="st-bm-flag" title="Propuesta de la agencia, falta validar con el cliente">Por validar</span>}
      </span>
      <span className="st-bm-text">{nodoVacio(n) ? pregunta : n.resumen || n.puntos[0]}</span>
      {!compacto && className.includes("st-bm-rama") && n.puntos.length > 0 && (
        <ul>{n.puntos.slice(0, 3).map((p, i) => <li key={i}>{p}</li>)}</ul>
      )}
    </button>
  );

  return (
    <section className="st-bm">
      <div className="st-section-title st-bm-title">
        <div>
          <h2>Mapa de marca</h2>
          <p>Lo esencial de {brandName} en una sola vista: dónde se ubica, qué promete y las 7 dudas que un anuncio debe resolver para vender.</p>
        </div>
        <div className="st-bm-meta">
          <span className={m.estado === "validado" ? "st-bm-chip st-bm-ok" : "st-bm-chip"}>
            {m.estado === "validado" ? <><BadgeCheck size={13} /> Validado con el cliente</> : <><PencilLine size={13} /> Borrador</>}
          </span>
          {porValidar > 0 && <span className="st-bm-chip st-bm-warn">{porValidar} por validar</span>}
          {vacios > 0 && <span className="st-bm-chip">{vacios} sin completar</span>}
          {datos.actualizado && <small>Actualizado <PrettyDate value={datos.actualizado} />{datos.actualizadoPor ? ` por ${datos.actualizadoPor.split(" ")[0]}` : ""}</small>}
        </div>
      </div>

      {/* Mapa mental (escritorio y tablet) */}
      <div className="st-bm-canvas-wrap" ref={caja}>
        <div className="st-bm-canvas" style={{ width: W, height: H, transform: `scale(${escala})`, marginBottom: (escala - 1) * H }}>
          <svg className="st-bm-lines" width={W} height={H} aria-hidden="true">
            {RAMAS.map((r) => (
              <path key={r.id} d={curva(CENTRO.x, CENTRO.y + CENTRO.h / 2, RAMA_POS[r.id].x + RAMA.w, RAMA_POS[r.id].y + RAMA.h / 2)} className="st-bm-line st-bm-line-rama" />
            ))}
            <path d={curva(CENTRO.x + CENTRO.w, CENTRO.y + CENTRO.h / 2, HUB.x, HUB.y + HUB.h / 2)} className="st-bm-line" />
            {MALETAS.map((x, i) => (
              <path key={x.id} d={curva(HUB.x + HUB.w, HUB.y + HUB.h / 2, HOJA.x, HOJA.y0 + i * HOJA.paso + HOJA.h / 2)} className="st-bm-line st-bm-line-hoja" />
            ))}
          </svg>

          <button type="button" className="st-bm-center" style={{ left: CENTRO.x, top: CENTRO.y, width: CENTRO.w, height: CENTRO.h }} onClick={() => setSel({ tipo: "centro" })} aria-label="Abrir la frase de la marca">
            <Sparkles size={18} />
            <strong>{brandName}</strong>
            <span>{m.frase || "Escribe la frase que resume la marca"}</span>
          </button>

          {RAMAS.map((r) => (
            <NodoCard key={r.id} titulo={r.titulo} n={m.ramas[r.id]} pregunta={r.pregunta} className={`st-bm-rama st-bm-${r.id}`}
              style={{ left: RAMA_POS[r.id].x, top: RAMA_POS[r.id].y, width: RAMA.w, height: RAMA.h }} onClick={() => setSel({ tipo: "rama", id: r.id })} />
          ))}

          <div className="st-bm-hub" style={{ left: HUB.x, top: HUB.y, width: HUB.w, height: HUB.h }}>
            <Luggage size={17} />
            <strong>7 maletas</strong>
            <small>de la persuasión</small>
          </div>

          {MALETAS.map((x, i) => (
            <NodoCard key={x.id} titulo={x.titulo} n={m.maletas[x.id]} pregunta={x.pregunta} numero={i + 1} className="st-bm-hoja"
              style={{ left: HOJA.x, top: HOJA.y0 + i * HOJA.paso, width: HOJA.w, height: HOJA.h }} onClick={() => setSel({ tipo: "maleta", id: x.id })} />
          ))}
        </div>
      </div>

      {/* Lista (celular) */}
      <div className="st-bm-list">
        <button type="button" className="st-bm-center" onClick={() => setSel({ tipo: "centro" })}>
          <Sparkles size={18} /><strong>{brandName}</strong><span>{m.frase || "Escribe la frase que resume la marca"}</span>
        </button>
        {RAMAS.map((r) => <NodoCard key={r.id} titulo={r.titulo} n={m.ramas[r.id]} pregunta={r.pregunta} className={`st-bm-rama st-bm-${r.id}`} onClick={() => setSel({ tipo: "rama", id: r.id })} />)}
        <div className="st-bm-hub"><Luggage size={17} /><strong>7 maletas</strong><small>de la persuasión</small></div>
        {MALETAS.map((x, i) => <NodoCard key={x.id} titulo={x.titulo} n={m.maletas[x.id]} pregunta={x.pregunta} numero={i + 1} className="st-bm-hoja" onClick={() => setSel({ tipo: "maleta", id: x.id })} />)}
      </div>

      <p className="st-bm-source"><CircleHelp size={13} /> Las 7 maletas vienen de <em>The Brain Audit</em> (Sean D&apos;Souza): mientras una duda siga «dando vueltas en la cinta», el cliente no compra. Cada anuncio debería bajar al menos una.</p>

      {sel && <Detalle sel={sel} datos={datos} brandName={brandName} cerrar={() => setSel(null)} guardar={guardar} />}
    </section>
  );
}

function Detalle({ sel, datos, brandName, cerrar, guardar }: { sel: Sel; datos: Datos; brandName: string; cerrar: () => void; guardar: (m: MapaMarca) => Promise<boolean> }) {
  const m = datos.mapa;
  const info = sel.tipo === "centro"
    ? { titulo: brandName, pregunta: "La frase que resume la marca en una línea.", icono: <Sparkles size={16} /> }
    : sel.tipo === "rama"
      ? { ...RAMAS.find((r) => r.id === sel.id)!, icono: sel.id === "posicionamiento" ? <Compass size={16} /> : <Gem size={16} /> }
      : { ...MALETAS.find((x) => x.id === sel.id)!, icono: <Luggage size={16} /> };
  const nodo: Nodo | null = sel.tipo === "rama" ? m.ramas[sel.id] : sel.tipo === "maleta" ? m.maletas[sel.id] : null;
  const [editando, setEditando] = useState(false);
  const [frase, setFrase] = useState(m.frase);
  const [estado, setEstado] = useState(m.estado);
  const [resumen, setResumen] = useState(nodo?.resumen ?? "");
  const [puntos, setPuntos] = useState((nodo?.puntos ?? []).join("\n"));
  const [propuesta, setPropuesta] = useState(nodo?.propuesta ?? false);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async () => {
    const copia: MapaMarca = structuredClone(m ?? mapaVacio());
    if (sel.tipo === "centro") { copia.frase = frase.trim(); copia.estado = estado; }
    else {
      const n = { resumen: resumen.trim(), puntos: puntos.split("\n").map((p) => p.replace(/^[-•·]\s*/, "").trim()).filter(Boolean).slice(0, 12), propuesta };
      if (sel.tipo === "rama") copia.ramas[sel.id] = n; else copia.maletas[sel.id] = n;
    }
    setOcupado(true);
    const ok = await guardar(copia);
    setOcupado(false);
    if (ok) setEditando(false);
  };

  return (
    <Modal title={info.titulo} close={cerrar}>
      <div className="st-bm-detail">
        <p className="st-bm-q">{info.icono} {info.pregunta}</p>
        {!editando ? (
          <>
            {sel.tipo === "centro" ? (
              <p className="st-bm-big">{m.frase || "Aún no hay una frase para esta marca."}</p>
            ) : nodo && !nodoVacio(nodo) ? (
              <>
                {nodo.propuesta && <p className="st-bm-warnbox">Propuesta de la agencia: falta validarla con el cliente.</p>}
                {nodo.resumen && <p className="st-bm-big">{nodo.resumen}</p>}
                {nodo.puntos.length > 0 && <ul className="st-bm-points">{nodo.puntos.map((p, i) => <li key={i}>{p}</li>)}</ul>}
              </>
            ) : (
              <p className="st-bm-hint">Todavía no se completa esta parte del mapa.</p>
            )}
            {datos.puedeEditar && (
              <div className="st-bm-actions"><button className="st-primary" onClick={() => setEditando(true)}><PencilLine size={15} /> Editar</button></div>
            )}
          </>
        ) : (
          <form className="st-bm-form" onSubmit={(e) => { e.preventDefault(); void enviar(); }}>
            {sel.tipo === "centro" ? (
              <>
                <label>Frase de la marca<textarea rows={2} maxLength={200} value={frase} onChange={(e) => setFrase(e.target.value)} /></label>
                <label>Estado del mapa
                  <select value={estado} onChange={(e) => setEstado(e.target.value as MapaMarca["estado"])}>
                    <option value="borrador">Borrador</option>
                    <option value="validado">Validado con el cliente</option>
                  </select>
                </label>
              </>
            ) : (
              <>
                <label>Resumen (1–2 frases)<textarea rows={3} maxLength={400} value={resumen} onChange={(e) => setResumen(e.target.value)} /></label>
                <label>Puntos clave (uno por línea)<textarea rows={6} value={puntos} onChange={(e) => setPuntos(e.target.value)} /></label>
                <label className="st-bm-check"><input type="checkbox" checked={propuesta} onChange={(e) => setPropuesta(e.target.checked)} /> Propuesta de la agencia, falta validar con el cliente</label>
              </>
            )}
            <div className="st-bm-actions">
              <button type="button" onClick={() => setEditando(false)} disabled={ocupado}>Cancelar</button>
              <button type="submit" className="st-primary" disabled={ocupado}>{ocupado ? "Guardando…" : "Guardar"}</button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
}
