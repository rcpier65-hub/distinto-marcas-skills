/* Marco del sitio público de app.distintostudio.com: menú superior siempre
   visible (Privacidad y Términos sin abrir menús, requisito de TikTok) y pie
   de página con los datos legales. Pedro 19-oct-2026. */
import Link from "next/link";
import { Fredoka, Montserrat } from "next/font/google";
import s from "./sitio.module.css";

const display = Fredoka({ subsets: ["latin"], weight: ["500", "600"], variable: "--font-sitio-display" });
const sans = Montserrat({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"], variable: "--font-sitio-sans" });

export type Seccion = "inicio" | "funciones" | "integraciones" | "recursos" | "privacidad" | "terminos" | "eliminar-datos";
const NAV: { id: Seccion; href: string; label: string }[] = [
  { id: "inicio", href: "/", label: "Inicio" },
  { id: "funciones", href: "/funciones", label: "Funciones" },
  { id: "integraciones", href: "/integraciones", label: "Integraciones" },
  { id: "recursos", href: "/recursos", label: "Recursos" },
  { id: "privacidad", href: "/privacidad/", label: "Privacidad" },
  { id: "terminos", href: "/terminos/", label: "Términos" },
];
export const DEMO_URL = "https://distintostudio.com/#agendar";

export function SiteFrame({ active, children }: { active: Seccion; children: React.ReactNode }) {
  const recursosEnWeb = active === "recursos";
  const href = (item: (typeof NAV)[number]) => {
    if (!recursosEnWeb) return item.href;
    if (item.id === "inicio") return "https://www.distintostudio.com/";
    if (item.id === "funciones") return "https://www.distintostudio.com/#servicios";
    if (item.id === "integraciones") return "https://app.distintostudio.com/integraciones";
    return item.href;
  };
  const loginHref = recursosEnWeb ? "https://app.distintostudio.com/login" : "/login";

  return (
    <div className={`${s.page} ${display.variable} ${sans.variable}`}>
      <header className={s.top}>
        <div className={s.topIn}>
          <Link href={recursosEnWeb ? "https://www.distintostudio.com/" : "/"} className={s.logo} aria-label="Distinto — inicio">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/agencia/distinto-horizontal.svg" alt="Distinto" width={132} height={30} />
            <span>Plataforma</span>
          </Link>
          <nav className={s.nav} aria-label="Principal">
            {NAV.map((n) => (
              <Link key={n.id} href={href(n)} className={active === n.id ? s.on : undefined}>{n.label}</Link>
            ))}
          </nav>
          <Link href={loginHref} className={s.login}>Iniciar sesión</Link>
        </div>
      </header>
      <main>{children}</main>
      <footer className={s.foot}>
        <div className={s.wrap}>
          <div className={s.footGrid}>
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/agencia/distinto-horizontal.svg" alt="Distinto" width={120} height={27} style={{ display: "block", marginBottom: 10 }} />
              <p style={{ margin: 0, maxWidth: 300 }}>La plataforma de gestión de Distinto Studio para agencias de marketing y sus clientes.</p>
            </div>
            <div>
              <h4>Plataforma</h4>
              <Link href={recursosEnWeb ? "https://www.distintostudio.com/#servicios" : "/funciones"}>Funciones</Link>
              <Link href={recursosEnWeb ? "https://app.distintostudio.com/integraciones" : "/integraciones"}>Integraciones</Link>
              <Link href="/recursos">Recursos</Link>
              <Link href={loginHref}>Iniciar sesión</Link>
            </div>
            <div>
              <h4>Legal</h4>
              <Link href="/privacidad/">Política de privacidad</Link>
              <Link href="/terminos/">Términos y condiciones</Link>
              <Link href="/eliminar-datos">Eliminar mis datos</Link>
            </div>
            <div>
              <h4>Contacto</h4>
              <a href="mailto:team@distintostudio.com">team@distintostudio.com</a>
              <a href="https://wa.me/51983852191" target="_blank" rel="noopener noreferrer">+51 983 852 191</a>
              <a href="https://distintostudio.com" target="_blank" rel="noopener noreferrer">distintostudio.com</a>
            </div>
          </div>
          <div className={s.footBottom}>
            <span>© 2026 Distinto Agencia S.A.C. · RUC 20614387930 · Lima, Perú</span>
            <span>
              <Link href="/privacidad/" style={{ display: "inline" }}>Privacidad</Link> ·{" "}
              <Link href="/terminos/" style={{ display: "inline" }}>Términos</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
