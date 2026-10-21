"use client";
/* «Cómo trabajamos»: las 6 fases de una web recorridas con un proyecto real
   de Distinto (Pedro 21-oct-2026). Brief y mapa salen del proyecto; baja y
   media se dibujan con la estructura real de la página publicada; alta y
   lanzamiento muestran la web real (capturas del 21-oct-2026). */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { NIVELES } from "@/lib/presentacion/niveles";
import { LANZAMIENTO, PROYECTOS, type NodoMapa, type Proyecto, type Seccion } from "@/lib/presentacion/proyectos";

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
  const reducir = useReducedMotion();
  const f = FASES[i];
  const p = PROYECTOS.find((x) => x.id === pid) ?? PROYECTOS[0];
  return (
    <div className="pr-proceso">
      <div className="pr-proc-top">
        <h2>Cómo construimos tu web</h2>
        <div className="pr-proyectos" role="radiogroup" aria-label="Proyecto de ejemplo">
          <span>Proyecto real:</span>
          {PROYECTOS.map((x) => (
            <button key={x.id} type="button" role="radio" aria-checked={x.id === p.id} title={`${x.tipo} · ${NIVELES[x.nivel].nombre}`}
              className={x.id === p.id ? "pr-proy pr-proy-on" : "pr-proy"} onClick={() => setPid(x.id)}>{x.nombre.split(" · ")[0]}</button>
          ))}
        </div>
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
      <div className="pr-fase-cab">
        <p><strong>{f.titulo}.</strong> {f.texto}</p>
        {f.correccion && <span className="pr-ronda">{f.correccion}</span>}
      </div>
      <div className="pr-lienzo">
        <AnimatePresence mode="wait">
          <motion.div key={`${p.id}-${f.id}`} className={`pr-esquema pr-esq-${f.id}`}
            initial={reducir ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={reducir ? undefined : { opacity: 0 }} transition={{ duration: 0.22 }}>
            <Esquema fase={f.id} p={p} />
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function Decisiones({ titulo, items }: { titulo: string; items: string[] }) {
  return (
    <aside className="pr-decide">
      <h4>{titulo}</h4>
      <ol>{items.map((x) => <li key={x}>{x}</li>)}</ol>
    </aside>
  );
}

function Esquema({ fase, p }: { fase: Fase; p: Proyecto }) {
  if (fase === "brief") return <BriefDoc p={p} />;
  if (fase === "mapa") {
    return (
      <div className="pr-mapa">
        <div className="pr-mapa-cab">
          <b>Mapa del sitio · {p.nombre}</b>
          <span>{contarPaginas(p.mapa)} páginas · {p.plataforma}</span>
        </div>
        <Mapa raiz={p.mapa} />
        <div className="pr-recorrido" aria-label="Recorrido principal del visitante">
          <small>Recorrido principal</small>
          <ol>{p.recorrido.map((x) => <li key={x}>{x}</li>)}</ol>
        </div>
      </div>
    );
  }
  if (fase === "baja" || fase === "media") {
    return (
      <div className="pr-con-lado">
        <div className={`pr-w pr-w-${fase}`} tabIndex={0} aria-label={`Página de ${p.nombre} en ${fase} fidelidad, se puede desplazar`}>
          {p.secciones.map((s, k) => <Bloque key={k} s={s} baja={fase === "baja"} />)}
        </div>
        <Decisiones titulo={fase === "baja" ? "Decidimos la estructura" : "Decidimos el contenido"} items={p.decisiones[fase]} />
      </div>
    );
  }
  if (fase === "alta") {
    return (
      <div className="pr-con-lado">
        <div className="pr-dos">
          <Captura src={p.capturas.escritorio} alt={`${p.nombre} en escritorio`} />
          <Captura src={p.capturas.celular} alt={`${p.nombre} en celular`} celular />
        </div>
        <aside className="pr-decide">
          <h4>Decidimos el diseño</h4>
          <ol>{p.decisiones.alta.map((x) => <li key={x}>{x}</li>)}</ol>
          <div className="pr-paleta">{p.brief.identidad.colores.map((c) => <i key={c.hex} style={{ background: c.hex }} title={`${c.hex} · ${c.uso}`} />)}</div>
          <p className="pr-tipos">{p.brief.identidad.tipografias.map((t) => t.nombre).join(" + ")}</p>
        </aside>
      </div>
    );
  }
  return (
    <div className="pr-con-lado">
      <div className="pr-real">
        <div className="pr-navegador"><i /><i /><i /><span>{p.dominio}</span><em>En línea</em></div>
        <div className="pr-real-scroll" tabIndex={0} aria-label={`${p.nombre} publicada, se puede desplazar`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={p.capturas.escritorio} alt={`${p.nombre} publicada`} />
        </div>
      </div>
      <aside className="pr-decide pr-lanza">
        <h4>Antes de publicar revisamos</h4>
        {LANZAMIENTO.map((g) => (
          <div key={g.grupo}><b>{g.grupo}</b><ul>{g.items.map((x) => <li key={x}>{x}</li>)}</ul></div>
        ))}
        <a className="pr-ver-sitio" href={`https://${p.dominio}`} target="_blank" rel="noopener noreferrer">Abrir {p.dominio}</a>
      </aside>
    </div>
  );
}

function Captura({ src, alt, celular }: { src: string; alt: string; celular?: boolean }) {
  return (
    <div className={`pr-real ${celular ? "pr-real-cel" : ""}`}>
      <div className="pr-real-scroll" tabIndex={0} aria-label={`${alt}, se puede desplazar`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} />
      </div>
    </div>
  );
}

const contarPaginas = (n: NodoMapa): number => 1 + (n.hijos ?? []).reduce((a, h) => a + contarPaginas(h), 0);

/* El brief como documento: lo que entregamos antes de diseñar. */
function BriefDoc({ p }: { p: Proyecto }) {
  const b = p.brief;
  return (
    <article className="pr-brief" tabIndex={0} aria-label={`Brief de ${p.nombre}, se puede desplazar`}>
      <header className="pr-brief-cab">
        <div><small>Brief del proyecto</small><h3>{p.nombre}</h3></div>
        <dl>
          <div><dt>Tipo</dt><dd>{p.tipo}</dd></div>
          <div><dt>Nivel</dt><dd>{NIVELES[p.nivel].nombre}</dd></div>
          <div><dt>Plataforma</dt><dd>{p.plataforma}</dd></div>
          <div><dt>Dominio</dt><dd>{p.dominio}</dd></div>
        </dl>
      </header>

      <section className="pr-b-dos">
        <div><h4>El negocio</h4><p>{b.negocio}</p></div>
        <div><h4>Objetivos de la web</h4><ol className="pr-b-num">{b.objetivos.map((x) => <li key={x}>{x}</li>)}</ol></div>
      </section>

      <section>
        <h4>A quién le hablamos</h4>
        <div className="pr-b-personas">
          {b.publico.map((x) => (
            <div key={x.perfil}><strong>{x.perfil}</strong><p><span>Busca</span>{x.busca}</p><p><span>Su duda</span>{x.duda}</p></div>
          ))}
        </div>
      </section>

      <section className="pr-b-dos">
        <div><h4>Lo que nos diferencia</h4><ul className="pr-b-check">{b.diferenciales.map((x) => <li key={x}>{x}</li>)}</ul></div>
        <div>
          <h4>Investigación</h4>
          <p className="pr-b-sub">Cómo los buscan en Google</p>
          <div className="pr-b-chips">{b.investigacion.busquedas.map((x) => <span key={x}>{x}</span>)}</div>
          <p className="pr-b-sub">Lo que encontramos</p>
          <ul className="pr-b-lista">{b.investigacion.hallazgos.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </section>

      <section>
        <h4>Referencias del rubro</h4>
        <div className="pr-b-refs">
          {b.referencias.map((r) => (
            <a key={r.dominio} href={`https://${r.dominio}`} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={r.img} alt={`Portada de ${r.nombre}`} loading="lazy" />
              <strong>{r.nombre}</strong><span>{r.tomamos}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="pr-b-dos">
        <div>
          <h4>Identidad</h4>
          <div className="pr-b-colores">{b.identidad.colores.map((c) => <div key={c.hex}><i style={{ background: c.hex }} /><b>{c.hex}</b><span>{c.uso}</span></div>)}</div>
          <div className="pr-b-tipos">{b.identidad.tipografias.map((t) => <div key={t.nombre}><b>{t.nombre}</b><span>{t.uso}</span></div>)}</div>
        </div>
        <div>
          <h4>Tono de voz</h4>
          <p>{b.identidad.tono}</p>
          <p className="pr-b-sub">Palabras que usamos</p>
          <div className="pr-b-chips pr-b-si">{b.identidad.si.map((x) => <span key={x}>{x}</span>)}</div>
          <p className="pr-b-sub">Lo que evitamos</p>
          <div className="pr-b-chips pr-b-no">{b.identidad.no.map((x) => <span key={x}>{x}</span>)}</div>
        </div>
      </section>

      <section className="pr-b-dos">
        <div>
          <h4>Contenidos y quién los entrega</h4>
          <table className="pr-b-tabla"><tbody>{b.contenidos.map((c) => <tr key={c.item}><td>{c.item}</td><td><span className={`pr-b-q pr-b-q-${c.quien}`}>{c.quien}</span></td></tr>)}</tbody></table>
        </div>
        <div>
          <h4>Funciones</h4>
          <ul className="pr-b-check">{b.funciones.map((x) => <li key={x}>{x}</li>)}</ul>
          <h4>Cómo medimos el éxito</h4>
          <ul className="pr-b-lista">{b.exito.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </section>

      <footer className="pr-brief-pie"><b>Aprobaciones:</b> {b.aprobacion}<small>Ejemplo reconstruido a partir de la web publicada.</small></footer>
    </article>
  );
}

function Mapa({ raiz }: { raiz: NodoMapa }) {
  const ramas = raiz.hijos ?? [];
  return (
    <div className="pr-arbol">
      <div className="pr-nodo pr-raiz">{raiz.nombre}{raiz.cta && <small>{raiz.cta}</small>}</div>
      <div className="pr-ramas" style={{ gridTemplateColumns: `repeat(${ramas.length}, minmax(0, 1fr))` }}>
        {ramas.map((r) => (
          <div key={r.nombre} className="pr-rama">
            <div className="pr-nodo">{r.nombre}{r.cta && <small>{r.cta}</small>}</div>
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
