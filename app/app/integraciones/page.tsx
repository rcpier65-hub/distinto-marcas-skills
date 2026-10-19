import Link from "next/link";
import { SiteFrame } from "@/components/sitio/site-frame";
import { FacebookLogo, InstagramLogo, TikTokLogo, MetaLogo } from "@/components/estrategia/social-icons";
import { GoogleCalendarLogo, ShopifyLogo } from "@/components/sitio/logos";
import s from "@/components/sitio/sitio.module.css";

export const metadata = { title: "Integraciones — Distinto", description: "Cómo se conecta Distinto con TikTok, Meta (Facebook, Instagram, Meta Ads), Google Calendar y Shopify, y qué datos se leen." };

export default function Page() {
  return (
    <SiteFrame active="integraciones">
      <section className={s.pageHead}>
        <div className={s.wrap}>
          <span className={s.kicker}>Integraciones</span>
          <h1 className={`${s.h1} ${s.display}`}>Conexiones oficiales, <em>de solo lectura</em>.</h1>
          <p className={s.lead}>Cada conexión la autoriza el dueño de la cuenta y se usa únicamente para generar sus reportes. Aquí detallamos qué datos se leen y para qué.</p>
        </div>
      </section>

      <section style={{ paddingBottom: 30 }}>
        <div className={s.wrap}>
          {/* TikTok */}
          <div className={s.card} id="tiktok">
            <div className={s.intRow}><TikTokLogo size={44} /><div><h3>TikTok</h3><span className={s.tag}>Login Kit · Display API</span></div></div>
            <p style={{ marginTop: 14 }}>
              Desde el espacio de su marca, la agencia toca <b>“Conectar TikTok”</b> o envía un enlace al cliente. TikTok muestra su pantalla de autorización con los permisos solicitados y,
              solo si el dueño de la cuenta acepta, la plataforma puede leer estos datos para el reporte mensual de esa misma cuenta:
            </p>
            <div className={s.scopes}>
              <div><code>user.info.basic</code><span>Identificador de la cuenta, nombre visible y foto de perfil, para identificar la cuenta conectada en el reporte.</span></div>
              <div><code>user.info.profile</code><span>Nombre de usuario, biografía, verificación y enlace al perfil, que se muestran en la tarjeta de la cuenta.</span></div>
              <div><code>user.info.stats</code><span>Seguidores, seguidos, likes totales y cantidad de videos, para los indicadores y el crecimiento mensual.</span></div>
              <div><code>video.list</code><span>Videos públicos con sus vistas, likes, comentarios y compartidos, para el rendimiento del mes y los videos con más vistas.</span></div>
            </div>
            <p style={{ marginTop: 14 }}>
              <b>No hacemos:</b> publicar, editar o eliminar contenido; enviar o leer mensajes; vender datos; usarlos para publicidad o para entrenar inteligencia artificial.
              El dueño puede desconectar la cuenta en cualquier momento desde TikTok (<i>Ajustes y privacidad → Seguridad y permisos → Aplicaciones y servicios</i>) o escribiéndonos.
            </p>
          </div>

          {/* Meta */}
          <div className={s.card} style={{ marginTop: 16 }} id="meta">
            <div className={s.intRow}><MetaLogo size={44} /><FacebookLogo size={30} /><InstagramLogo size={30} /><div><h3>Meta: Facebook, Instagram y Meta Ads</h3><span className={s.tag}>Graph API · Marketing API</span></div></div>
            <p style={{ marginTop: 14 }}>
              Con la autorización del administrador de los activos en Meta Business, la plataforma lee las estadísticas de las páginas de Facebook y las cuentas profesionales de Instagram
              (seguidores, visualizaciones, alcance, interacciones y publicaciones) y los resultados de las cuentas publicitarias (inversión y conversaciones iniciadas).
              No publica contenido ni modifica anuncios.
            </p>
          </div>

          <div className={s.grid2}>
            <div className={s.card}>
              <div className={s.intRow}><GoogleCalendarLogo size={40} /><h3>Google Calendar</h3></div>
              <p style={{ marginTop: 12 }}>Crea y sincroniza reuniones y grabaciones con su enlace de Google Meet e invita a los participantes indicados.</p>
            </div>
            <div className={s.card}>
              <div className={s.intRow}><ShopifyLogo size={40} /><h3>Shopify</h3></div>
              <p style={{ marginTop: 12 }}>Lee pedidos pagados y productos más vendidos de la tienda del cliente para cruzar ventas con la inversión en pauta.</p>
            </div>
          </div>
        </div>
      </section>

      <section style={{ paddingBottom: 76 }}>
        <div className={s.wrap}>
          <div className={s.note}>
            <p>Más detalles sobre el tratamiento de datos en nuestra <Link href="/privacidad/">Política de privacidad</Link>, nuestros <Link href="/terminos/">Términos</Link> y la página <Link href="/eliminar-datos">Eliminar mis datos</Link>.</p>
          </div>
        </div>
      </section>
    </SiteFrame>
  );
}
