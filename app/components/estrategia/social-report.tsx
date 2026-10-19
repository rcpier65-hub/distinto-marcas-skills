"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BarChart3,
  CalendarDays,
  RefreshCw,
  Users,
  Eye,
  MessageCircle,
} from "lucide-react";
import {
  addDays,
  delta,
  exactSum,
  monthOffset,
  type Channel,
  type MetricKey,
  type PostReport,
  type SocialReport,
} from "@/lib/social-reports/model";
import styles from "./social-report.module.css";
import { FacebookLogo, InstagramLogo, MetaLogo } from "./social-icons";
import { TrendModal, useTrend, type TrendMetric } from "./social-trend";
import { SocialReportPdf } from "./social-report-pdf";
import { EnviarCorreoBoton } from "./social-email";
import { TikTokSection, useTikTok } from "./social-tiktok";
import { Download, TrendingUp } from "lucide-react";

const names = { facebook: "Facebook", instagram: "Instagram" };
const integer = (value: number | null) =>
  value === null
    ? "—"
    : value.toLocaleString("es-PE", { maximumFractionDigits: 0 });
const date = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
const monthName = (value: string) =>
  new Intl.DateTimeFormat("es-PE", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}-01T12:00:00Z`));
function money(value: number | null, currency: string) {
  if (value === null) return "—";
  try {
    return new Intl.NumberFormat("es-PE", {
      style: "currency",
      currency,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
function Change({
  current,
  previous,
}: {
  current: number | null;
  previous: number | null;
}) {
  const change = delta(current, previous);
  return (
    <span className={styles.change}>
      {change === null
        ? "Sin base comparable"
        : `${change > 0 ? "+" : ""}${change.toLocaleString("es-PE", { maximumFractionDigits: 1 })}%`}
    </span>
  );
}
function useReport<T>(slug: string, month: string, detail: "report" | "posts") {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  useEffect(() => {
    const controller = new AbortController();
    void fetch(
      `/api/meta/reporte-redes?${new URLSearchParams({ marca: slug, mes: month, detalle: detail })}`,
      { signal: controller.signal, cache: "no-store" },
    )
      .then(async (response) => {
        if (
          response.redirected ||
          !response.headers.get("content-type")?.includes("application/json")
        )
          throw Error("Inicia sesión para consultar el reporte.");
        const body = await response.json();
        if (!response.ok)
          throw Error(
            body.error || "No se pudo consultar Meta. Intenta nuevamente.",
          );
        return body as T;
      })
      .then((data) => {
        if (!controller.signal.aborted) setState({ data });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setState({ error: error.message });
      });
    return () => controller.abort();
  }, [slug, month, detail]);
  return state;
}
export function SocialReportView({
  slug,
  today,
  brandName,
}: {
  slug: string;
  today: string;
  brandName?: string;
}) {
  const [month, setMonth] = useState(today.slice(0, 7)),
    [revision, setRevision] = useState(0),
    [actualizando, setActualizando] = useState(false);
  /* Actualizar = consultar Meta/TikTok y GUARDAR para todos. Sin tocarlo, todos
     ven la última versión guardada (Pedro 18-oct-2026). */
  async function actualizarDatos() {
    setActualizando(true);
    try {
      const r = await fetch("/api/meta/reporte-redes/actualizar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marca: slug, mes: month }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw Error(j.error || "No se pudo actualizar.");
      if (j.fallos?.length) toast.warning(`Actualizado con avisos: ${j.fallos.join(" · ")}`, { duration: 9000 });
      else toast.success("Datos actualizados y guardados");
      setRevision((n) => n + 1);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setActualizando(false);
    }
  }
  return (
    <div className={styles.report}>
      <div className={styles.toolbar}>
        <p>Resultados reales de las cuentas seleccionadas para esta marca.</p>
        <div className={styles.actions}>
          <label>
            <CalendarDays size={16} />
            <span className="sr-only">Mes del reporte</span>
            <input
              aria-label="Mes del reporte"
              type="month"
              min={monthOffset(today.slice(0, 7), -23)}
              max={today.slice(0, 7)}
              value={month}
              onChange={(e) => {
                if (e.target.value) setMonth(e.target.value);
              }}
            />
          </label>
          <button
            onClick={() => void actualizarDatos()}
            disabled={actualizando}
            aria-label="Actualizar los datos desde Meta y TikTok"
            title="Consulta Meta y TikTok y guarda esta versión para todos"
          >
            <RefreshCw size={15} className={actualizando ? "animate-spin" : ""} />
            {actualizando ? "Actualizando…" : "Actualizar datos"}
          </button>
        </div>
      </div>
      <ReportBody
        key={`${slug}:${month}:${revision}`}
        slug={slug}
        month={month}
        brandName={brandName || slug}
      />
    </div>
  );
}
/* Exportar PDF: trae la tendencia de 6 meses, monta el documento A4 e imprime. */
function ExportPdf({ slug, month, brand, report }: { slug: string; month: string; brand: string; report: SocialReport }) {
  const [on, setOn] = useState(false);
  const { data: trend, error } = useTrend(slug, month, on);
  const tk = useTikTok(slug, month, on);
  const listo = on && (trend || error) && (tk.data || tk.error);
  useEffect(() => {
    if (!listo) return;
    const antes = document.title;
    document.title = `Reporte redes ${brand} - ${monthName(month)}`;
    const t = setTimeout(() => {
      window.print();
      document.title = antes;
      setOn(false);
    }, 400);
    return () => clearTimeout(t);
  }, [listo, brand, month]);
  return (
    <>
      <button onClick={() => setOn(true)} disabled={on} aria-label="Exportar el reporte en PDF">
        <Download size={15} />
        {on ? "Preparando PDF…" : "Exportar PDF"}
      </button>
      {on && listo && <SocialReportPdf brand={brand} report={report} trend={trend ?? null} tiktok={tk.data ?? null} />}
    </>
  );
}
function ReportBody({ slug, month, brandName }: { slug: string; month: string; brandName: string }) {
  const { data, error } = useReport<SocialReport & { guardadoEn?: string; guardadoPor?: string | null }>(slug, month, "report");
  const [showPosts, setShowPosts] = useState(false);
  const [trend, setTrend] = useState<TrendMetric | null>(null);
  if (error)
    return (
      <div className={styles.notice} role="alert">
        <strong>No se pudo cargar el reporte.</strong>
        <p>{error}</p>
        <a href={`/marca/${slug}/metricas`}>
          Revisar las cuentas de esta marca →
        </a>
      </div>
    );
  if (!data)
    return (
      <section className={styles.loading} role="status">
        <BarChart3 size={28} />
        <h2>Consultando Facebook, Instagram y Meta Ads…</h2>
        <p>Preparando el periodo y su comparación.</p>
        <div className={styles.skeleton} />
      </section>
    );
  const { period, channels, ads } = data;
  if (!period.current.days)
    return (
      <div className={styles.notice}>
        Este mes aún no tiene días completos. Puedes consultar el mes anterior.
      </div>
    );
  const currentViews = exactSum(channels.map((c) => c.current.views)),
    previousViews = exactSum(channels.map((c) => c.previous.views));
  const followers = exactSum(channels.map((c) => c.followers)),
    source =
      channels.map((c) => names[c.network]).join(" + ") ||
      "Sin cuentas asignadas";
  return (
    <>
      <section className={styles.hero}>
        <div>
          <span className={styles.eyebrow}>
            REPORTE MENSUAL · API OFICIAL DE META
          </span>
          <h2>{monthName(month)}</h2>
          <p>
            {date(period.current.start)} —{" "}
            {date(addDays(period.current.end, -1))}
          </p>
          {data.guardadoEn && (
            <small style={{ display: "block", opacity: 0.85, marginBottom: 2 }}>
              Datos actualizados el{" "}
              {new Date(data.guardadoEn).toLocaleString("es-PE", { timeZone: "America/Lima", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              {data.guardadoPor ? ` por ${data.guardadoPor}` : ""} · se mantienen hasta que toques “Actualizar datos”
            </small>
          )}
          <small>
            Comparado con {date(period.previous.start)} —{" "}
            {date(addDays(period.previous.end, -1))}
            {period.partial ? " · Mes en curso, solo días completos" : ""}
          </small>
        </div>
        <div className={styles.heroSide}>
          <div className={styles.heroStamp}>
            <BarChart3 size={32} />
            <span>
              {period.current.days} días
              <br />
              de actividad
            </span>
          </div>
          <div className={styles.heroActions}>
            <ExportPdf slug={slug} month={month} brand={brandName} report={data} />
            <EnviarCorreoBoton slug={slug} month={month} brand={brandName} />
          </div>
        </div>
      </section>
      {data.warnings.map((w) => (
        <p key={w} className={styles.notice} role="status">
          {w}
        </p>
      ))}
      <section className={styles.kpis} aria-label="Resumen del periodo">
        <button type="button" className={styles.kpiButton} onClick={() => setTrend("views")}>
          <span>
            <Eye size={15} />
            Visualizaciones
          </span>
          <strong>{integer(currentViews)}</strong>
          <Change current={currentViews} previous={previousViews} />
          <small>{source}</small>
          <em><TrendingUp size={12} /> Ver crecimiento</em>
        </button>
        <button type="button" className={styles.kpiButton} onClick={() => setTrend("netFollows")}>
          <span>
            <Users size={15} />
            Seguidores actuales
          </span>
          <strong>{integer(followers)}</strong>
          <small>{source} · cifra al consultar</small>
          <small>No representa personas únicas entre redes</small>
          <em><TrendingUp size={12} /> Ver crecimiento</em>
        </button>
        <button type="button" className={styles.kpiButton} onClick={() => setTrend("spend")}>
          <span>
            <MetaLogo size={15} />
            Inversión en pauta
          </span>
          <strong>{ads ? money(ads.current.spend, ads.currency) : "—"}</strong>
          {ads && (
            <Change current={ads.current.spend} previous={ads.previous.spend} />
          )}
          <small>Meta Ads · {ads?.currency || "sin cuenta seleccionada"}</small>
          <em><TrendingUp size={12} /> Ver crecimiento</em>
        </button>
        <button type="button" className={styles.kpiButton} onClick={() => setTrend("conversations")}>
          <span>
            <MessageCircle size={15} />
            Conversaciones iniciadas
          </span>
          <strong>{integer(ads?.current.conversations ?? null)}</strong>
          {ads && (
            <Change
              current={ads.current.conversations}
              previous={ads.previous.conversations}
            />
          )}
          <small>Mensajería de anuncios</small>
          <em><TrendingUp size={12} /> Ver crecimiento</em>
        </button>
      </section>
      {trend && <TrendModal slug={slug} month={month} initial={trend} close={() => setTrend(null)} />}
      <div className={styles.heading}>
        <h2>Rendimiento por canal</h2>
        <span>Periodo actual / anterior</span>
      </div>
      <section className={styles.channels}>
        {channels.map((channel) => (
          <ChannelCard key={channel.network} channel={channel} />
        ))}
      </section>
      <p className={styles.footnote}>
        Los seguidores son el total actual. Las demás cifras corresponden al
        periodo indicado. “—” significa dato no disponible, nunca cero. El
        alcance se presenta por red: no se suma entre canales ni entre días.
      </p>
      <section className={styles.section}>
        <div className={styles.heading}>
          <h2>Orgánico y anuncios</h2>
          <span>Visualizaciones del periodo</span>
        </div>
        <div className={styles.splitGrid}>
          {channels.map((c) => {
            const available = c.organic !== null && c.paid !== null,
              sum = (c.organic || 0) + (c.paid || 0);
            return (
              <div className={styles.splitCard} key={c.network}>
                <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {c.network === "facebook" ? <FacebookLogo size={18} /> : <InstagramLogo size={18} />}
                  {names[c.network]}
                </h3>
                {available ? (
                  <>
                    <div
                      className={styles.bar}
                      role="img"
                      aria-label={`${integer(c.organic)} orgánicas y ${integer(c.paid)} de anuncios`}
                    >
                      <i
                        style={{
                          width: `${sum ? (c.organic! / sum) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <div className={styles.legend}>
                      <span>
                        ● Orgánicas <b>{integer(c.organic)}</b>
                      </span>
                      <span>
                        ● Anuncios <b>{integer(c.paid)}</b>
                      </span>
                    </div>
                  </>
                ) : (
                  <p>
                    Meta no entrega un desglose comparable para esta cuenta y
                    periodo. No se estima a partir de las impresiones de Ads.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className={styles.ads}>
        <div className={styles.heading}>
          <h2>
            <MetaLogo size={20} />
            Resultados de pauta · mensajería
          </h2>
          <span>{ads?.name || "Selecciona una cuenta publicitaria"}</span>
        </div>
        {ads ? (
          <>
            <div className={styles.adsValues}>
              <div>
                <strong>{money(ads.current.spend, ads.currency)}</strong>
                <span>Inversión · {ads.currency}</span>
              </div>
              <div>
                <strong>{integer(ads.current.conversations)}</strong>
                <span>Conversaciones iniciadas</span>
              </div>
              <div>
                <strong>
                  {money(ads.current.costPerConversation, ads.currency)}
                </strong>
                <span>Costo por conversación</span>
              </div>
            </div>
            <p>
              {ads.note ||
                "Conversaciones atribuidas por Meta a los anuncios; pueden proceder de WhatsApp, Messenger o Instagram."}{" "}
              Fechas según la cuenta publicitaria: {ads.timezone}.
            </p>
          </>
        ) : (
          <a href={`/marca/${slug}/metricas`}>Elegir cuenta →</a>
        )}
      </section>
      <section className={styles.section}>
        <div className={styles.heading}>
          <div>
            <h2>Publicaciones destacadas</h2>
            <p>Contenido publicado durante el periodo seleccionado.</p>
          </div>
          {!showPosts && (
            <button onClick={() => setShowPosts(true)}>
              Cargar publicaciones <ArrowUpRight size={16} />
            </button>
          )}
        </div>
        {showPosts ? (
          <PostCards slug={slug} month={month} />
        ) : (
          <p className={styles.footnote}>
            Consulta las mejores piezas de Facebook e Instagram con sus enlaces
            y resultados acumulados.
          </p>
        )}
      </section>
      <section className={styles.reading}>
        <h2>Lectura del periodo</h2>
        <ul>
          {channels.map((c) => (
            <li key={c.network}>
              <strong>{names[c.network]}:</strong>{" "}
              {c.current.views === null
                ? "Meta no entregó las visualizaciones de este periodo."
                : `${integer(c.current.views)} visualizaciones`}
              {c.current.views !== null &&
              c.previous.views !== null &&
              c.previous.views > 0
                ? ` (${delta(c.current.views, c.previous.views)! > 0 ? "+" : ""}${delta(c.current.views, c.previous.views)!.toFixed(1)}% frente al periodo anterior).`
                : c.current.views !== null
                  ? "; sin base comparable anterior."
                  : ""}
              {c.current.follows !== null && c.current.unfollows !== null
                ? ` Balance de seguidores: ${c.current.follows - c.current.unfollows > 0 ? "+" : ""}${(c.current.follows - c.current.unfollows).toLocaleString("es-PE")}.`
                : ""}
            </li>
          ))}
        </ul>
        <p>
          Esta lectura resume las cifras; no atribuye cambios a una campaña sin
          evidencia.
        </p>
      </section>
      <TikTokSection slug={slug} month={month} />
      <footer className={styles.footnote}>
        Consulta:{" "}
        {new Date(data.checkedAt).toLocaleString("es-PE", {
          timeZone: "America/Lima",
        })}{" "}
        · Lima. Los cortes diarios de redes siguen la zona horaria de Meta y
        pueden diferir de Ads. Se reutilizan consultas durante 5 minutos. Las
        cifras pueden cambiar por procesamiento o atribución posterior.
      </footer>
    </>
  );
}
function ChannelCard({ channel: c }: { channel: Channel }) {
  const Logo = c.network === "facebook" ? FacebookLogo : InstagramLogo;
  const rows: { key: MetricKey; label: string }[] = [
    { key: "views", label: "Visualizaciones" },
    {
      key: "reach",
      label:
        c.network === "facebook" ? "Espectadores únicos" : "Cuentas alcanzadas",
    },
    { key: "likes", label: "Me gusta" },
    { key: "interactions", label: "Interacciones" },
    ...(c.network === "instagram"
      ? [
          { key: "comments" as const, label: "Comentarios" },
          { key: "shares" as const, label: "Compartidos" },
          { key: "saves" as const, label: "Guardados" },
        ]
      : [
          { key: "reactions" as const, label: "Todas las reacciones" },
          { key: "profileVisits" as const, label: "Visitas a la página" },
        ]),
    { key: "follows", label: "Nuevos seguimientos" },
    { key: "unfollows", label: "Bajas de seguidores" },
  ];
  return (
    <article className={styles.channel}>
      <header>
        <span className={styles.networkLogo}>
          <Logo size={34} />
        </span>
        <div>
          <h3>{names[c.network]}</h3>
          <p>{c.name}</p>
        </div>
        <div className={styles.followers}>
          <strong>{integer(c.followers)}</strong>
          <small>seguidores hoy</small>
        </div>
      </header>
      <table>
        <thead>
          <tr>
            <th>Métrica</th>
            <th>Actual</th>
            <th>Anterior</th>
            <th>Cambio</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ key, label }) => (
            <tr key={key}>
              <th scope="row">{label}</th>
              <td>{integer(c.current[key])}</td>
              <td>{integer(c.previous[key])}</td>
              <td>
                <Change current={c.current[key]} previous={c.previous[key]} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {c.notes.map((note) => (
        <p className={styles.footnote} key={note}>
          {note}
        </p>
      ))}
    </article>
  );
}
function PostCards({ slug, month }: { slug: string; month: string }) {
  const { data, error } = useReport<PostReport>(slug, month, "posts");
  if (error)
    return (
      <p className={styles.notice} role="alert">
        {error}
      </p>
    );
  if (!data)
    return <p role="status">Consultando publicaciones y sus resultados…</p>;
  return (
    <div>
      {data.groups.map((group) => (
        <section key={group.network} className={styles.postGroup}>
          <h3 style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {group.network === "facebook" ? <FacebookLogo size={18} /> : <InstagramLogo size={18} />}
            {names[group.network]}
          </h3>
          <p className={styles.footnote}>{group.note}</p>
          {!group.posts.length && (
            <p>
              No hay publicaciones con métricas disponibles para esta selección.
            </p>
          )}
          <div className={styles.posts}>
            {group.posts.map((post) => (
              <article key={post.id} className={styles.post}>
                {post.image ? (
                  <div className={styles.postImage}>
                    {/* Provider CDN URLs expire; keep the text and permalink usable on failure. */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={post.image}
                      alt="Vista previa de la publicación"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>
                ) : (
                  <div className={styles.postImage}>
                    Vista previa no disponible
                  </div>
                )}
                <div className={styles.postText}>
                  <small>
                    {date(post.publishedAt.slice(0, 10))} · acumulado al
                    consultar
                  </small>
                  <p>{post.caption}</p>
                  <div className={styles.postNumbers}>
                    <span>{integer(post.views)} vistas</span>
                    <span>{integer(post.likes)} Me gusta</span>
                    {post.comments !== null && (
                      <span>{integer(post.comments)} comentarios</span>
                    )}
                  </div>
                  {post.url && (
                    <a
                      href={post.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Ver publicación <ArrowUpRight size={14} />
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
