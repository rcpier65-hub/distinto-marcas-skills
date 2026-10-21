"use client";
/* «Preguntas» interactivas (Pedro 21-oct-2026): muchos clientes no saben qué
   es un dominio, un servidor o qué plataforma les conviene. Cada tema se abre a
   pantalla completa y se explica en pasos, con algo que el cliente puede tocar.
   Precios referenciales consultados el 21-oct-2026; el monto final va en la
   propuesta. */
import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Paso = { titulo: string; contenido: React.ReactNode };
type Tema = { id: string; pregunta: string; resumen: string; icono: React.ReactNode; pasos: () => Paso[] };

const slug = (t: string) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "").slice(0, 30) || "tuempresa";

/* Íconos de línea propios (24×24) para no depender de otra librería. */
const Ico = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>;

/* ---------- Dominio ---------- */
function Dominio1() {
  const [nombre, setNombre] = useState("");
  const base = slug(nombre);
  return (
    <div className="pr-x-dos">
      <div className="pr-x-analogia">
        <div className="pr-x-casa"><span>Calle Los Pinos 123, Miraflores</span><small>Así te encuentran en la ciudad</small></div>
        <div className="pr-x-flecha">=</div>
        <div className="pr-x-barra"><i /><i /><i /><span>{base}.pe</span></div>
        <small>Así te encuentran en internet</small>
      </div>
      <div>
        <p className="pr-x-texto">El <b>dominio</b> es la dirección de tu web: lo que la gente escribe para llegar a ti. Es único en el mundo y se paga cada año.</p>
        <label className="pr-x-label" htmlFor="pr-x-nombre">Prueba con el nombre de tu empresa</label>
        <input id="pr-x-nombre" className="pr-x-input" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Manrique Psicología" maxLength={60} />
        <div className="pr-x-dominios">
          {[".com", ".pe", ".com.pe"].map((t) => <div key={t}><b>{base}{t}</b><span>{t === ".com" ? "Internacional, el más conocido" : t === ".pe" ? "Peruano, corto y local" : "Peruano para empresas"}</span></div>)}
        </div>
        <p className="pr-x-nota">Antes de comprarlo revisamos que esté libre y que no se parezca a una marca registrada.</p>
      </div>
    </div>
  );
}
function Dominio2() {
  const reducir = useReducedMotion();
  const [paso, setPaso] = useState(-1);
  useEffect(() => {
    if (paso < 0 || paso >= 3) return;
    const t = setTimeout(() => setPaso((p) => p + 1), reducir ? 0 : 900);
    return () => clearTimeout(t);
  }, [paso, reducir]);
  const etapas = [
    { t: "Escribe tu dirección", d: "El cliente escribe tuempresa.pe en Google o en el navegador." },
    { t: "El dominio indica dónde está", d: "El dominio apunta al servidor donde vive tu web (eso se llama DNS)." },
    { t: "El servidor entrega la web", d: "El servidor envía las páginas, fotos y textos." },
    { t: "Tu web aparece", d: "En menos de un segundo, en celular o computadora." },
  ];
  return (
    <div>
      <div className="pr-x-recorrido">
        {etapas.map((e, i) => (
          <div key={e.t} className={i <= paso ? "pr-x-on" : ""}>
            <span>{i + 1}</span><b>{e.t}</b><p>{e.d}</p>
          </div>
        ))}
      </div>
      <button type="button" className="pr-btn pr-btn-main pr-x-play" onClick={() => setPaso(0)}>{paso < 0 ? "Ver el recorrido" : "Repetir"}</button>
    </div>
  );
}
const Dominio3 = () => (
  <div className="pr-x-claves">
    <div><b>Va a tu nombre</b><p>El dominio debe quedar registrado a nombre de tu empresa. Si algún día cambias de agencia, sigue siendo tuyo.</p></div>
    <div><b>Se renueva cada año</b><p>Si no se renueva, la web y los correos dejan de funcionar. Activamos la renovación automática.</p></div>
    <div><b>Cuánto cuesta</b><p>.com: aprox. US$ 12–20 al año. .pe: aprox. S/ 180 + IGV al año en NIC.PE. Lo pagas tú directamente al proveedor.</p></div>
    <div><b>Sirve para tus correos</b><p>Con el mismo dominio creas correos como ventas@tuempresa.pe, que dan más confianza que un Gmail.</p></div>
  </div>
);

/* ---------- Hosting ---------- */
const HOSTINGS = [
  { id: "compartido", nombre: "Hosting compartido", analogia: "Un departamento en un edificio", ideal: "Webs informativas con pocas visitas", pros: ["Económico", "Fácil de empezar"], ojo: ["Comparte recursos con otras webs", "Puede ponerse lento si crece"], costo: "Aprox. US$ 3–10 al mes" },
  { id: "vps", nombre: "Servidor propio (VPS)", analogia: "Una casa propia", ideal: "Webs a medida, sistemas y mucho tráfico", pros: ["Rápido y solo para ti", "Instalas lo que necesites"], ojo: ["Alguien debe administrarlo", "Requiere actualizaciones y respaldos"], costo: "Aprox. US$ 6–30 al mes" },
  { id: "plataforma", nombre: "Plataforma (Shopify)", analogia: "Un local en un centro comercial", ideal: "Tiendas online", pros: ["Seguridad, pagos y servidor incluidos", "No te preocupas por el servidor"], ojo: ["Pago mensual del plan", "Comisiones según el medio de pago"], costo: "Desde aprox. US$ 29–39 al mes" },
];
const Hosting1 = () => (
  <div className="pr-x-dos">
    <div className="pr-x-pareja">
      <div><b>Dominio</b><span>La dirección</span><small>tuempresa.pe</small></div>
      <div className="pr-x-mas">+</div>
      <div><b>Hosting</b><span>El local donde vive tu web</span><small>Un servidor encendido 24/7</small></div>
    </div>
    <p className="pr-x-texto">El <b>hosting</b> o <b>servidor</b> es una computadora que está siempre encendida y conectada a internet. Ahí se guardan tus páginas, fotos y formularios. Sin hosting, el dominio no lleva a ningún lugar.</p>
  </div>
);
function Hosting2() {
  const [sel, setSel] = useState(HOSTINGS[0].id);
  const h = HOSTINGS.find((x) => x.id === sel)!;
  return (
    <div className="pr-x-dos pr-x-dos-ancho">
      <div className="pr-x-opciones" role="radiogroup" aria-label="Tipo de hosting">
        {HOSTINGS.map((x) => (
          <button key={x.id} type="button" role="radio" aria-checked={x.id === sel} className={x.id === sel ? "pr-x-op pr-x-op-on" : "pr-x-op"} onClick={() => setSel(x.id)}>
            <b>{x.nombre}</b><span>{x.analogia}</span>
          </button>
        ))}
      </div>
      <div className="pr-x-detalle">
        <h4>{h.nombre}</h4>
        <p className="pr-x-sub">Ideal para: {h.ideal}</p>
        <div className="pr-x-proscons">
          <div><b>A favor</b><ul>{h.pros.map((x) => <li key={x}>{x}</li>)}</ul></div>
          <div><b>Ten en cuenta</b><ul>{h.ojo.map((x) => <li key={x}>{x}</li>)}</ul></div>
        </div>
        <p className="pr-x-costo">{h.costo}</p>
      </div>
    </div>
  );
}
function Hosting3() {
  const marcas = [500, 2000, 10000, 50000, 200000];
  const [i, setI] = useState(1);
  const [vende, setVende] = useState(false);
  const rec = vende ? HOSTINGS[2] : i >= 3 ? HOSTINGS[1] : HOSTINGS[0];
  return (
    <div className="pr-x-dos">
      <div>
        <label className="pr-x-label" htmlFor="pr-x-visitas">¿Cuántas visitas esperas al mes?</label>
        <input id="pr-x-visitas" type="range" min={0} max={4} step={1} value={i} onChange={(e) => setI(Number(e.target.value))} className="pr-x-rango" />
        <p className="pr-x-grande">{new Intl.NumberFormat("es-PE").format(marcas[i])}{i === 4 ? " o más" : ""} visitas</p>
        <label className="pr-x-check"><input type="checkbox" checked={vende} onChange={(e) => setVende(e.target.checked)} /> Voy a vender en línea</label>
      </div>
      <div className="pr-x-detalle pr-x-rec">
        <small>Te recomendamos</small>
        <h4>{rec.nombre}</h4>
        <p>{vende ? "Para vender, la plataforma ya trae carrito, pagos seguros y servidor." : i >= 3 ? "Con ese tráfico conviene un servidor propio para que la web no se ponga lenta." : "Para empezar, un hosting compartido de buena calidad es suficiente."}</p>
        <p className="pr-x-costo">{rec.costo}</p>
      </div>
    </div>
  );
}

/* ---------- Plataforma ---------- */
const PLATAFORMAS = [
  { id: "shopify", nombre: "Shopify", ideal: "Tiendas online", edita: "Tú, desde un panel muy simple", mensual: "Plan desde aprox. US$ 29–39/mes", flexible: "Media: apps para casi todo", ejemplo: "Typhouse" },
  { id: "wordpress", nombre: "WordPress", ideal: "Webs corporativas, catálogos y blogs", edita: "Tú, textos y fotos desde un panel", mensual: "Solo hosting: aprox. US$ 3–10/mes", flexible: "Alta: miles de complementos", ejemplo: "Logística Los Olivos, Novaelec" },
  { id: "medida", nombre: "A medida (código en VPS)", ideal: "Sistemas, portales y funciones únicas", edita: "Panel hecho para ti, o nosotros", mensual: "Servidor: aprox. US$ 6–30/mes", flexible: "Total: se programa lo que necesites", ejemplo: "Plataformas internas como la de Distinto" },
] as const;
const PRIORIDADES = [
  { id: "vender", t: "Vender productos en línea", p: { shopify: 3, wordpress: 1, medida: 1 } },
  { id: "editar", t: "Editarla yo mismo sin ayuda", p: { shopify: 3, wordpress: 2, medida: 0 } },
  { id: "barato", t: "Pagar poco cada mes", p: { shopify: 0, wordpress: 3, medida: 1 } },
  { id: "contenido", t: "Publicar artículos o noticias", p: { shopify: 1, wordpress: 3, medida: 1 } },
  { id: "unico", t: "Funciones que no existen en otras webs", p: { shopify: 0, wordpress: 1, medida: 3 } },
  { id: "integrar", t: "Conectarla con mis sistemas (ERP, CRM)", p: { shopify: 1, wordpress: 1, medida: 3 } },
] as const;
const Plataforma1 = () => (
  <div className="pr-x-tabla-wrap">
    <table className="pr-x-tabla">
      <thead><tr><th /><>{PLATAFORMAS.map((p) => <th key={p.id}>{p.nombre}</th>)}</></tr></thead>
      <tbody>
        {([["Ideal para", "ideal"], ["Quién la actualiza", "edita"], ["Pago mensual", "mensual"], ["Flexibilidad", "flexible"], ["Lo usamos en", "ejemplo"]] as const).map(([t, k]) => (
          <tr key={k}><th scope="row">{t}</th>{PLATAFORMAS.map((p) => <td key={p.id}>{p[k]}</td>)}</tr>
        ))}
      </tbody>
    </table>
  </div>
);
function Plataforma2() {
  const [sel, setSel] = useState<string[]>([]);
  const puntos = useMemo(() => {
    const r = { shopify: 0, wordpress: 0, medida: 0 };
    for (const id of sel) { const q = PRIORIDADES.find((x) => x.id === id)!; for (const k of Object.keys(r) as (keyof typeof r)[]) r[k] += q.p[k]; }
    return r;
  }, [sel]);
  const max = Math.max(...Object.values(puntos));
  return (
    <div className="pr-x-dos pr-x-dos-ancho">
      <fieldset className="pr-x-prioridades">
        <legend>¿Qué es lo más importante para ti?</legend>
        {PRIORIDADES.map((q) => (
          <label key={q.id} className={sel.includes(q.id) ? "pr-x-check pr-x-check-on" : "pr-x-check"}>
            <input type="checkbox" checked={sel.includes(q.id)} onChange={() => setSel((s) => (s.includes(q.id) ? s.filter((x) => x !== q.id) : [...s, q.id]))} /> {q.t}
          </label>
        ))}
      </fieldset>
      <div className="pr-x-barras">
        {PLATAFORMAS.map((p) => {
          const v = puntos[p.id];
          const gana = sel.length > 0 && v === max;
          return (
            <div key={p.id} className={gana ? "pr-x-gana" : ""}>
              <div className="pr-x-barras-cab"><b>{p.nombre}</b>{gana && <span>Recomendado</span>}</div>
              <div className="pr-x-barra-v"><i style={{ width: `${max ? (v / max) * 100 : 0}%` }} /></div>
              <small>{p.ideal}</small>
            </div>
          );
        })}
        {!sel.length && <p className="pr-x-nota">Marca lo que te importa y vemos cuál conviene.</p>}
      </div>
    </div>
  );
}

/* ---------- Plantilla o a medida ---------- */
function Plantilla1() {
  const [medida, setMedida] = useState(false);
  return (
    <div className="pr-x-dos">
      <div>
        <div className="pr-x-switch" role="radiogroup" aria-label="Tipo de diseño">
          <button type="button" role="radio" aria-checked={!medida} className={!medida ? "pr-x-sw-on" : ""} onClick={() => setMedida(false)}>Plantilla</button>
          <button type="button" role="radio" aria-checked={medida} className={medida ? "pr-x-sw-on" : ""} onClick={() => setMedida(true)}>Diseño a medida</button>
        </div>
        <div className={`pr-x-maqueta ${medida ? "pr-x-maq-medida" : ""}`} aria-hidden="true">
          <div className="pr-x-mq-menu" /><div className="pr-x-mq-hero"><i /><i /></div><div className="pr-x-mq-cards"><i /><i /><i /></div>
        </div>
      </div>
      <div>
        {!medida ? (
          <><h4 className="pr-x-h4">Plantilla</h4><p className="pr-x-texto">Un diseño ya hecho que se compra y se le cambian logo, colores y textos. Es rápido, pero otras empresas pueden tener una web casi igual y el orden de las secciones no está pensado para tu cliente.</p></>
        ) : (
          <><h4 className="pr-x-h4">Diseño a medida</h4><p className="pr-x-texto">Partimos de tu brief y diseñamos cada sección para tu cliente: baja, media y alta fidelidad, con una ronda de correcciones en cada una. Usamos plataformas probadas para que puedas administrarla tú.</p></>
        )}
        <ul className="pr-x-lista">
          <li><b>Plantilla:</b> menor costo y plazo, diseño genérico.</li>
          <li><b>A medida:</b> se diferencia de la competencia y vende mejor.</li>
          <li><b>En Distinto:</b> diseñamos a medida en todos los niveles.</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- Administración ---------- */
const TAREAS: Record<string, { t: string; quien: "Tú" | "Distinto" | "La plataforma" }[]> = {
  shopify: [{ t: "Subir productos, precios y stock", quien: "Tú" }, { t: "Ver y despachar pedidos", quien: "Tú" }, { t: "Cambiar banners y promociones", quien: "Tú" }, { t: "Servidor, seguridad y pagos", quien: "La plataforma" }, { t: "Nuevas secciones o funciones", quien: "Distinto" }, { t: "Campañas y medición", quien: "Distinto" }],
  wordpress: [{ t: "Cambiar textos y fotos", quien: "Tú" }, { t: "Publicar noticias o artículos", quien: "Tú" }, { t: "Actualizaciones y respaldos", quien: "Distinto" }, { t: "Seguridad del hosting", quien: "Distinto" }, { t: "Nuevas secciones o funciones", quien: "Distinto" }, { t: "Renovar dominio y hosting", quien: "Tú" }],
  medida: [{ t: "Usar el panel hecho para ti", quien: "Tú" }, { t: "Servidor, actualizaciones y respaldos", quien: "Distinto" }, { t: "Seguridad y monitoreo", quien: "Distinto" }, { t: "Nuevas funciones", quien: "Distinto" }, { t: "Pago del servidor", quien: "Tú" }],
};
function Admin1() {
  const [p, setP] = useState<keyof typeof TAREAS>("wordpress");
  return (
    <div>
      <div className="pr-x-switch" role="radiogroup" aria-label="Plataforma">
        {(["shopify", "wordpress", "medida"] as const).map((x) => (
          <button key={x} type="button" role="radio" aria-checked={p === x} className={p === x ? "pr-x-sw-on" : ""} onClick={() => setP(x)}>{x === "shopify" ? "Shopify" : x === "wordpress" ? "WordPress" : "A medida"}</button>
        ))}
      </div>
      <div className="pr-x-quien">
        {(["Tú", "Distinto", "La plataforma"] as const).map((q) => {
          const items = TAREAS[p].filter((x) => x.quien === q);
          if (!items.length) return null;
          return <div key={q}><b>{q}</b><ul>{items.map((x) => <li key={x.t}>{x.t}</li>)}</ul></div>;
        })}
      </div>
      <p className="pr-x-nota">Al entregar te capacitamos con una sesión grabada. Lo de Distinto se cubre con el mantenimiento mensual, que es opcional.</p>
    </div>
  );
}

/* ---------- Costos mensuales ---------- */
function Costos1() {
  const [plat, setPlat] = useState<"shopify" | "wordpress" | "medida">("wordpress");
  const [dom, setDom] = useState<".com" | ".pe">(".pe");
  const filas = [
    { c: `Dominio ${dom}`, v: dom === ".com" ? "Aprox. US$ 12–20 al año" : "Aprox. S/ 180 + IGV al año", q: "Proveedor del dominio" },
    plat === "shopify" ? { c: "Plan de Shopify", v: "Aprox. US$ 29–39 al mes", q: "Shopify" } : plat === "wordpress" ? { c: "Hosting", v: "Aprox. US$ 3–10 al mes", q: "Proveedor de hosting" } : { c: "Servidor (VPS)", v: "Aprox. US$ 6–30 al mes", q: "Proveedor del servidor" },
    ...(plat === "shopify" ? [{ c: "Comisión por venta", v: "Según la pasarela de pago", q: "Pasarela" }] : []),
    { c: "Correos corporativos", v: "Opcional, según el proveedor", q: "Google o Microsoft" },
    { c: "Mantenimiento Distinto", v: "Opcional, según el plan", q: "Distinto" },
  ];
  return (
    <div className="pr-x-dos pr-x-dos-ancho">
      <div>
        <p className="pr-x-label">Tu web estará en</p>
        <div className="pr-x-switch">{(["shopify", "wordpress", "medida"] as const).map((x) => <button key={x} type="button" aria-pressed={plat === x} className={plat === x ? "pr-x-sw-on" : ""} onClick={() => setPlat(x)}>{x === "shopify" ? "Shopify" : x === "wordpress" ? "WordPress" : "A medida"}</button>)}</div>
        <p className="pr-x-label">Tu dominio</p>
        <div className="pr-x-switch">{([".com", ".pe"] as const).map((x) => <button key={x} type="button" aria-pressed={dom === x} className={dom === x ? "pr-x-sw-on" : ""} onClick={() => setDom(x)}>{x}</button>)}</div>
        <p className="pr-x-nota">Montos referenciales de octubre 2026. Los pagas tú directamente a cada proveedor; el detalle va en la propuesta.</p>
      </div>
      <table className="pr-x-tabla pr-x-costos">
        <thead><tr><th>Concepto</th><th>Costo</th><th>Se paga a</th></tr></thead>
        <tbody>{filas.map((f) => <tr key={f.c}><th scope="row">{f.c}</th><td>{f.v}</td><td>{f.q}</td></tr>)}</tbody>
      </table>
    </div>
  );
}

export const TEMAS: Tema[] = [
  { id: "dominio", pregunta: "¿Qué es un dominio?", resumen: "La dirección de tu web en internet.", icono: <Ico d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18Z" />,
    pasos: () => [{ titulo: "Tu dirección en internet", contenido: <Dominio1 /> }, { titulo: "Qué pasa cuando alguien la escribe", contenido: <Dominio2 /> }, { titulo: "Lo que debes saber", contenido: <Dominio3 /> }] },
  { id: "hosting", pregunta: "¿Qué es el hosting o servidor?", resumen: "El lugar donde vive tu web, encendido 24/7.", icono: <Ico d="M4 5h16v5H4zM4 14h16v5H4zM8 7.5h.01M8 16.5h.01" />,
    pasos: () => [{ titulo: "Dominio y hosting van juntos", contenido: <Hosting1 /> }, { titulo: "Tipos de hosting", contenido: <Hosting2 /> }, { titulo: "¿Cuál te conviene?", contenido: <Hosting3 /> }] },
  { id: "plataforma", pregunta: "¿Shopify, WordPress o a medida?", resumen: "Qué plataforma conviene según lo que necesitas.", icono: <Ico d="M4 6h16M4 12h10M4 18h7M17 15l2 2 3-4" />,
    pasos: () => [{ titulo: "Las tres opciones, lado a lado", contenido: <Plataforma1 /> }, { titulo: "Elige según tus prioridades", contenido: <Plataforma2 /> }] },
  { id: "plantilla", pregunta: "¿Plantilla o diseño a medida?", resumen: "La diferencia entre adaptar y diseñar.", icono: <Ico d="M4 4h7v7H4zM13 4h7v4h-7zM13 10h7v10h-7zM4 13h7v7H4z" />,
    pasos: () => [{ titulo: "Plantilla o diseño a medida", contenido: <Plantilla1 /> }] },
  { id: "admin", pregunta: "¿Cómo se administra mi web?", resumen: "Qué haces tú y qué hacemos nosotros.", icono: <Ico d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.6-2-3.4-2.4 1a7 7 0 0 0-2-1.2L14 3h-4l-.5 2.6a7 7 0 0 0-2 1.2l-2.4-1-2 3.4 2 1.6a7 7 0 0 0 0 2.4l-2 1.6 2 3.4 2.4-1a7 7 0 0 0 2 1.2L10 21h4l.5-2.6a7 7 0 0 0 2-1.2l2.4 1 2-3.4-2-1.6c.1-.4.1-.8.1-1.2Z" />,
    pasos: () => [{ titulo: "Quién hace qué", contenido: <Admin1 /> }] },
  { id: "costos", pregunta: "¿Cuánto pago al mes después?", resumen: "Los pagos que siguen después de lanzar.", icono: <Ico d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />,
    pasos: () => [{ titulo: "Pagos recurrentes de tu web", contenido: <Costos1 /> }] },
];

/* Tarjetas de temas + visor a pantalla completa. */
export function Explicadores() {
  const [abierto, setAbierto] = useState<string | null>(null);
  return (
    <>
      <div className="pr-x-temas">
        {TEMAS.map((t) => (
          <button key={t.id} type="button" className="pr-x-tema" onClick={() => setAbierto(t.id)}>
            <span className="pr-x-ico">{t.icono}</span>
            <b>{t.pregunta}</b>
            <small>{t.resumen}</small>
            <em>Explicar</em>
          </button>
        ))}
      </div>
      <AnimatePresence>{abierto && <Visor key={abierto} tema={TEMAS.find((t) => t.id === abierto)!} cerrar={() => setAbierto(null)} cambiar={setAbierto} />}</AnimatePresence>
    </>
  );
}

function Visor({ tema, cerrar, cambiar }: { tema: Tema; cerrar: () => void; cambiar: (id: string) => void }) {
  const pasos = useMemo(() => tema.pasos(), [tema]);
  const [i, setI] = useState(0);
  const reducir = useReducedMotion();
  const idx = TEMAS.findIndex((t) => t.id === tema.id);
  const siguiente = useCallback(() => {
    if (i < pasos.length - 1) setI(i + 1);
    else if (idx < TEMAS.length - 1) cambiar(TEMAS[idx + 1].id);
    else cerrar();
  }, [i, pasos.length, idx, cambiar, cerrar]);
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest("input, textarea, select")) { if (e.key === "Escape") cerrar(); return; }
      if (e.key === "Escape") { e.preventDefault(); cerrar(); }
      if (e.key === "ArrowRight") { e.preventDefault(); e.stopImmediatePropagation(); siguiente(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); e.stopImmediatePropagation(); setI((x) => Math.max(0, x - 1)); }
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [cerrar, siguiente]);
  const ultimo = i === pasos.length - 1;
  return (
    <motion.div className="pr-x-visor" role="dialog" aria-modal="true" aria-label={tema.pregunta}
      initial={reducir ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducir ? undefined : { opacity: 0 }} transition={{ duration: 0.2 }}>
      <header className="pr-x-cab">
        <span className="pr-x-ico">{tema.icono}</span>
        <div><small>{tema.pregunta}</small><h2>{pasos[i].titulo}</h2></div>
        <ol className="pr-x-puntos" aria-label="Pasos">{pasos.map((p, k) => <li key={p.titulo}><button type="button" aria-label={`Paso ${k + 1}: ${p.titulo}`} aria-current={k === i ? "step" : undefined} className={k === i ? "pr-x-punto-on" : ""} onClick={() => setI(k)} /></li>)}</ol>
        <button type="button" className="pr-btn pr-btn-ghost" onClick={cerrar}>Cerrar</button>
      </header>
      <div className="pr-x-cuerpo">
        <AnimatePresence mode="wait">
          <motion.div key={i} initial={reducir ? false : { opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={reducir ? undefined : { opacity: 0, x: -16 }} transition={{ duration: 0.22 }}>
            {pasos[i].contenido}
          </motion.div>
        </AnimatePresence>
      </div>
      <footer className="pr-x-pie">
        <button type="button" className="pr-btn pr-btn-ghost" onClick={() => setI((x) => Math.max(0, x - 1))} disabled={i === 0}>Anterior</button>
        <span>{i + 1} de {pasos.length}</span>
        <button type="button" className="pr-btn pr-btn-main" onClick={siguiente}>{!ultimo ? "Siguiente" : idx < TEMAS.length - 1 ? `Siguiente tema: ${TEMAS[idx + 1].pregunta}` : "Terminar"}</button>
      </footer>
    </motion.div>
  );
}
