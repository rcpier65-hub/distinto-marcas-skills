"use client";
/* Presentación de Social Media (Pedro 21-oct-2026): mostrar el trabajo real
   y cómo lo hacemos por dentro. Videos del portafolio de distintostudio.com
   y datos reales del sistema: posicionamiento, grilla del mes, guiones,
   grabaciones, flujo de diseño y edición, publicación y resultados. */
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { MARCAS_PORTAFOLIO, MEDIOS, PRODUCCIONES, portada, reproductorTikTok } from "@/lib/presentacion/portafolio";
import { PROCESO_SOCIAL, REUNIONES_SOCIAL } from "@/lib/presentacion/servicios";
import { CasoReal, ProcesoVista, ReunionesVista } from "./servicios-ui";

const CAPITULOS = [
  { id: "trabajo", titulo: "Nuestro trabajo" },
  { id: "posicionamiento", titulo: "Posicionamiento" },
  { id: "planificacion", titulo: "Planificación" },
  { id: "guiones", titulo: "Guiones" },
  { id: "grabacion", titulo: "Grabación" },
  { id: "produccion", titulo: "Diseño y edición" },
  { id: "publicacion", titulo: "Aprobación y publicación" },
  { id: "resultados", titulo: "Resultados" },
  { id: "proceso", titulo: "El proceso completo" },
  { id: "reuniones", titulo: "Las reuniones" },
] as const;
type Capitulo = (typeof CAPITULOS)[number]["id"];

type Trabajo = {
  marca: { nombre: string; slug: string };
  total: number; publicadas: number; conGuion: number;
  ritmo: { mes: string; total: number; publicadas: number }[];
  mesGrilla: string | null;
  grilla: { dia: number; nombre: string; etapa: string | null; formato: string }[];
  flujo: { id: string; nombre: string; piezas: number }[];
  guiones: { titulo: string; filas: { n: string; dialogo: string; plano: string }[] }[];
  grabaciones: { fecha: string; estado: string; videos: number | null; minutos: number | null }[];
};

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const nombreMes = (m: string) => `${MESES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`;
const ETAPA_COLOR: Record<string, string> = { idea: "#f3ebfb", aprobacion: "#fff4c7", diseno: "#e7f0ff", edicion: "#ffe9dc", programado: "#e8f6ee", publicado: "#0f0b16" };

export function ShowcaseSocial() {
  const [cap, setCap] = useState<Capitulo>("trabajo");
  const [slug, setSlug] = useState("la-victoria");
  const [marcas, setMarcas] = useState<{ slug: string; nombre: string; publicaciones: number }[]>([]);
  const [datos, setDatos] = useState<Record<string, Trabajo | "error" | undefined>>({});
  const reducir = useReducedMotion();
  const usaMarca = ["planificacion", "guiones", "grabacion", "produccion"].includes(cap);

  useEffect(() => {
    let vivo = true;
    fetch("/api/presentaciones/trabajo", { cache: "no-store" }).then((r) => r.json()).then((j) => vivo && setMarcas(j.marcas ?? [])).catch(() => {});
    return () => { vivo = false; };
  }, []);
  useEffect(() => {
    if (!usaMarca || datos[slug]) return;
    let vivo = true;
    fetch(`/api/presentaciones/trabajo?marca=${encodeURIComponent(slug)}`, { cache: "no-store" })
      .then(async (r) => { const j = await r.json(); if (vivo) setDatos((d) => ({ ...d, [slug]: r.ok ? j : "error" })); })
      .catch(() => vivo && setDatos((d) => ({ ...d, [slug]: "error" })));
    return () => { vivo = false; };
  }, [slug, usaMarca, datos]);
  const t = datos[slug];

  return (
    <div className="pr-sc">
      <nav className="pr-sc-nav" aria-label="Capítulos">
        <h2>Así trabajamos tus redes</h2>
        <ol>
          {CAPITULOS.map((c, i) => (
            <li key={c.id}><button type="button" aria-current={cap === c.id ? "step" : undefined} className={cap === c.id ? "pr-sc-on" : ""} onClick={() => setCap(c.id)}><span>{i + 1}</span>{c.titulo}</button></li>
          ))}
        </ol>
      </nav>
      <div className="pr-sc-cuerpo">
        {usaMarca && marcas.length > 0 && (
          <div className="pr-sc-marcas" role="radiogroup" aria-label="Marca de ejemplo">
            <span>Marca real:</span>
            {marcas.slice(0, 10).map((m) => (
              <button key={m.slug} type="button" role="radio" aria-checked={slug === m.slug} className={slug === m.slug ? "pr-proy pr-proy-on" : "pr-proy"} onClick={() => setSlug(m.slug)}>{m.nombre.replace(/ (Marketing|ABA)$/, "")}</button>
            ))}
          </div>
        )}
        <AnimatePresence mode="wait">
          <motion.section key={cap + (usaMarca ? slug : "")} className="pr-sc-cap" initial={reducir ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reducir ? undefined : { opacity: 0 }} transition={{ duration: 0.22 }}>
            {cap === "trabajo" && <Portafolio />}
            {cap === "posicionamiento" && <Posicionamiento />}
            {usaMarca && !t && <p className="pr-quiet">Cargando datos reales…</p>}
            {usaMarca && t === "error" && <p className="pr-aviso">No se pudieron cargar los datos de esta marca.</p>}
            {cap === "planificacion" && t && t !== "error" && <Planificacion t={t} />}
            {cap === "guiones" && t && t !== "error" && <Guiones t={t} />}
            {cap === "grabacion" && t && t !== "error" && <Grabacion t={t} />}
            {cap === "produccion" && t && t !== "error" && <Produccion t={t} />}
            {cap === "publicacion" && <Publicacion />}
            {cap === "resultados" && <CasoReal servicio="social" />}
            {cap === "proceso" && <ProcesoVista fases={PROCESO_SOCIAL} />}
            {cap === "reuniones" && <ReunionesVista reuniones={REUNIONES_SOCIAL} />}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ---------- 1. Portafolio ---------- */
function Portafolio() {
  const [filtro, setFiltro] = useState<string>("todas");
  const [abierto, setAbierto] = useState<{ tipo: "tiktok" | "video"; src: string; marca: string; poster?: string } | null>(null);
  const videos = useMemo(() => (filtro === "todas" ? MARCAS_PORTAFOLIO.flatMap((m) => m.videos.slice(0, 2).map((v) => ({ v, m }))) : MARCAS_PORTAFOLIO.filter((m) => m.nombre === filtro).flatMap((m) => m.videos.map((v) => ({ v, m })))), [filtro]);
  useEffect(() => {
    if (!abierto) return;
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopImmediatePropagation(); setAbierto(null); } };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [abierto]);
  return (
    <div>
      <header className="pr-sc-cab">
        <h3>Contenido que hicimos para marcas reales</h3>
        <p>Guiones, grabación, edición y publicación hechos por nuestro equipo. Toca un video para verlo.</p>
      </header>
      <div className="pr-sc-filtros" role="radiogroup" aria-label="Filtrar por marca">
        {["todas", ...MARCAS_PORTAFOLIO.map((m) => m.nombre)].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={filtro === n} className={filtro === n ? "pr-chip pr-chip-on" : "pr-chip"} onClick={() => setFiltro(n)}>{n === "todas" ? "Todas" : n}</button>
        ))}
      </div>
      <div className="pr-sc-videos">
        {videos.map(({ v, m }) => (
          <button key={v} type="button" className="pr-sc-video" onClick={() => setAbierto({ tipo: "tiktok", src: reproductorTikTok(v), marca: m.nombre })} aria-label={`Ver video de ${m.nombre}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={portada(v)} alt="" loading="lazy" />
            <span><b>{m.nombre}</b><small>{m.rubro}</small></span>
          </button>
        ))}
      </div>
      {filtro === "todas" && (
        <>
          <h4 className="pr-sc-sub">Producciones de Distinto</h4>
          <div className="pr-sc-videos pr-sc-videos-chicos">
            {PRODUCCIONES.map((p) => (
              <button key={p.n} type="button" className="pr-sc-video" onClick={() => setAbierto({ tipo: "video", src: p.video, marca: p.titulo, poster: p.portada })} aria-label={`Ver ${p.titulo}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.portada} alt="" loading="lazy" />
                <span><b>{p.titulo}</b></span>
              </button>
            ))}
          </div>
        </>
      )}
      {abierto && (
        <div className="pr-sc-modal" role="dialog" aria-modal="true" aria-label={`Video de ${abierto.marca}`} onClick={() => setAbierto(null)}>
          <div className="pr-sc-reproductor" onClick={(e) => e.stopPropagation()}>
            {abierto.tipo === "tiktok"
              ? <iframe src={abierto.src} title={`Video de ${abierto.marca}`} allow="autoplay; fullscreen; encrypted-media" />
              : <video src={abierto.src} poster={abierto.poster} controls autoPlay playsInline />}
            <div className="pr-sc-rep-pie"><b>{abierto.marca}</b><button type="button" className="pr-btn pr-btn-ghost" onClick={() => setAbierto(null)}>Cerrar</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- 2. Posicionamiento ---------- */
function Posicionamiento() {
  const [m, setM] = useState<{ frase: string; idea: string; posicionamiento: string; puntos: string[] } | null | undefined>(undefined);
  useEffect(() => {
    let vivo = true;
    fetch("/api/presentaciones/caso?marca=little-joe", { cache: "no-store" }).then((r) => r.json()).then((j) => vivo && setM(j.mapa ?? null)).catch(() => vivo && setM(null));
    return () => { vivo = false; };
  }, []);
  return (
    <div className="pr-sc-dos">
      <div>
        <header className="pr-sc-cab">
          <h3>Antes de grabar, definimos qué decir</h3>
          <p>Cada marca tiene su mapa: propuesta de valor, posicionamiento, a quién le habla y las 7 maletas de la persuasión. De ahí salen los pilares y cada guion.</p>
        </header>
        <ol className="pr-sc-pasos">
          <li><b>Investigamos</b> el negocio, la competencia y cómo busca el cliente.</li>
          <li><b>Definimos</b> la frase de marca, el territorio y el rol emocional.</li>
          <li><b>Lo bajamos a contenido:</b> pilares, series y ángulos de venta.</li>
        </ol>
      </div>
      <div className="pr-sc-mapa">
        <small>Mapa de marca real · Typhouse</small>
        {m === undefined ? <p className="pr-quiet">Cargando…</p> : !m ? <p className="pr-quiet">Sin mapa disponible.</p> : (
          <>
            {m.frase && <p className="pr-sc-frase">«{m.frase}»</p>}
            {m.posicionamiento && <p>{m.posicionamiento}</p>}
            <ul>{m.puntos.map((x) => <li key={x}>{x}</li>)}</ul>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- 3. Planificación ---------- */
function Planificacion({ t }: { t: Trabajo }) {
  const max = Math.max(1, ...t.ritmo.map((r) => r.total));
  const [a, mm] = (t.mesGrilla ?? "2026-01").split("-").map(Number);
  const primer = (new Date(a, mm - 1, 1).getDay() + 6) % 7;
  const dias = new Date(a, mm, 0).getDate();
  const porDia = new Map<number, Trabajo["grilla"]>();
  for (const g of t.grilla) porDia.set(g.dia, [...(porDia.get(g.dia) ?? []), g]);
  return (
    <div className="pr-sc-dos pr-sc-dos-plan">
      <div>
        <header className="pr-sc-cab">
          <h3>La grilla del mes de {t.marca.nombre}</h3>
          <p>Así se ve un mes real en nuestro sistema: cada publicación con su fecha, formato y etapa. El cliente la aprueba antes de producir.</p>
        </header>
        <div className="pr-sc-ritmo" aria-label="Publicaciones planificadas por mes">
          <small>Ritmo de publicaciones planificadas por mes</small>
          <div>{t.ritmo.map((r) => (
            <span key={r.mes} title={`${nombreMes(r.mes)}: ${r.total} planificadas, ${r.publicadas} publicadas`}>
              <i style={{ height: `${(r.total / max) * 100}%` }}><b>{r.total}</b></i><em>{nombreMes(r.mes)}</em>
            </span>
          ))}</div>
        </div>
        <dl className="pr-sc-cifras">
          <div><dt>Publicaciones en el sistema</dt><dd>{t.total}</dd></div>
          <div><dt>Ya publicadas</dt><dd>{t.publicadas}</dd></div>
          <div><dt>Con guion escrito</dt><dd>{t.conGuion}</dd></div>
        </dl>
      </div>
      <div className="pr-sc-cal">
        <b>{t.mesGrilla ? nombreMes(t.mesGrilla) : ""}</b>
        <div className="pr-sc-cal-sem">{["L", "M", "M", "J", "V", "S", "D"].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="pr-sc-cal-dias">
          {Array.from({ length: primer }, (_, i) => <div key={`v${i}`} className="pr-sc-vacio" />)}
          {Array.from({ length: dias }, (_, i) => i + 1).map((d) => (
            <div key={d} className="pr-sc-dia"><small>{d}</small>{(porDia.get(d) ?? []).slice(0, 2).map((g, k) => (
              <span key={k} style={{ background: ETAPA_COLOR[g.etapa ?? "idea"], color: g.etapa === "publicado" ? "#fff" : undefined }} title={`${g.nombre} · ${g.formato}`}>{g.nombre}</span>
            ))}{(porDia.get(d)?.length ?? 0) > 2 && <em>+{porDia.get(d)!.length - 2}</em>}</div>
          ))}
        </div>
        <div className="pr-sc-leyenda">{t.flujo.map((f) => <span key={f.id}><i style={{ background: ETAPA_COLOR[f.id] }} />{f.nombre}</span>)}</div>
      </div>
    </div>
  );
}

/* ---------- 4. Guiones ---------- */
function Guiones({ t }: { t: Trabajo }) {
  const [i, setI] = useState(0);
  if (!t.guiones.length) return <p className="pr-quiet">Esta marca no tiene guiones en formato técnico. Elige La Victoria o Novalamps.</p>;
  const g = t.guiones[Math.min(i, t.guiones.length - 1)];
  return (
    <div>
      <header className="pr-sc-cab">
        <h3>Guiones escritos para grabar</h3>
        <p>Cada video sale con un guion técnico: qué se dice, cómo se graba y con qué plano. Así la jornada de grabación rinde y el editor sabe qué buscar.</p>
      </header>
      <div className="pr-sc-filtros">{t.guiones.map((x, k) => <button key={x.titulo + k} type="button" className={k === i ? "pr-chip pr-chip-on" : "pr-chip"} onClick={() => setI(k)}>{x.titulo}</button>)}</div>
      <div className="pr-sc-guion">
        <div className="pr-sc-guion-cab"><span>N°</span><span>Diálogo</span><span>Plano y referencia visual</span></div>
        {g.filas.map((f) => <div key={f.n} className="pr-sc-guion-fila"><span>{f.n}</span><p>{f.dialogo}</p><p>{f.plano}</p></div>)}
      </div>
      <p className="pr-x-nota">Guion real de {t.marca.nombre}, tal como está en nuestro sistema. {t.conGuion} publicaciones de esta marca tienen guion escrito.</p>
    </div>
  );
}

/* ---------- 5. Grabación ---------- */
function Grabacion({ t }: { t: Trabajo }) {
  return (
    <div className="pr-sc-dos">
      <div>
        <header className="pr-sc-cab">
          <h3>Cómo organizamos las grabaciones</h3>
          <p>Una jornada bien preparada produce el contenido de semanas.</p>
        </header>
        <ol className="pr-sc-pasos">
          <li><b>Agenda:</b> la fecha queda en el calendario compartido y el cliente la ve en su portal.</li>
          <li><b>Guiones y lista de tomas:</b> llegamos con cada video escrito y el orden de grabación.</li>
          <li><b>Jornada:</b> dirección, cámara, luz y audio; grabamos varias piezas por jornada.</li>
          <li><b>Banco de material:</b> todo queda ordenado en Drive para edición y futuras piezas.</li>
        </ol>
        {t.grabaciones.length > 0 && (
          <div className="pr-sc-grabs"><small>Grabaciones de {t.marca.nombre} en el sistema</small>
            <ul>{t.grabaciones.slice(0, 5).map((g, k) => <li key={k}><b>{new Date(`${g.fecha}T12:00:00`).toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" })}</b><span>{({ planeada: "Agendada", cumplida: "Realizada", realizada: "Realizada", cancelada: "Cancelada" } as Record<string, string>)[g.estado] ?? g.estado}{g.videos ? ` · ${g.videos} videos` : ""}{g.minutos ? ` · ${Math.round(g.minutos / 60)} h` : ""}</span></li>)}</ul>
          </div>
        )}
      </div>
      <div className="pr-sc-medio">
        <video src={MEDIOS.grabacion.video} poster={MEDIOS.grabacion.poster} autoPlay muted loop playsInline />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MEDIOS.grabacion.foto} alt="Grabación de contenido de Distinto" loading="lazy" />
      </div>
    </div>
  );
}

/* ---------- 6. Diseño y edición ---------- */
function Produccion({ t }: { t: Trabajo }) {
  const max = Math.max(1, ...t.flujo.map((f) => f.piezas));
  return (
    <div className="pr-sc-dos">
      <div>
        <header className="pr-sc-cab">
          <h3>Cada pieza pasa por un flujo</h3>
          <p>Idea y guion, aprobación, diseño, edición, programación y publicación. Nada sale sin pasar por la etapa anterior.</p>
        </header>
        <div className="pr-sc-flujo">
          {t.flujo.map((f, k) => (
            <div key={f.id}><span>{k + 1}</span><b>{f.nombre}</b><i><em style={{ width: `${(f.piezas / max) * 100}%` }} /></i><small>{f.piezas}</small></div>
          ))}
        </div>
        <p className="pr-x-nota">Piezas de {t.marca.nombre} en cada etapa hoy, según nuestro sistema.</p>
      </div>
      <div className="pr-sc-medio">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={MEDIOS.diseno} alt="Diseño de piezas para marcas de Distinto" loading="lazy" />
        <ul className="pr-sc-reglas"><li>Hasta 2 rondas de ajustes por pieza</li><li>Portadas, subtítulos y música en cada video</li><li>Formatos para Instagram, TikTok y Facebook</li></ul>
      </div>
    </div>
  );
}

/* ---------- 7. Aprobación y publicación ---------- */
const Publicacion = () => (
  <div className="pr-sc-dos">
    <div>
      <header className="pr-sc-cab">
        <h3>Apruebas en tu portal y publicamos</h3>
        <p>Te damos un usuario para ver tu contenido en tiempo real: la grilla, cada video y cada diseño.</p>
      </header>
      <ol className="pr-sc-pasos">
        <li><b>Revisas</b> la pieza con su copy y portada.</li>
        <li><b>Apruebas</b> o pides un ajuste desde el portal.</li>
        <li><b>Programamos</b> en la fecha y hora acordadas.</li>
        <li><b>Atendemos</b> la comunidad en horario de oficina, si tu plan lo incluye, y te derivamos las ventas.</li>
      </ol>
    </div>
    <div className="pr-sc-medio">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MEDIOS.sistema} alt="Sistema de Distinto con la grilla de publicaciones" loading="lazy" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={MEDIOS.flujo} alt="Detalle de una publicación en el sistema de Distinto" loading="lazy" />
    </div>
  </div>
);
