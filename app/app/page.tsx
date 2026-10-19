// app.distintostudio.com — con sesión va directo al panel; sin sesión muestra
// la landing pública de la plataforma (requisito de TikTok: sitio completo,
// no solo un login). Pedro 19-oct-2026.
import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarDays, Palette, Users, LayoutDashboard, BarChart3, FileText, ShieldCheck, ArrowRight, Lock } from "lucide-react";
import { getUser } from "@/lib/auth/get-user";
import { SiteFrame, DEMO_URL } from "@/components/sitio/site-frame";
import { FacebookLogo, InstagramLogo, TikTokLogo, MetaLogo } from "@/components/estrategia/social-icons";
import { GoogleCalendarLogo, ShopifyLogo } from "@/components/sitio/logos";
import s from "@/components/sitio/sitio.module.css";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Distinto — Plataforma de gestión para agencias de marketing",
  description: "Planifica contenido, coordina a tu equipo, comparte un portal con cada cliente y envía reportes mensuales de Facebook, Instagram y TikTok desde un solo lugar.",
  alternates: { canonical: "https://app.distintostudio.com/" },
};

const FUNCIONES = [
  { Icon: CalendarDays, t: "Calendario de contenido", d: "Publicaciones por marca con flujo de copy, diseño, edición, aprobación y publicación." },
  { Icon: Palette, t: "Diseño y edición", d: "Tareas con entregables, enlaces de Drive y carruseles con el orden exacto de cada slide." },
  { Icon: Users, t: "Gestión del equipo", d: "Tareas, delegación, roles y permisos, y un panel de rendimiento por persona y por marca." },
  { Icon: LayoutDashboard, t: "Portal del cliente", d: "Cada cliente aprueba piezas, revisa su agenda y consulta sus reportes en un espacio privado." },
  { Icon: BarChart3, t: "Reportes de redes", d: "Reporte mensual de Facebook, Instagram, TikTok y Meta Ads con gráficas de crecimiento y PDF." },
  { Icon: FileText, t: "Propuestas y agenda", d: "Propuestas comerciales en PDF, reuniones con Google Meet y reservas desde la web." },
];

export default async function Home() {
  if (await getUser()) redirect("/dashboard");
  return (
    <SiteFrame active="inicio">
      {/* Portada */}
      <section className={s.hero}>
        <div className={`${s.wrap} ${s.heroGrid}`}>
          <div>
            <span className={s.kicker}>Software para agencias de marketing</span>
            <h1 className={`${s.h1} ${s.display}`}>Toda tu agencia en <em>un solo lugar</em>.</h1>
            <p className={s.lead}>
              Distinto es la plataforma con la que Distinto Studio gestiona el contenido, el equipo y los resultados de cada marca:
              del calendario de publicaciones al reporte mensual que recibe el cliente.
            </p>
            <div className={s.actions}>
              <Link href="/login" className={`${s.btn} ${s.btnPrimary}`}>Iniciar sesión <ArrowRight size={17} /></Link>
              <a href={DEMO_URL} className={`${s.btn} ${s.btnGhost}`}>Agendar una demo</a>
            </div>
            <div className={s.trust}>
              <span><b>+14 marcas</b> gestionadas</span>
              <span><b>Datos oficiales</b> de Meta y TikTok</span>
              <span><b>Lima, Perú</b></span>
            </div>
          </div>
          <div className={s.mock} aria-label="Vista del reporte de redes">
            <div className={s.mockBar}><i /><i /><i /></div>
            <div className={s.mockHero}>
              <small>REPORTE MENSUAL DE REDES</small>
              <div>Octubre de 2026</div>
            </div>
            <div className={s.mockKpis}>
              <div><small>Visualizaciones</small><b>547,426</b><br /><em>▲ 41%</em></div>
              <div><small>Seguidores</small><b>12,077</b><br /><em>▲ 176</em></div>
              <div><small>Conversaciones</small><b>1,388</b><br /><em>▲ 75%</em></div>
            </div>
            <div className={s.mockChart}>
              <svg viewBox="0 0 300 90" width="100%" aria-hidden="true">
                <defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#7c3aed" stopOpacity=".25" /><stop offset="1" stopColor="#7c3aed" stopOpacity="0" /></linearGradient></defs>
                <path d="M0,62 L60,52 L120,58 L180,40 L240,30 L300,18 L300,90 L0,90Z" fill="url(#g)" />
                <path d="M0,62 L60,52 L120,58 L180,40 L240,30 L300,18" fill="none" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" />
                <path d="M0,74 L60,70 L120,66 L180,60 L240,52 L300,46" fill="none" stroke="#E1306C" strokeWidth="2" strokeDasharray="5 4" />
              </svg>
            </div>
            <div className={s.mockNets}>
              <span><FacebookLogo size={18} /> Facebook</span>
              <span><InstagramLogo size={18} /> Instagram</span>
              <span><TikTokLogo size={18} /> TikTok</span>
            </div>
          </div>
        </div>
      </section>

      {/* Funciones */}
      <section className={`${s.section} ${s.alt}`}>
        <div className={`${s.wrap} ${s.center}`}>
          <span className={s.kicker}>Funciones</span>
          <h2 className={`${s.h2} ${s.display}`}>Del brief al reporte, sin cambiar de herramienta</h2>
          <p className={s.lead}>Cada área de la agencia trabaja en el mismo sistema y el cliente ve su avance en tiempo real.</p>
          <div className={s.grid3} style={{ textAlign: "left" }}>
            {FUNCIONES.map(({ Icon, t, d }) => (
              <div key={t} className={s.card}>
                <span className={s.icon}><Icon size={22} /></span>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 28 }}><Link href="/funciones" className={`${s.btn} ${s.btnGhost}`}>Ver todas las funciones <ArrowRight size={16} /></Link></div>
        </div>
      </section>

      {/* Integraciones */}
      <section className={s.section}>
        <div className={`${s.wrap} ${s.center}`}>
          <span className={s.kicker}>Integraciones</span>
          <h2 className={`${s.h2} ${s.display}`}>Conectado a las plataformas que ya usas</h2>
          <p className={s.lead}>Usamos las APIs oficiales. Cada conexión la autoriza el dueño de la cuenta y es de solo lectura para los reportes.</p>
          <div className={s.grid3} style={{ textAlign: "left" }}>
            <div className={s.card}>
              <div className={s.intRow}><MetaLogo size={34} /><h3>Meta</h3></div>
              <p style={{ marginTop: 10 }}>Facebook, Instagram y Meta Ads: visualizaciones, alcance, interacciones, seguidores e inversión publicitaria.</p>
            </div>
            <div className={s.card}>
              <div className={s.intRow}><TikTokLogo size={34} /><h3>TikTok</h3></div>
              <p style={{ marginTop: 10 }}>Con Login Kit, el cliente conecta su cuenta y su reporte incluye seguidores, likes y el rendimiento de sus videos.</p>
            </div>
            <div className={s.card}>
              <div className={s.intRow}><GoogleCalendarLogo size={34} /><h3>Google Calendar</h3></div>
              <p style={{ marginTop: 10 }}>Reuniones y grabaciones sincronizadas con Google Calendar y Google Meet.</p>
            </div>
            <div className={s.card}>
              <div className={s.intRow}><ShopifyLogo size={34} /><h3>Shopify</h3></div>
              <p style={{ marginTop: 10 }}>Pedidos pagados y productos más vendidos para medir ventas junto con la pauta.</p>
            </div>
            <div className={s.card}>
              <div className={s.intRow}><FacebookLogo size={34} /><InstagramLogo size={34} /><h3>Portal y reportes</h3></div>
              <p style={{ marginTop: 10 }}>Cada mes, el reporte se guarda, se exporta en PDF y se envía por correo al cliente.</p>
            </div>
            <div className={s.card}>
              <div className={s.intRow}><span className={s.icon}><Lock size={20} /></span><h3>Solo lectura</h3></div>
              <p style={{ marginTop: 10 }}>No publicamos ni enviamos mensajes desde las cuentas conectadas. Se pueden desconectar cuando quieras.</p>
            </div>
          </div>
          <div style={{ marginTop: 28 }}><Link href="/integraciones" className={`${s.btn} ${s.btnGhost}`}>Cómo funcionan las integraciones <ArrowRight size={16} /></Link></div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section className={`${s.section} ${s.alt}`}>
        <div className={`${s.wrap} ${s.center}`}>
          <span className={s.kicker}>Cómo funciona</span>
          <h2 className={`${s.h2} ${s.display}`}>El reporte mensual de cada cliente, en cuatro pasos</h2>
          <div className={s.steps} style={{ textAlign: "left" }}>
            <div className={s.step}><h3>Conecta las cuentas</h3><p>El cliente o la agencia autoriza Facebook, Instagram y TikTok desde el espacio de la marca.</p></div>
            <div className={s.step}><h3>Actualiza los datos</h3><p>La plataforma consulta las APIs oficiales y guarda una versión del reporte para todo el equipo.</p></div>
            <div className={s.step}><h3>Analiza el crecimiento</h3><p>Indicadores, gráficas de seis meses, mejores publicaciones y videos con más vistas.</p></div>
            <div className={s.step}><h3>Comparte con el cliente</h3><p>Exporta el PDF o envíalo por correo automáticamente cada mes.</p></div>
          </div>
        </div>
      </section>

      {/* Privacidad */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.privacy}>
            <div>
              <span className={s.kicker} style={{ background: "rgba(255,255,255,.12)", color: "#fff" }}>Privacidad y seguridad</span>
              <h2 className={`${s.h2} ${s.display}`}>Los datos de cada marca son de cada marca</h2>
              <p className={s.lead}>
                Tratamos la información conforme a la Ley N.° 29733 de Protección de Datos Personales del Perú y a las condiciones de cada plataforma.
                Lee nuestra <Link href="/privacidad/">Política de privacidad</Link> y nuestros <Link href="/terminos/">Términos</Link>.
              </p>
            </div>
            <ul>
              <li><span className={s.check}>✓</span><span><b>Solo lectura:</b> no publicamos, no editamos y no enviamos mensajes desde las cuentas conectadas.</span></li>
              <li><span className={s.check}>✓</span><span><b>Credenciales cifradas</b> y acceso restringido por marca y por rol.</span></li>
              <li><span className={s.check}>✓</span><span><b>Nunca vendemos datos</b> ni los usamos para publicidad o para entrenar inteligencia artificial.</span></li>
              <li><span className={s.check}>✓</span><span><b>Desconecta cuando quieras</b> y pide la eliminación de tus datos en <Link href="/eliminar-datos">un solo paso</Link>.</span></li>
            </ul>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className={`${s.section} ${s.alt}`}>
        <div className={`${s.wrap} ${s.center}`}>
          <span className={s.kicker}>Preguntas frecuentes</span>
          <h2 className={`${s.h2} ${s.display}`}>Lo que suelen preguntarnos</h2>
          <div className={s.faq} style={{ textAlign: "left" }}>
            <details><summary>¿Quién puede usar la plataforma?</summary><p>El equipo de Distinto Studio y los clientes de la agencia, cada uno con su propio acceso. Si quieres trabajar con nosotros, agenda una demo.</p></details>
            <details><summary>¿Qué datos de TikTok se leen?</summary><p>Con tu autorización: datos básicos del perfil, estadísticas de la cuenta (seguidores, likes, cantidad de videos) y las métricas de tus videos públicos. Solo se usan para tu reporte mensual. El detalle está en <Link href="/integraciones">Integraciones</Link>.</p></details>
            <details><summary>¿Pueden publicar en mis redes?</summary><p>No. Las conexiones son de solo lectura: la plataforma no publica, no edita contenido y no envía ni lee mensajes.</p></details>
            <details><summary>¿Cómo desconecto mi cuenta?</summary><p>Desde la configuración de TikTok o Facebook, o escribiéndonos. Eliminamos las credenciales al instante y los datos asociados en un máximo de 30 días. Ver <Link href="/eliminar-datos">Eliminar mis datos</Link>.</p></details>
            <details><summary>¿Dónde están mis datos?</summary><p>En proveedores de infraestructura con medidas de seguridad, como se explica en la <Link href="/privacidad/">Política de privacidad</Link>.</p></details>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className={s.section}>
        <div className={s.wrap}>
          <div className={s.cta}>
            <ShieldCheck size={34} />
            <h2 className={`${s.h2} ${s.display}`}>¿Ya eres parte del equipo o cliente de Distinto?</h2>
            <p className={s.lead}>Entra con el correo que te asignamos. Si aún no trabajas con nosotros, agenda una demo.</p>
            <div className={s.actions} style={{ justifyContent: "center" }}>
              <Link href="/login" className={s.btn} style={{ background: "#fff", color: "#3b2a8f" }}>Iniciar sesión <ArrowRight size={17} /></Link>
              <a href={DEMO_URL} className={`${s.btn} ${s.btnGhost}`}>Agendar una demo</a>
            </div>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
