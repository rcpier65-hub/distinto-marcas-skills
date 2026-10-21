"use client";
/* Preguntas interactivas de Social Media y Publicidad (Pedro 21-oct-2026).
   Lo que se afirma de los algoritmos se limita a lo que Instagram dijo
   públicamente (tiempo de reproducción, compartidos y guardados); los
   cálculos son simulaciones con las cifras que pone el cliente. */
import { useState } from "react";
import { PLANES_SOCIAL } from "@/lib/presentacion/servicios";
import { REGLAS_COMERCIALES } from "@/lib/planes/catalogo";
import { excessAdFee } from "@/lib/propuestas/model";
import { Ico, type Tema } from "./explicadores";

const ent = (v: number) => new Intl.NumberFormat("es-PE").format(Math.round(v));

/* ---------- Social: seguidores ---------- */
function Seguidores1() {
  const [ver, setVer] = useState<"likes" | "valor">("likes");
  const senales = [
    { t: "Tiempo de reproducción", d: "Cuánto del video ve la gente. Un video que se ve completo pesa más.", fuerte: true },
    { t: "Compartidos por mensaje", d: "Cuando alguien lo envía a un amigo, la red entiende que vale la pena.", fuerte: true },
    { t: "Guardados", d: "Contenido útil que la gente quiere volver a ver.", fuerte: true },
    { t: "Me gusta", d: "Cuentan, pero pesan menos de lo que la mayoría cree.", fuerte: false },
  ];
  return (
    <div className="pr-x-dos">
      <div>
        <p className="pr-x-texto">Las redes ya no muestran tu contenido solo a tus seguidores: lo prueban con gente nueva y lo reparten según cómo reacciona. Instagram ha dicho públicamente qué señales pesan más.</p>
        <div className="pr-x-switch">
          <button type="button" aria-pressed={ver === "likes"} className={ver === "likes" ? "pr-x-sw-on" : ""} onClick={() => setVer("likes")}>Lo que la gente cree</button>
          <button type="button" aria-pressed={ver === "valor"} className={ver === "valor" ? "pr-x-sw-on" : ""} onClick={() => setVer("valor")}>Lo que pesa de verdad</button>
        </div>
      </div>
      <div className="pr-x-barras">
        {senales.map((x) => {
          const w = ver === "likes" ? (x.fuerte ? 30 : 100) : (x.fuerte ? 100 : 30);
          return (
            <div key={x.t} className={ver === "valor" && x.fuerte ? "pr-x-gana" : ""}>
              <div className="pr-x-barras-cab"><b>{x.t}</b></div>
              <div className="pr-x-barra-v"><i style={{ width: `${w}%` }} /></div>
              <small>{x.d}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}
function Seguidores2() {
  const etapas = [
    { t: "Descubrimiento", d: "Gente que aún no te conoce te ve por primera vez.", m: ["Alcance", "Reproducciones", "Seguidores nuevos"], c: "Videos cortos con gancho, tendencias, humor" },
    { t: "Consideración", d: "Te evalúa: guarda, comparte, pregunta.", m: ["Guardados", "Compartidos", "Mensajes", "Clics"], c: "Educativos, comparativos, testimonios" },
    { t: "Decisión", d: "Compra, agenda o te escribe para cerrar.", m: ["Chats de WhatsApp", "Citas", "Ventas"], c: "Ofertas, garantías, preguntas frecuentes" },
  ];
  const [i, setI] = useState(0);
  const e = etapas[i];
  return (
    <div className="pr-x-dos pr-x-dos-ancho">
      <div className="pr-x-opciones">
        {etapas.map((x, k) => <button key={x.t} type="button" className={k === i ? "pr-x-op pr-x-op-on" : "pr-x-op"} style={{ marginLeft: `${k * 22}px` }} onClick={() => setI(k)}><b>{x.t}</b><span>{x.d}</span></button>)}
      </div>
      <div className="pr-x-detalle">
        <h4>{e.t}</h4>
        <p className="pr-x-sub">Qué medimos</p>
        <div className="pr-b-chips">{e.m.map((x) => <span key={x}>{x}</span>)}</div>
        <p className="pr-x-sub" style={{ marginTop: 16 }}>Qué contenido funciona</p>
        <p>{e.c}</p>
        <p className="pr-x-nota">Los seguidores son solo la primera etapa. Medimos las tres para saber si las redes están vendiendo.</p>
      </div>
    </div>
  );
}

/* ---------- Social: orgánico o publicidad ---------- */
function Organico1() {
  const [modo, setModo] = useState<"organico" | "pauta" | "ambos">("ambos");
  const txt = {
    organico: { t: "Solo orgánico", p: ["Construye confianza y comunidad", "Lo que publicas queda en tu perfil"], c: ["Crece despacio", "No eliges a quién le llega"] },
    pauta: { t: "Solo publicidad", p: ["Resultados desde la primera semana", "Eliges a quién le llega"], c: ["Si apagas los anuncios, se detiene", "Un perfil vacío convence menos"] },
    ambos: { t: "Los dos juntos", p: ["El contenido da confianza y los anuncios lo llevan a más gente", "Los videos que funcionan solos se vuelven anuncios"], c: ["Requiere presupuesto para pauta"] },
  }[modo];
  return (
    <div className="pr-x-dos">
      <div>
        <div className="pr-x-switch">
          {(["organico", "pauta", "ambos"] as const).map((m) => <button key={m} type="button" aria-pressed={modo === m} className={modo === m ? "pr-x-sw-on" : ""} onClick={() => setModo(m)}>{m === "organico" ? "Orgánico" : m === "pauta" ? "Publicidad" : "Ambos"}</button>)}
        </div>
        <svg viewBox="0 0 320 160" className="pr-x-curva" role="img" aria-label="Curva ilustrativa de crecimiento">
          <line x1="20" y1="140" x2="310" y2="140" stroke="currentColor" strokeOpacity=".2" />
          {modo !== "pauta" && <path d="M20 138 C 110 132, 200 100, 310 40" fill="none" stroke="#7b2cbf" strokeWidth="3" />}
          {modo !== "organico" && <path d={modo === "pauta" ? "M20 138 L 60 70 L 240 66 L 250 132 L 310 136" : "M20 138 C 60 70, 200 60, 310 18"} fill="none" stroke="#f2cc2c" strokeWidth="3" />}
          <text x="20" y="156" fontSize="10" fill="currentColor" opacity=".55">Mes 1</text><text x="270" y="156" fontSize="10" fill="currentColor" opacity=".55">Mes 6</text>
        </svg>
        <p className="pr-x-nota">Curva ilustrativa: muestra la tendencia, no una promesa de resultados.</p>
      </div>
      <div className="pr-x-detalle">
        <h4>{txt.t}</h4>
        <div className="pr-x-proscons"><div><b>A favor</b><ul>{txt.p.map((x) => <li key={x}>{x}</li>)}</ul></div><div><b>Ten en cuenta</b><ul>{txt.c.map((x) => <li key={x}>{x}</li>)}</ul></div></div>
      </div>
    </div>
  );
}

/* ---------- Social: cuánto contenido ---------- */
function Contenido1() {
  const [id, setId] = useState(PLANES_SOCIAL[0]?.id ?? "");
  const p = PLANES_SOCIAL.find((x) => x.id === id) ?? PLANES_SOCIAL[0];
  return (
    <div className="pr-x-dos pr-x-dos-ancho">
      <div className="pr-x-opciones">
        {PLANES_SOCIAL.map((x) => <button key={x.id} type="button" className={x.id === id ? "pr-x-op pr-x-op-on" : "pr-x-op"} onClick={() => setId(x.id)}><b>{x.nombre}</b><span>{x.precioLabel} al mes</span></button>)}
      </div>
      <div className="pr-x-detalle">
        <h4>{p.nombre}</h4>
        <p className="pr-x-sub">{p.aplica}</p>
        <ul className="pr-x-lista">{p.incluye.map((x) => <li key={x}>{x}</li>)}</ul>
        <p className="pr-x-nota">Más publicaciones no siempre es mejor: preferimos menos piezas bien hechas y constantes que muchas improvisadas.</p>
      </div>
    </div>
  );
}

/* ---------- Social: qué necesitamos del cliente ---------- */
const Cliente1 = () => (
  <div className="pr-x-quien">
    <div><b>Tú</b><ul>
      <li>Darnos acceso por rol a tus cuentas</li><li>Contarnos productos, precios y promociones</li><li>Estar en la grabación o designar a alguien</li><li>Aprobar la grilla y cada pieza</li><li>Responder las consultas de venta que te derivamos</li>
    </ul></div>
    <div><b>Distinto</b><ul>
      <li>Estrategia, guiones y diseño</li><li>Grabación y edición según tu plan</li><li>Publicación y comunidad en horario de oficina</li><li>Reporte mensual con métricas reales</li>
    </ul></div>
    <div><b>Reglas claras</b><ul>{REGLAS_COMERCIALES.filter((r) => /rondas|24\/7|Horario/.test(r)).map((r) => <li key={r}>{r}</li>)}</ul></div>
  </div>
);

/* ---------- Publicidad: cuánto invertir ---------- */
function Inversion1() {
  const [inv, setInv] = useState(1500);
  const [costo, setCosto] = useState(3);
  const [cierre, setCierre] = useState(10);
  const resultados = costo > 0 ? inv / costo : 0;
  const ventas = (resultados * cierre) / 100;
  const fee = excessAdFee(inv);
  return (
    <div className="pr-x-dos pr-x-dos-ancho">
      <div>
        <label className="pr-x-label" htmlFor="pr-x-inv">Inversión mensual: S/ {ent(inv)}</label>
        <input id="pr-x-inv" type="range" min={300} max={10000} step={100} value={inv} onChange={(e) => setInv(Number(e.target.value))} className="pr-x-rango" />
        <label className="pr-x-label" htmlFor="pr-x-costo">Costo por conversación (S/)</label>
        <input id="pr-x-costo" type="number" min={0.5} step={0.5} value={costo} onChange={(e) => setCosto(Math.max(0.5, Number(e.target.value) || 0.5))} className="pr-x-input" />
        <label className="pr-x-label" htmlFor="pr-x-cierre">De cada 100 conversaciones, ¿cuántas compran? ({cierre})</label>
        <input id="pr-x-cierre" type="range" min={1} max={50} value={cierre} onChange={(e) => setCierre(Number(e.target.value))} className="pr-x-rango" />
      </div>
      <div className="pr-x-detalle pr-x-rec">
        <small>Con esas cifras</small>
        <p className="pr-x-grande">{ent(resultados)} conversaciones</p>
        <p className="pr-x-grande" style={{ marginTop: 0 }}>≈ {ent(ventas)} ventas al mes</p>
        <p>Cada venta te costaría en publicidad unos S/ {ventas > 0 ? ent(inv / ventas) : "—"}.</p>
        {fee > 0 && <p className="pr-aviso">Sobre S/ 3,000 de inversión se suma un fee de 10% del excedente: S/ {ent(fee)} al mes.</p>}
        <p className="pr-x-nota">Simulación con tus cifras. El costo real lo conocemos en las primeras semanas y lo reportamos cada mes.</p>
      </div>
    </div>
  );
}

/* ---------- Publicidad: quién paga qué ---------- */
const Pago1 = () => (
  <div>
    <div className="pr-x-flujo">
      <div><b>Tú</b><span>Tu tarjeta registrada en la cuenta publicitaria</span></div>
      <div className="pr-x-flujo-flechas"><span>Inversión en anuncios →</span><span>Gestión mensual →</span></div>
      <div className="pr-x-flujo-destinos"><div><b>Meta, TikTok o Google</b><span>Cobran directo los anuncios</span></div><div><b>Distinto</b><span>Cobra la gestión de campañas</span></div></div>
    </div>
    <ul className="pr-x-lista">
      <li>La inversión nunca pasa por nosotros: la ves en tu propia cuenta.</li>
      <li>La cuenta publicitaria queda a tu nombre.</li>
      <li>Si la inversión supera S/ 3,000 al mes, se suma un fee de 10% sobre el excedente.</li>
    </ul>
  </div>
);

/* ---------- Publicidad: cómo se mide ---------- */
function Medicion1() {
  const pasos = [
    { t: "Ven el anuncio", d: "Alcance, reproducciones y costo por mil." },
    { t: "Escriben o hacen clic", d: "WhatsApp con mensaje rastreable, píxel y UTM." },
    { t: "Agendan o compran", d: "Citas, pedidos o ventas registradas." },
    { t: "Sabemos qué anuncio vendió", d: "Cruzamos anuncio con venta: costo por cliente real." },
  ];
  const [i, setI] = useState(3);
  return (
    <div>
      <div className="pr-x-recorrido">
        {pasos.map((p, k) => <button key={p.t} type="button" className={k <= i ? "pr-x-on" : ""} onClick={() => setI(k)} style={{ textAlign: "left", font: "inherit", cursor: "pointer" }}><span>{k + 1}</span><b>{p.t}</b><p>{p.d}</p></button>)}
      </div>
      <p className="pr-x-nota">Con clínicas y negocios con sistema de citas ya lo hacemos: el reporte une el gasto de cada anuncio con los chats, citas y pagos.</p>
    </div>
  );
}

export const TEMAS_SOCIAL: Tema[] = [
  { id: "seguidores", pregunta: "¿Por qué no crecen mis seguidores?", resumen: "Lo que hoy premian las redes.", icono: <Ico d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1M9 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 8v6M22 11h-6" />,
    pasos: () => [{ titulo: "Lo que pesa de verdad", contenido: <Seguidores1 /> }, { titulo: "Seguidores no son ventas", contenido: <Seguidores2 /> }] },
  { id: "organico", pregunta: "¿Orgánico o publicidad?", resumen: "Qué hace cada uno y por qué juntos.", icono: <Ico d="M3 17l6-6 4 4 8-8M14 7h7v7" />,
    pasos: () => [{ titulo: "Orgánico, publicidad o ambos", contenido: <Organico1 /> }] },
  { id: "contenido", pregunta: "¿Cuánto contenido necesito?", resumen: "Lo que incluye cada plan al mes.", icono: <Ico d="M4 5h16v14H4zM4 9h16M9 9v10" />,
    pasos: () => [{ titulo: "Contenido por plan", contenido: <Contenido1 /> }] },
  { id: "cliente", pregunta: "¿Qué necesitan de mí?", resumen: "Lo que haces tú y lo que hacemos nosotros.", icono: <Ico d="M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM2 21v-1a6 6 0 0 1 12 0v1M17 11l2 2 4-4" />,
    pasos: () => [{ titulo: "Trabajo en equipo", contenido: <Cliente1 /> }] },
];
export const TEMAS_ADS: Tema[] = [
  { id: "inversion", pregunta: "¿Cuánto debo invertir en anuncios?", resumen: "Simula conversaciones y ventas.", icono: <Ico d="M12 3v18M16.5 7.5c0-1.7-2-3-4.5-3s-4.5 1.3-4.5 3 2 2.6 4.5 3 4.5 1.3 4.5 3-2 3-4.5 3-4.5-1.3-4.5-3" />,
    pasos: () => [{ titulo: "Simula tu inversión", contenido: <Inversion1 /> }] },
  { id: "pago", pregunta: "¿Quién paga la publicidad?", resumen: "Dónde va cada sol.", icono: <Ico d="M3 7h18v10H3zM3 11h18M7 15h3" />,
    pasos: () => [{ titulo: "Quién paga qué", contenido: <Pago1 /> }] },
  { id: "medicion", pregunta: "¿Cómo sé si funciona?", resumen: "Del anuncio a la venta.", icono: <Ico d="M4 20V10M10 20V4M16 20v-7M22 20H2" />,
    pasos: () => [{ titulo: "Del anuncio a la venta", contenido: <Medicion1 /> }] },
];
