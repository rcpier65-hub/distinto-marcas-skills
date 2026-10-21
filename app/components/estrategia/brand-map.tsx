"use client";
/* Mapa de marca (Pedro 21-oct-2026): "profesional, desglosable y fácil de
   entender". Arriba la arquitectura de marca (marca paraguas y sus marcas de
   producto); al elegir una, su mapa mental: posicionamiento y propuesta a la
   izquierda, las 7 maletas de la persuasión a la derecha, y su ficha (pregunta
   que responde, territorio, mensaje). Abajo, secciones desglosables (rutas,
   comparativos, qué no debe liderar, fuentes). Clic en un nodo abre el
   detalle; dirección lo edita ahí. En celular se muestra como lista. */
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertOctagon, BadgeCheck, BookOpen, ChevronDown, CircleHelp, Compass, Gem, Layers, Lightbulb, ListChecks,
  Luggage, MessageSquareQuote, PencilLine, Route, Sparkles, Stethoscope, Table2,
} from "lucide-react";
import { Modal, PrettyDate } from "./common";
import { MALETAS, RAMAS, mapaVacio, nodoVacio, type Bloque, type MapaMarca, type Nodo } from "@/lib/marca-mapa/model";

type Datos = { mapa: MapaMarca; existe: boolean; actualizado: string | null; actualizadoPor: string | null; puedeEditar: boolean };
type RamaId = (typeof RAMAS)[number]["id"];
type MaletaId = (typeof MALETAS)[number]["id"];
type Sel = { tipo: "centro" } | { tipo: "rama"; id: RamaId } | { tipo: "maleta"; id: MaletaId };

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

/* La marca enfocada: -1 = marca principal; 0.. = marca de producto. */
function vista(m: MapaMarca, foco: number, brandName: string) {
  const s = foco >= 0 ? m.submarcas[foco] : null;
  const base = s ?? m;
  return {
    nombre: s ? s.nombre : brandName,
    principal: !s,
    lema: s ? s.concepto : m.frase,
    perfil: base,
    ramas: base.ramas,
    maletas: base.maletas,
    bloques: s ? s.bloques : [],
  };
}

const ICONOS: Record<Bloque["icono"], React.ReactNode> = {
  idea: <Lightbulb size={16} />, diagnostico: <Stethoscope size={16} />, ruta: <Route size={16} />, tabla: <Table2 size={16} />,
  mensajes: <MessageSquareQuote size={16} />, alerta: <AlertOctagon size={16} />, fuentes: <BookOpen size={16} />, lineas: <Layers size={16} />,
};

export function BrandMap({ slug, brandName }: { slug: string; brandName: string }) {
  const [datos, setDatos] = useState<Datos | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState<Sel | null>(null);
  const [foco, setFoco] = useState(-1);
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
  const f = foco < m.submarcas.length ? foco : -1;
  const v = vista(m, f, brandName);
  const nodos = [...RAMAS.map((r) => v.ramas[r.id]), ...MALETAS.map((x) => v.maletas[x.id])];
  const porValidar = nodos.filter((n) => n.propuesta && !nodoVacio(n)).length;
  const vacios = nodos.filter(nodoVacio).length;
  const compacto = escala < 0.62;
  const p = v.perfil;
  const ficha = [
    { t: "Pregunta que responde", x: p.pregunta },
    { t: "Territorio", x: p.territorio },
    { t: "Rol", x: p.rol },
    { t: "Rol emocional", x: p.rolEmocional },
  ].filter((x) => x.x);

  const NodoCard = ({ titulo, n, pregunta, numero, onClick, className, style }: { titulo: string; n: Nodo; pregunta: string; numero?: number; onClick: () => void; className: string; style?: React.CSSProperties }) => (
    <button type="button" className={`st-bm-node ${className} ${nodoVacio(n) ? "st-bm-vacio" : ""}`} style={style} onClick={onClick} aria-label={`Abrir ${titulo}`}>
      <span className="st-bm-node-head">
        {numero !== undefined && <span className="st-bm-num">{numero}</span>}
        <strong>{titulo}</strong>
        {n.propuesta && !nodoVacio(n) && <span className="st-bm-flag" title="Propuesta de la agencia, falta validar con el cliente">Por validar</span>}
      </span>
      <span className="st-bm-text">{nodoVacio(n) ? pregunta : n.resumen || n.puntos[0]}</span>
      {!compacto && className.includes("st-bm-rama") && n.puntos.length > 0 && (
        <ul>{n.puntos.slice(0, 3).map((x, i) => <li key={i}>{x}</li>)}</ul>
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

      {m.ideaCentral && (
        <div className="st-bm-idea"><Lightbulb size={18} /><div><small>Idea central</small><p>{m.ideaCentral}</p></div></div>
      )}

      {/* Arquitectura de marca: marca paraguas arriba, marcas de producto abajo. */}
      {m.submarcas.length > 0 && (
        <div className="st-bm-arq" role="tablist" aria-label="Marcas">
          <button type="button" role="tab" aria-selected={f === -1} className={`st-bm-arq-card st-bm-arq-top ${f === -1 ? "st-bm-arq-on" : ""}`} onClick={() => setFoco(-1)}>
            <small>Marca paraguas</small>
            <strong>{brandName}</strong>
            {m.concepto && <span>{m.concepto}</span>}
          </button>
          <div className="st-bm-arq-links" aria-hidden="true"><i /></div>
          <div className="st-bm-arq-row" style={{ gridTemplateColumns: `repeat(${m.submarcas.length}, minmax(0, 1fr))` }}>
            {m.submarcas.map((s, i) => (
              <button key={s.id} type="button" role="tab" aria-selected={f === i} className={`st-bm-arq-card ${f === i ? "st-bm-arq-on" : ""}`} onClick={() => setFoco(i)}>
                <small>Marca de producto</small>
                <strong>{s.nombre}</strong>
                {s.concepto && <em>{s.concepto}</em>}
                {s.rol && <span>{s.rol}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Ficha de la marca enfocada. */}
      {(ficha.length > 0 || p.mensaje || p.palabras.length > 0) && (
        <div className="st-bm-ficha">
          {ficha.map((x) => <div key={x.t} className="st-bm-ficha-item"><small>{x.t}</small><p>{x.x}</p></div>)}
          {(p.mensaje || p.ejemplos.length > 0) && (
            <div className="st-bm-ficha-item st-bm-ficha-msg">
              <small>Mensaje maestro</small>
              {p.mensaje && <strong>«{p.mensaje}»</strong>}
              {p.ejemplos.length > 0 && <ul>{p.ejemplos.map((e, i) => <li key={i}>{e}</li>)}</ul>}
            </div>
          )}
          {(p.palabras.length > 0 || p.evitar) && (
            <div className="st-bm-ficha-item">
              {p.palabras.length > 0 && <><small>Palabras clave</small><div className="st-bm-tags">{p.palabras.map((w) => <span key={w}>{w}</span>)}</div></>}
              {p.evitar && <p className="st-bm-evitar"><AlertOctagon size={12} /> No convertirla en: {p.evitar}</p>}
            </div>
          )}
        </div>
      )}

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

          <button type="button" className="st-bm-center" style={{ left: CENTRO.x, top: CENTRO.y, width: CENTRO.w, height: CENTRO.h }} onClick={() => setSel({ tipo: "centro" })} aria-label={`Abrir la frase de ${v.nombre}`}>
            <Sparkles size={18} />
            <strong>{v.nombre}</strong>
            <span>{v.lema || "Escribe la frase que resume la marca"}</span>
          </button>

          {RAMAS.map((r) => (
            <NodoCard key={r.id} titulo={r.titulo} n={v.ramas[r.id]} pregunta={r.pregunta} className={`st-bm-rama st-bm-${r.id}`}
              style={{ left: RAMA_POS[r.id].x, top: RAMA_POS[r.id].y, width: RAMA.w, height: RAMA.h }} onClick={() => setSel({ tipo: "rama", id: r.id })} />
          ))}

          <div className="st-bm-hub" style={{ left: HUB.x, top: HUB.y, width: HUB.w, height: HUB.h }}>
            <Luggage size={17} />
            <strong>7 maletas</strong>
            <small>de la persuasión</small>
          </div>

          {MALETAS.map((x, i) => (
            <NodoCard key={x.id} titulo={x.titulo} n={v.maletas[x.id]} pregunta={x.pregunta} numero={i + 1} className="st-bm-hoja"
              style={{ left: HOJA.x, top: HOJA.y0 + i * HOJA.paso, width: HOJA.w, height: HOJA.h }} onClick={() => setSel({ tipo: "maleta", id: x.id })} />
          ))}
        </div>
      </div>

      {/* Lista (celular) */}
      <div className="st-bm-list">
        <button type="button" className="st-bm-center" onClick={() => setSel({ tipo: "centro" })}>
          <Sparkles size={18} /><strong>{v.nombre}</strong><span>{v.lema || "Escribe la frase que resume la marca"}</span>
        </button>
        {RAMAS.map((r) => <NodoCard key={r.id} titulo={r.titulo} n={v.ramas[r.id]} pregunta={r.pregunta} className={`st-bm-rama st-bm-${r.id}`} onClick={() => setSel({ tipo: "rama", id: r.id })} />)}
        <div className="st-bm-hub"><Luggage size={17} /><strong>7 maletas</strong><small>de la persuasión</small></div>
        {MALETAS.map((x, i) => <NodoCard key={x.id} titulo={x.titulo} n={v.maletas[x.id]} pregunta={x.pregunta} numero={i + 1} className="st-bm-hoja" onClick={() => setSel({ tipo: "maleta", id: x.id })} />)}
      </div>

      {v.bloques.length > 0 && (
        <div className="st-bm-blocks">{v.bloques.map((b) => <BloqueVista key={b.id} b={b} abierto />)}</div>
      )}

      {m.bloques.length > 0 && (
        <div className="st-bm-blocks">
          <h3 className="st-bm-blocks-title"><ListChecks size={16} /> Estrategia de la marca</h3>
          {m.bloques.map((b) => <BloqueVista key={b.id} b={b} />)}
        </div>
      )}

      <p className="st-bm-source"><CircleHelp size={13} /> Las 7 maletas vienen de <em>The Brain Audit</em> (Sean D&apos;Souza): mientras una duda siga «dando vueltas en la cinta», el cliente no compra. Cada anuncio debería bajar al menos una.</p>

      {sel && <Detalle key={`${f}:${JSON.stringify(sel)}`} sel={sel} foco={f} datos={datos} nombre={v.nombre} cerrar={() => setSel(null)} guardar={guardar} />}
    </section>
  );
}

/* Sección desglosable: texto, lista y/o tabla. */
function BloqueVista({ b, abierto }: { b: Bloque; abierto?: boolean }) {
  return (
    <details className="st-bm-block" open={abierto}>
      <summary>
        <span className={`st-bm-block-ico st-bm-ico-${b.icono}`}>{ICONOS[b.icono]}</span>
        <strong>{b.titulo}</strong>
        <ChevronDown size={16} className="st-bm-block-chev" />
      </summary>
      <div className="st-bm-block-body">
        {b.texto && <p>{b.texto}</p>}
        {b.items.length > 0 && <ul>{b.items.map((x, i) => <li key={i}>{x}</li>)}</ul>}
        {b.tabla && (
          <div className="st-bm-table-wrap">
            <table className="st-bm-table">
              <thead><tr>{b.tabla.columnas.map((c, i) => <th key={i}>{c}</th>)}</tr></thead>
              <tbody>{b.tabla.filas.map((fila, i) => <tr key={i}>{fila.map((c, j) => j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>)}</tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </details>
  );
}

function Detalle({ sel, foco, datos, nombre, cerrar, guardar }: { sel: Sel; foco: number; datos: Datos; nombre: string; cerrar: () => void; guardar: (m: MapaMarca) => Promise<boolean> }) {
  const m = datos.mapa;
  const v = vista(m, foco, nombre);
  const info = sel.tipo === "centro"
    ? { titulo: nombre, pregunta: v.principal ? "La frase que resume la marca en una línea." : "El concepto que guía a esta marca.", icono: <Sparkles size={16} /> }
    : sel.tipo === "rama"
      ? { ...RAMAS.find((r) => r.id === sel.id)!, icono: sel.id === "posicionamiento" ? <Compass size={16} /> : <Gem size={16} /> }
      : { ...MALETAS.find((x) => x.id === sel.id)!, icono: <Luggage size={16} /> };
  const nodo: Nodo | null = sel.tipo === "rama" ? v.ramas[sel.id] : sel.tipo === "maleta" ? v.maletas[sel.id] : null;
  const [editando, setEditando] = useState(false);
  const [frase, setFrase] = useState(v.lema);
  const [estado, setEstado] = useState(m.estado);
  const [resumen, setResumen] = useState(nodo?.resumen ?? "");
  const [puntos, setPuntos] = useState((nodo?.puntos ?? []).join("\n"));
  const [propuesta, setPropuesta] = useState(nodo?.propuesta ?? false);
  const [ocupado, setOcupado] = useState(false);

  const enviar = async () => {
    const copia: MapaMarca = structuredClone(m ?? mapaVacio());
    const destino = foco >= 0 ? copia.submarcas[foco] : copia;
    if (sel.tipo === "centro") {
      if (foco >= 0) copia.submarcas[foco].concepto = frase.trim();
      else { copia.frase = frase.trim(); copia.estado = estado; }
    } else {
      const n = { resumen: resumen.trim(), puntos: puntos.split("\n").map((x) => x.replace(/^[-•·]\s*/, "").trim()).filter(Boolean).slice(0, 12), propuesta };
      if (sel.tipo === "rama") destino.ramas[sel.id] = n; else destino.maletas[sel.id] = n;
    }
    setOcupado(true);
    const ok = await guardar(copia);
    setOcupado(false);
    if (ok) setEditando(false);
  };

  return (
    <Modal title={sel.tipo === "centro" ? info.titulo : `${info.titulo} · ${nombre}`} close={cerrar}>
      <div className="st-bm-detail">
        <p className="st-bm-q">{info.icono} {info.pregunta}</p>
        {!editando ? (
          <>
            {sel.tipo === "centro" ? (
              <p className="st-bm-big">{v.lema || "Aún no hay una frase para esta marca."}</p>
            ) : nodo && !nodoVacio(nodo) ? (
              <>
                {nodo.propuesta && <p className="st-bm-warnbox">Propuesta de la agencia: falta validarla con el cliente.</p>}
                {nodo.resumen && <p className="st-bm-big">{nodo.resumen}</p>}
                {nodo.puntos.length > 0 && <ul className="st-bm-points">{nodo.puntos.map((x, i) => <li key={i}>{x}</li>)}</ul>}
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
                <label>{v.principal ? "Frase de la marca" : "Concepto de la marca"}<textarea rows={2} maxLength={200} value={frase} onChange={(e) => setFrase(e.target.value)} /></label>
                {v.principal && (
                  <label>Estado del mapa
                    <select value={estado} onChange={(e) => setEstado(e.target.value as MapaMarca["estado"])}>
                      <option value="borrador">Borrador</option>
                      <option value="validado">Validado con el cliente</option>
                    </select>
                  </label>
                )}
              </>
            ) : (
              <>
                <label>Resumen (1–2 frases)<textarea rows={4} maxLength={700} value={resumen} onChange={(e) => setResumen(e.target.value)} /></label>
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
