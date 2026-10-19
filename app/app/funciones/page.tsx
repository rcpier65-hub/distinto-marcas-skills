import Link from "next/link";
import { CalendarDays, Palette, Clapperboard, Users, LayoutDashboard, BarChart3, CalendarClock, FileText, ArrowRight } from "lucide-react";
import { SiteFrame, DEMO_URL } from "@/components/sitio/site-frame";
import s from "@/components/sitio/sitio.module.css";

export const metadata = { title: "Funciones — Distinto", description: "Calendario de contenido, diseño, edición, gestión del equipo, portal del cliente y reportes de redes en una sola plataforma." };

const F = [
  { Icon: CalendarDays, t: "Calendario de contenido", items: ["Publicaciones por marca: reels, posts, carruseles e historias", "Flujo de copy, diseño, edición, aprobación y publicación", "Guion técnico, referencias para el editor y vista previa", "Generación de textos con inteligencia artificial"] },
  { Icon: Palette, t: "Diseño", items: ["Tareas de diseño con varios entregables", "Enlaces de Drive con vista previa", "Carruseles con la cantidad y el orden de cada slide", "Estado sincronizado con el calendario"] },
  { Icon: Clapperboard, t: "Edición de video", items: ["Indicaciones para el editor y referencias de video", "Versiones con y sin música", "Asignación y seguimiento por editor"] },
  { Icon: Users, t: "Gestión del equipo", items: ["Tareas, delegación y traspasos entre miembros", "Roles y permisos por persona y por marca", "Panel de rendimiento: carga de trabajo y rentabilidad por marca", "Checklist y reporte diario de cada persona"] },
  { Icon: LayoutDashboard, t: "Portal del cliente", items: ["Aprobación de publicaciones y correcciones con el segundo exacto del video", "Descarga de videos y portadas", "Agenda de reuniones y grabaciones", "Soporte y reportes privados"] },
  { Icon: BarChart3, t: "Reportes de redes", items: ["Facebook, Instagram, TikTok y Meta Ads en un solo reporte", "Gráficas de crecimiento de los últimos seis meses", "Mejores publicaciones y videos con más vistas", "PDF profesional y envío automático por correo"] },
  { Icon: CalendarClock, t: "Agenda", items: ["Sincronización con Google Calendar y Google Meet", "Reservas de reuniones desde la web de la agencia", "Detección de reuniones que se cruzan"] },
  { Icon: FileText, t: "Área comercial", items: ["Propuestas y planes de servicio para prospectos", "Documento PDF listo para enviar"] },
];

export default function Page() {
  return (
    <SiteFrame active="funciones">
      <section className={s.pageHead}>
        <div className={s.wrap}>
          <span className={s.kicker}>Funciones</span>
          <h1 className={`${s.h1} ${s.display}`}>Todo lo que tu agencia necesita, <em>conectado</em>.</h1>
          <p className={s.lead}>Distinto reúne la producción de contenido, el trabajo del equipo, la relación con el cliente y la medición de resultados.</p>
        </div>
      </section>
      <section style={{ paddingBottom: 76 }}>
        <div className={s.wrap}>
          <div className={s.grid2} style={{ marginTop: 10 }}>
            {F.map(({ Icon, t, items }) => (
              <div key={t} className={s.card}>
                <span className={s.icon}><Icon size={22} /></span>
                <h3>{t}</h3>
                <ul>{items.map((i) => <li key={i}>{i}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className={s.actions} style={{ justifyContent: "center", marginTop: 40 }}>
            <Link href="/login" className={`${s.btn} ${s.btnPrimary}`}>Iniciar sesión <ArrowRight size={17} /></Link>
            <a href={DEMO_URL} className={`${s.btn} ${s.btnGhost}`}>Agendar una demo</a>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
