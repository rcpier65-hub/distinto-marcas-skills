"use client";
/* «Cómo trabajamos»: las 6 fases de una web con un esquema de cómo se ve cada
   una. La misma página pasa de cajas (baja) a textos (media) y a diseño final
   (alta), para que el cliente vea la evolución. Entrega 2 suma el brief, el
   mapa de Retoz y los 14 proyectos del portafolio. */
import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

const FASES = [
  { id: "brief", titulo: "Brief", texto: "Una reunión y un documento donde dejamos claro qué quieres lograr, a quién le hablas, qué tono tiene tu marca, qué webs te gustan y qué debe hacer la tuya.", correccion: "Lo revisas y ajustamos antes de diseñar." },
  { id: "mapa", titulo: "Mapa del sitio", texto: "Ordenamos las páginas y el recorrido del visitante: qué ve primero, a dónde va después y dónde toma acción.", correccion: "Una ronda para mover, sumar o quitar páginas." },
  { id: "baja", titulo: "Baja fidelidad", texto: "Cajas y líneas: solo la distribución de cada sección. Así decidimos el orden sin distraernos con colores.", correccion: "Una ronda de correcciones de estructura." },
  { id: "media", titulo: "Media fidelidad", texto: "La misma distribución con tus textos reales y la jerarquía definida, todavía en grises.", correccion: "Una ronda de correcciones de contenido." },
  { id: "alta", titulo: "Alta fidelidad", texto: "El diseño final con tu marca: colores, tipografías, fotos y detalles, en escritorio y celular.", correccion: "Una ronda de correcciones de diseño." },
  { id: "lanzamiento", titulo: "Lanzamiento", texto: "Desarrollamos, probamos formularios, pagos y celular, y publicamos. Después medimos y priorizamos mejoras.", correccion: "" },
] as const;

export function Proceso() {
  const [i, setI] = useState(0);
  const reducir = useReducedMotion();
  const f = FASES[i];
  return (
    <div className="pr-proceso">
      <h2>Cómo construimos tu web</h2>
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
        </div>
        <div className="pr-lienzo" aria-hidden="true">
          <AnimatePresence mode="wait">
            <motion.div key={f.id} className={`pr-esquema pr-esq-${f.id}`}
              initial={reducir ? false : { opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={reducir ? undefined : { opacity: 0 }} transition={{ duration: 0.3 }}>
              <Esquema fase={f.id} />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function Esquema({ fase }: { fase: (typeof FASES)[number]["id"] }) {
  if (fase === "brief") {
    return (
      <div className="pr-doc">
        <b>Brief del proyecto</b>
        {["Objetivo", "Público", "Tono de marca", "Referencias", "Funciones", "Alcance"].map((t) => (
          <div key={t} className="pr-doc-fila"><span>{t}</span><i /><i className="pr-corta" /></div>
        ))}
      </div>
    );
  }
  if (fase === "mapa") {
    return (
      <div className="pr-arbol">
        <div className="pr-nodo pr-raiz">Inicio</div>
        <div className="pr-ramas">
          {["Nosotros", "Productos", "Blog", "Contacto"].map((t) => (
            <div key={t} className="pr-rama"><div className="pr-nodo">{t}</div>{t === "Productos" && <div className="pr-hijos"><div className="pr-nodo pr-hijo">Categoría</div><div className="pr-nodo pr-hijo">Producto</div><div className="pr-nodo pr-hijo">Carrito</div></div>}</div>
          ))}
        </div>
      </div>
    );
  }
  /* Baja, media y alta comparten la misma página para que se note la evolución. */
  const nivel = fase === "lanzamiento" ? "alta" : fase;
  return (
    <div className={`pr-pagina pr-${nivel}`}>
      {fase === "lanzamiento" && <div className="pr-navegador"><i /><i /><i /><span>tuempresa.pe</span><em>En línea</em></div>}
      <div className="pr-p-menu"><b>{nivel === "baja" ? "" : "TuMarca"}</b><span /><span /><span /></div>
      <div className="pr-p-hero">
        <div className="pr-p-hero-txt">
          {nivel === "baja" ? <><i /><i /><i className="pr-corta" /></> : <><strong>Todo para tu hogar, en un solo lugar</strong><p>Envíos a todo el Perú en 48 horas.</p></>}
          <em>{nivel === "baja" ? "" : "Ver productos"}</em>
        </div>
        <div className="pr-p-img" />
      </div>
      <div className="pr-p-cards">
        {[0, 1, 2].map((k) => <div key={k}><div className="pr-p-img" />{nivel !== "baja" && <span>{["Cocina", "Baño", "Jardín"][k]}</span>}</div>)}
      </div>
    </div>
  );
}
