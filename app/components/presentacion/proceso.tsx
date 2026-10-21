"use client";
/* «Cómo trabajamos»: las 6 fases de una web recorridas con un proyecto real
   de Distinto (Pedro 21-oct-2026). Brief y mapa salen del proyecto; baja y
   media se dibujan con la estructura real de la página publicada; alta y
   lanzamiento muestran la web real (capturas del 21-oct-2026). */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { NIVELES } from "@/lib/presentacion/niveles";
import { PROYECTOS, type NodoMapa, type Proyecto, type Seccion } from "@/lib/presentacion/proyectos";

const FASES = [
  { id: "brief", titulo: "Brief", texto: "Una reunión y un documento donde dejamos claro qué quieres lograr, a quién le hablas, qué tono tiene tu marca y qué debe hacer tu web.", correccion: "Lo revisas y ajustamos antes de diseñar." },
  { id: "mapa", titulo: "Mapa del sitio", texto: "Ordenamos las páginas y el recorrido del visitante: qué ve primero, a dónde va después y dónde toma acción.", correccion: "Una ronda para mover, sumar o quitar páginas." },
  { id: "baja", titulo: "Baja fidelidad", texto: "Cajas y líneas: solo la distribución de cada sección. Así decidimos el orden sin distraernos con colores.", correccion: "Una ronda de correcciones de estructura." },
  { id: "media", titulo: "Media fidelidad", texto: "La misma distribución con los textos reales y la jerarquía definida, todavía en grises.", correccion: "Una ronda de correcciones de contenido." },
  { id: "alta", titulo: "Alta fidelidad", texto: "El diseño final con la marca: colores, tipografías, fotos y detalles, en escritorio y celular.", correccion: "Una ronda de correcciones de diseño." },
  { id: "lanzamiento", titulo: "Lanzamiento", texto: "Desarrollamos, probamos formularios, pagos y celular, y publicamos. Después medimos y priorizamos mejoras.", correccion: "" },
] as const;
type Fase = (typeof FASES)[number]["id"];

export function Proceso() {
  const [i, setI] = useState(0);
  const [pid, setPid] = useState(PROYECTOS[0].id);
  const [celular, setCelular] = useState(false);
  const reducir = useReducedMotion();
  const f = FASES[i];
  const p = PROYECTOS.find((x) => x.id === pid) ?? PROYECTOS[0];
  return (
    <div className="pr-proceso">
      <h2>Cómo construimos tu web</h2>
      <div className="pr-proyectos" role="radiogroup" aria-label="Proyecto de ejemplo">
        <span>Míralo con un proyecto real:</span>
        {PROYECTOS.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={x.id === p.id} className={x.id === p.id ? "pr-proy pr-proy-on" : "pr-proy"} onClick={() => setPid(x.id)}>
            <strong>{x.nombre}</strong><small>{x.tipo} · {NIVELES[x.nivel].nombre}</small>
          </button>
        ))}
      </div>
      <ol className="pr-fases">
        {FASES.map((x, j) => (
          <li key={x.id}>
            <button type="button" className={j === i ? "pr-on" : j < i ? "pr-hecha" : ""} aria-current={j === i ? "step" : undefined} onClick={() => setI(j)}>
              <span>{j + 1}</span>{x.titulo}
            </button>
          </li>
        ))}
      </ol>
      <div className="pr-fase">
        <div className="pr-fase-texto">
          <h3>{f.titulo}</h3>
          <p>{f.texto}</p>
          {f.correccion && <p className="pr-ronda">{f.correccion}</p>}
          {(f.id === "alta" || f.id === "lanzamiento") && (
            <div className="pr-disp" role="radiogroup" aria-label="Dispositivo">
              {([["Escritorio", false], ["Celular", true]] as const).map(([t, v]) => (
                <button key={t} type="button" role="radio" aria-checked={celular === v} className={celular === v ? "pr-chip pr-chip-on" : "pr-chip"} onClick={() => setCelular(v)}>{t}</button>
              ))}
            </div>
          )}
          {f.id === "lanzamiento" && <a className="pr-ver-sitio" href={`https://${p.dominio}`} target="_blank" rel="noopener noreferrer">Abrir {p.dominio}</a>}
        </div>
        <div className="pr-lienzo">
          <AnimatePresence mode="wait">
            <motion.div key={`${p.id}-${f.id}-${celular}`} className={`pr-esquema pr-esq-${f.id}`}
              initial={reducir ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={reducir ? undefined : { opacity: 0 }} transition={{ duration: 0.25 }}>
              <Esquema fase={f.id} p={p} celular={celular} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Esquema({ fase, p, celular }: { fase: Fase; p: Proyecto; celular: boolean }) {
  if (fase === "brief") {
    return (
      <div className="pr-doc">
        <b>Brief · {p.nombre}</b>
        {p.brief.map((x) => <div key={x.campo} className="pr-doc-fila"><span>{x.campo}</span><p>{x.valor}</p></div>)}
      </div>
    );
  }
  if (fase === "mapa") return <Mapa raiz={p.mapa} />;
  if (fase === "baja" || fase === "media") {
    return (
      <div className={`pr-w pr-w-${fase}`} tabIndex={0} aria-label={`Página de ${p.nombre} en ${fase} fidelidad, se puede desplazar`}>
        {p.secciones.map((s, k) => <Bloque key={k} s={s} baja={fase === "baja"} />)}
      </div>
    );
  }
  const src = celular ? p.capturas.celular : p.capturas.escritorio;
  return (
    <div className={`pr-real ${celular ? "pr-real-cel" : ""}`}>
      {fase === "lanzamiento" && <div className="pr-navegador"><i /><i /><i /><span>{p.dominio}</span><em>En línea</em></div>}
      <div className="pr-real-scroll" tabIndex={0} aria-label={`Diseño final de ${p.nombre}, se puede desplazar`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={`${p.nombre} en ${celular ? "celular" : "escritorio"}`} />
      </div>
    </div>
  );
}

function Mapa({ raiz }: { raiz: NodoMapa }) {
  const ramas = raiz.hijos ?? [];
  return (
    <div className="pr-arbol">
      <div className="pr-nodo pr-raiz">{raiz.nombre}</div>
      <div className="pr-ramas" style={{ gridTemplateColumns: `repeat(${ramas.length}, minmax(0, 1fr))` }}>
        {ramas.map((r) => (
          <div key={r.nombre} className="pr-rama">
            <div className="pr-nodo">{r.nombre}</div>
            {r.hijos && <div className="pr-hijos">{r.hijos.map((h) => <div key={h.nombre} className="pr-nodo pr-hijo">{h.nombre}</div>)}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* Texto real (media) o línea gris (baja). */
function T({ t, c, b }: { t: string; c?: string; b: boolean }) {
  return b ? <i className={`pr-w-l ${c ?? ""}`} /> : <span className={c}>{t}</span>;
}
function Btn({ t, baja, chico }: { t?: string; baja: boolean; chico?: boolean }) {
  return t ? <em className={`pr-w-btn ${chico ? "pr-w-btn-s" : ""}`}>{baja ? "" : t}</em> : null;
}
const Img = ({ c }: { c?: string }) => <div className={`pr-w-img ${c ?? ""}`} />;

/* Un bloque del wireframe. En baja: cajas, líneas y el nombre de la sección.
   En media: la misma caja con los textos reales en grises. */
function Bloque({ s, baja }: { s: Seccion; baja: boolean }) {
  const b = baja;
  let contenido: React.ReactNode;
  switch (s.tipo) {
    case "aviso": contenido = <div className="pr-w-aviso"><T b={b} t={s.texto} c="pr-w-xs" /></div>; break;
    case "menu": contenido = (
      <div className="pr-w-menu">
        <b>{b ? "" : s.logo}</b>
        <div className="pr-w-links">{s.links.map((l) => <T key={l} b={b} t={l} c="pr-w-xs" />)}</div>
        {s.acciones?.map((a) => <Btn key={a} baja={b} t={a} chico />)}
      </div>
    ); break;
    case "hero": contenido = (
      <div className={`pr-w-hero ${s.centro ? "pr-w-centro" : ""} ${s.imagen === "fondo" ? "pr-w-fondo" : ""} ${s.imagen === "lado" ? "pr-w-lado" : ""}`}>
        {s.imagen === "fondo" && <Img c="pr-w-img-fondo" />}
        <div className="pr-w-hero-txt">
          <T b={b} t={s.titulo} c="pr-w-h1" />
          {s.texto && <T b={b} t={s.texto} c="pr-w-p" />}
          <Btn baja={b} t={s.boton} />
        </div>
        {s.imagen === "lado" && <Img />}
      </div>
    ); break;
    case "split": contenido = (
      <div className="pr-w-split">
        <div>{s.etiqueta && <T b={b} t={s.etiqueta} c="pr-w-xs pr-w-eti" />}<T b={b} t={s.titulo} c="pr-w-h2" /><T b={b} t={s.texto} c="pr-w-p" /><Btn baja={b} t={s.boton} /></div>
        <Img />
      </div>
    ); break;
    case "tarjetas": contenido = (
      <div className="pr-w-sec">
        {s.etiqueta && <T b={b} t={s.etiqueta} c="pr-w-xs pr-w-eti" />}<T b={b} t={s.titulo} c="pr-w-h2" />
        <div className="pr-w-grid" style={{ gridTemplateColumns: `repeat(${Math.min(s.items.length, 3)}, 1fr)` }}>
          {s.items.map((x) => <div key={x}><Img /><T b={b} t={x} c="pr-w-xs pr-w-fuerte" /></div>)}
        </div>
      </div>
    ); break;
    case "motivos": contenido = (
      <div className="pr-w-motivos">
        <div><T b={b} t={s.titulo} c="pr-w-h2" /></div>
        <div className="pr-w-pila">{s.items.map((x) => <div key={x.titulo}><T b={b} t={x.titulo} c="pr-w-xs pr-w-fuerte" /><T b={b} t={x.texto} c="pr-w-xs" /></div>)}</div>
      </div>
    ); break;
    case "logos": contenido = (
      <div className="pr-w-sec pr-w-centro"><T b={b} t={s.titulo} c="pr-w-h2" /><div className="pr-w-logos">{Array.from({ length: s.cantidad }, (_, k) => <i key={k} />)}</div></div>
    ); break;
    case "testimonios": contenido = (
      <div className="pr-w-sec pr-w-centro"><T b={b} t={s.titulo} c="pr-w-h2" />
        <div className="pr-w-grid" style={{ gridTemplateColumns: `repeat(${s.cantidad}, 1fr)` }}>
          {Array.from({ length: s.cantidad }, (_, k) => <div key={k} className="pr-w-cita"><i className="pr-w-avatar" /><i className="pr-w-l" /><i className="pr-w-l pr-w-corta" /></div>)}
        </div>
      </div>
    ); break;
    case "faq": contenido = (
      <div className="pr-w-sec"><T b={b} t={s.titulo} c="pr-w-h2" /><div className="pr-w-faq">{s.items.map((x) => <div key={x}><T b={b} t={x} c="pr-w-xs" /><b>+</b></div>)}</div></div>
    ); break;
    case "contacto": contenido = (
      <div className="pr-w-split pr-w-contacto">
        <div><T b={b} t={s.titulo} c="pr-w-h2" /></div>
        <div className="pr-w-form">{s.campos.map((c) => <div key={c}><T b={b} t={c} c="pr-w-xs" /></div>)}<Btn baja={b} t="Enviar" /></div>
      </div>
    ); break;
    case "mosaico": contenido = (
      <div className="pr-w-sec pr-w-centro"><T b={b} t={s.titulo} c="pr-w-h2" />{s.texto && <T b={b} t={s.texto} c="pr-w-p" />}
        <div className="pr-w-mosaico">{s.items.map((x, k) => <div key={k} className={k % 3 === 1 ? "pr-w-larga" : ""}><T b={b} t={`${x.linea} · ${x.nombre}`} c="pr-w-xs pr-w-fuerte" /></div>)}</div>
      </div>
    ); break;
    case "productos": contenido = (
      <div className="pr-w-sec pr-w-centro"><T b={b} t={s.titulo} c="pr-w-h2" />
        <div className="pr-w-grid" style={{ gridTemplateColumns: `repeat(${s.items.length}, 1fr)` }}>
          {s.items.map((x) => (
            <div key={x.nombre} className="pr-w-prod"><Img /><T b={b} t={x.nombre} c="pr-w-xs pr-w-fuerte" />
              {b ? <i className="pr-w-l pr-w-corta" /> : <span className="pr-w-xs"><b>{x.precio}</b> {x.antes && <s>{x.antes}</s>}</span>}
              <Btn baja={b} t="Ver producto" chico />
            </div>
          ))}
        </div>
      </div>
    ); break;
    case "categorias": contenido = (
      <div className="pr-w-sec"><T b={b} t={s.titulo} c="pr-w-h2" />
        <div className="pr-w-cats" style={{ gridTemplateColumns: `repeat(${s.items.length}, 1fr)` }}>{s.items.map((x) => <div key={x}><Img /><T b={b} t={x} c="pr-w-xs pr-w-fuerte" /></div>)}</div>
      </div>
    ); break;
    case "pie": contenido = <div className="pr-w-pie" style={{ gridTemplateColumns: `repeat(${s.columnas.length}, 1fr)` }}>{s.columnas.map((c) => <div key={c}><T b={b} t={c} c="pr-w-xs pr-w-fuerte" /><i className="pr-w-l pr-w-corta" /><i className="pr-w-l pr-w-corta" /></div>)}</div>; break;
  }
  return (
    <section className={`pr-w-bloque pr-w-t-${s.tipo} ${s.tipo === "menu" && s.oscuro ? "pr-w-oscuro" : ""}`}>
      {b && <span className="pr-w-nombre">{s.nombre}</span>}
      {contenido}
    </section>
  );
}
