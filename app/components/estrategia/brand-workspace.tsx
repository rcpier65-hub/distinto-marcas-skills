"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { SocialReportView } from "./social-report";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  RefreshCw,
  ArrowLeft,
  LayoutTemplate,
  Lightbulb,
  Flag,
  Copy,
  Archive,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import type { BrandPayload } from "@/lib/estrategia/load";
import {
  type StrategyRecord,
  type RecordKind,
  str,
  sheetStates,
  campaignStates,
  campaignTypes,
  byCampaign,
  safeURL,
} from "@/lib/estrategia/model";
import { MarcaLogo } from "@/components/marca-logo";
import { api, Modal, Field, Empty, Jump, Stat, PrettyDate } from "./common";
import { Agenda } from "./agenda";
import { BrandOverview } from "./brand-overview";
import { BrandMap } from "./brand-map";
import { AdsPanel } from "./ads-panel";
import { Reporte360 } from "./reporte-360";
import { designFinished } from "@/lib/estrategia/activity-status";
import "./strategy.css";

const nav = ["Resumen", "Mapa de marca", "Publicidad", "Planificación", "Campañas", "Oportunidades", "Marca"];
const kindLabel = {
  sheet: "hoja de planificación",
  campaign: "campaña",
  opportunity: "oportunidad",
  settings: "alcance del mes",
  approval: "aprobación",
};
export function BrandWorkspace({ initial }: { initial: BrandPayload }) {
  const router = useRouter(),
    [b, setB] = useState(initial),
    [calendarMonth, setCalendarMonth] = useState(initial.calendarMonth),
    [calendarLoading, setCalendarLoading] = useState(false),
    [calendarError, setCalendarError] = useState<string | null>(null),
    [tab, setTab] = useState("Resumen"),
    [sub, setSub] = useState("Contexto"),
    [campaignId, setCampaignId] = useState(""),
    [campaignTab, setCampaignTab] = useState("Resumen"),
    [editing, setEditing] = useState<StrategyRecord | null>(null),
    [busy, setBusy] = useState(false),
    [archived, setArchived] = useState(false);
  const { brand } = b,
    base = `/marca/${brand.slug}/estrategia`,
    live = b.records.filter((r) => !r.archived),
    campaigns = live.filter((r) => r.kind === "campaign"),
    sheets = b.records.filter(
      (r) => r.kind === "sheet" && r.archived === archived,
    ),
    campaign = campaigns.find((r) => r.id === campaignId);
  const month = b.today.slice(0, 7),
    scope = live.find((r) => r.kind === "settings" && r.data.month === month),
    activities = byCampaign(b.activities, b.links, campaignId),
    approvals = live.filter((r) => r.kind === "approval"),
    unapproved = approvals.filter((r) => r.data.state !== "Aprobada");
  /* "Ver reporte" de la tarjeta de redes abre la pestaña sin salir de la marca. */
  useEffect(() => {
    const abrir = (e: Event) => {
      const t = (e as CustomEvent<string>).detail;
      if (t) { setTab(t); window.scrollTo({ top: 0, behavior: "smooth" }); }
    };
    window.addEventListener("st:abrir-pestana", abrir);
    /* Vuelta desde TikTok tras conectar la cuenta → abrir Reportes. */
    const q = new URLSearchParams(window.location.search);
    if (q.get("tiktok") === "conectado") {
      window.history.replaceState(null, "", window.location.pathname);
      setTimeout(() => {
        setTab("Reportes");
        toast.success("TikTok conectado");
      }, 0);
    }
    return () => window.removeEventListener("st:abrir-pestana", abrir);
  }, []);
  useEffect(() => {
    let stopped = false,
      inFlight = false;
    const refresh = () => {
      if (document.visibilityState !== "visible" || inFlight) return;
      inFlight = true;
      setCalendarLoading(true);
      void api(`/api/estrategia?marca=${encodeURIComponent(brand.slug)}&mes=${calendarMonth}`)
        .then((x) => {
          if (!stopped) { setB(x); setCalendarError(null); }
        })
        .catch(() => { if (!stopped) setCalendarError("No se pudo actualizar la agenda. Intenta actualizar de nuevo."); })
        .finally(() => {
          inFlight = false;
          if (!stopped) setCalendarLoading(false);
        });
    };
    // Recheck cached navigation and changes made from another module or tab.
    refresh();
    const timer = setInterval(refresh, 30000);
    const events = [
      "focus",
      "online",
      "distinto-tarea-completada",
      "distinto-timer",
    ];
    events.forEach((event) => window.addEventListener(event, refresh));
    document.addEventListener("visibilitychange", refresh);
    return () => {
      stopped = true;
      clearInterval(timer);
      events.forEach((event) => window.removeEventListener(event, refresh));
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [brand.slug, calendarMonth]);
  async function reload() {
    setBusy(true);
    try {
      setB(await api(`/api/estrategia?marca=${brand.slug}&mes=${calendarMonth}`));
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function create(kind: RecordKind, extra: Record<string, unknown> = {}) {
    setEditing({
      id: crypto.randomUUID(),
      marca_id: brand.id,
      kind,
      title: "",
      data: {
        state:
          kind === "sheet"
            ? "Borrador"
            : kind === "campaign"
              ? "Propuesta"
              : kind === "approval"
                ? "Pendiente"
                : "Por evaluar",
        ownerId: b.me.id,
        ...(kind === "sheet"
          ? { workType: "Recurrente", start: b.today, end: b.today }
          : {}),
        ...extra,
      },
      revision: 0,
      archived: false,
      created_by: b.me.id,
      updated_at: new Date().toISOString(),
    });
  }
  async function save(r: StrategyRecord) {
    const saved = await api("/api/estrategia", {
      action: "save",
      slug: brand.slug,
      record: r,
    });
    setEditing(null);
    await reload();
    toast.success("Guardado");
    if (!r.revision && r.kind === "sheet")
      router.push(`${base}/hoja/${saved.id}`);
  }
  async function archive(r: StrategyRecord) {
    try {
      await save({ ...r, archived: !r.archived });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  async function duplicate(r: StrategyRecord) {
    try {
      const n = await api("/api/estrategia", { action: "duplicate", id: r.id });
      router.push(`${base}/hoja/${n.id}`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  function sheetCard(s: StrategyRecord) {
    return (
      <article className="st-card st-sheet-card" key={s.id}>
        <Link className="st-sheet-preview" href={`${base}/hoja/${s.id}`}>
          <div className="st-mini-note">
            {str(s.data, "objective") || "Objetivos por definir"}
          </div>
          <div className="st-mini-note">
            {b.links.filter((l) => l.sheet_id === s.id).length} registros
            vinculados
          </div>
          <LayoutTemplate size={24} />
        </Link>
        <div className="st-row">
          <span className="st-badge">{str(s.data, "state")}</span>
          <small>
            {b.team.find((t: any) => t.id === s.data.ownerId)?.nombre ||
              "Equipo"}
          </small>
        </div>
        <Link href={`${base}/hoja/${s.id}`}>
          <h3>{s.title}</h3>
        </Link>
        <p>
          <PrettyDate value={str(s.data, "start")} /> —{" "}
          <PrettyDate value={str(s.data, "end")} />
        </p>
        <small>
          {campaigns.find((c) => c.id === s.data.campaignId)?.title ||
            "Trabajo recurrente"}
        </small>
        <div className="st-toolbar">
          <button onClick={() => setEditing(s)}>Detalles</button>
          <button
            onClick={() => duplicate(s)}
            aria-label={`Duplicar ${s.title}`}
          >
            <Copy size={15} />
          </button>
          <button
            onClick={() => archive(s)}
            aria-label={`${s.archived ? "Restaurar" : "Archivar"} ${s.title}`}
          >
            <Archive size={15} />
            {s.archived ? "Restaurar" : ""}
          </button>
        </div>
      </article>
    );
  }
  const workList = (items: typeof activities) => (
    <div className="st-work-list">
      {items.map((a) => (
        <Link key={a.id} href={a.href}>
          <span
            className={`st-dot st-kind-${["Publicación", "Tarea", "Diseño", "Edición", "Grabación", "Reunión", "Fecha importante"].indexOf(a.kind)}`}
          />
          <div>
            <strong>{a.title}</strong>
            <small>
              {a.kind}
              {a.delivery ? " · entrega" : ""} · {a.owner}
            </small>
          </div>
          <span>
            <PrettyDate value={a.date} />
          </span>
          <span className="st-badge">{a.done ? "Terminada" : a.state}</span>
          <ExternalLink size={14} />
        </Link>
      ))}
      {!items.length && <Empty>No hay registros para esta selección.</Empty>}
    </div>
  );
  const approvalCards = (items: StrategyRecord[]) => (
    <div className="st-grid">
      {items.map((r) => (
        <article className="st-card" key={r.id}>
          <span className="st-badge">{str(r.data, "state")}</span>
          <h3>{r.title}</h3>
          <p>{str(r.data, "description")}</p>
          <small>
            {str(r.data, "waitingFor") || "Equipo"} ·{" "}
            <PrettyDate value={str(r.data, "date")} />
          </small>
          <p>{str(r.data, "evidence")}</p>
          <button onClick={() => setEditing(r)}>Revisar aprobación</button>
        </article>
      ))}
      {!items.length && <Empty>No hay aprobaciones registradas.</Empty>}
    </div>
  );
  return (
    <div className={`st-workspace ${tab === "Resumen" ? "st-overview" : ""}`}>
      <header className="st-header">
        <div className="st-row">
          <div className="st-brand">
            <MarcaLogo
              slug={brand.slug}
              nombre={brand.nombre}
              logoUrl={brand.logo_url}
              emoji={brand.emoji_marca}
              size={48}
            />
            <div>
              <small>ESPACIO DE MARCA</small>
              <h1>{brand.nombre}</h1>
            </div>
          </div>
          <div className="st-toolbar">
            <Jump href={`/grilla/${brand.slug}`}>Ver grilla</Jump>
            <button
              onClick={reload}
              disabled={busy}
              aria-label="Actualizar marca"
            >
              <RefreshCw size={16} className={busy ? "animate-spin" : ""} />
            </button>
            <button className="st-primary" onClick={() => create("sheet")}>
              <Plus size={16} />
              Nueva hoja
            </button>
          </div>
        </div>
        <nav className="st-tabs">
          {nav.map((n) => (
            <button
              key={n}
              className={tab === n ? "st-active" : ""}
              onClick={() => {
                setTab(n);
                setCampaignId("");
              }}
            >
              {n}
            </button>
          ))}
          {b.me.manager && (
            <button
              className={tab === "Reportes" ? "st-active" : ""}
              onClick={() => {
                setTab("Reportes");
                setCampaignId("");
              }}
            >
              Reportes de redes
            </button>
          )}
        </nav>
      </header>
      {b.warnings.length > 0 && (
        <div className="st-alert" role="status">
          {b.warnings.join(" ")} <button onClick={reload}>Reintentar</button>
        </div>
      )}
      <div className="st-body">
        {tab === "Reportes" && b.me.manager && (
          <SocialReportView slug={brand.slug} today={b.today} brandName={brand.nombre} />
        )}
        {tab === "Mapa de marca" && <BrandMap slug={brand.slug} brandName={brand.nombre} />}
        {tab === "Publicidad" && brand.slug === "oral-bueaty" && b.me.manager && <Reporte360 slug={brand.slug} hoy={b.today} />}
        {tab === "Publicidad" && (
          <AdsPanel slug={brand.slug} brandName={brand.nombre}
            planes={live.filter((r) => r.kind === "sheet").map((r) => ({ id: r.id, title: r.title }))} />
        )}
        {tab === "Resumen" && (
          <BrandOverview
            b={b}
            calendarMonth={calendarMonth}
            onCalendarMonthChange={setCalendarMonth}
            calendarLoading={calendarLoading}
            calendarError={calendarError}
            navigate={(next, section) => {
              setTab(next);
              if (section) setSub(section);
            }}
            edit={setEditing}
            createPlan={() => create("sheet")}
            createApproval={() => create("approval", { waitingFor: "Cliente" })}
          />
        )}
        {tab === "Planificación" && (
          <>
            <div className="st-section-title">
              <div>
                <h2>De la conversación al trabajo</h2>
                <p>
                  Piensa en el lienzo, recoge acuerdos y confirma las tareas con
                  el equipo.
                </p>
              </div>
              <div className="st-toolbar">
                <label>
                  <input
                    type="checkbox"
                    checked={archived}
                    onChange={(e) => setArchived(e.target.checked)}
                  />{" "}
                  Archivadas
                </label>
                <button className="st-primary" onClick={() => create("sheet")}>
                  <Plus size={16} />
                  Nueva hoja
                </button>
              </div>
            </div>
            <div className="st-grid">{sheets.map(sheetCard)}</div>
            {!sheets.length && (
              <Empty>
                <LayoutTemplate size={36} />
                <h3>
                  {archived
                    ? "No hay hojas archivadas"
                    : "Tu próxima estrategia empieza aquí"}
                </h3>
                <p>
                  Crea una hoja en blanco o con una estructura de reunión. Nada
                  se enviará a Tareas hasta tu confirmación.
                </p>
                <button className="st-primary" onClick={() => create("sheet")}>
                  Crear primera hoja
                </button>
              </Empty>
            )}
          </>
        )}
        {tab === "Campañas" && !campaign && (
          <>
            <div className="st-section-title">
              <div>
                <h2>Campañas</h2>
                <p>
                  Objetivos, entregables y resultados con el mismo contexto.
                </p>
              </div>
              <button className="st-primary" onClick={() => create("campaign")}>
                <Plus size={16} />
                Nueva campaña
              </button>
            </div>
            <div className="st-grid">
              {campaigns.map((c) => (
                <button
                  className="st-card st-campaign-card"
                  key={c.id}
                  onClick={() => {
                    setCampaignId(c.id);
                    setCampaignTab("Resumen");
                  }}
                >
                  <Flag size={24} />
                  <span className="st-badge">{str(c.data, "state")}</span>
                  <h3>{c.title}</h3>
                  <p>{str(c.data, "objective")}</p>
                  <small>
                    {str(c.data, "type")} ·{" "}
                    <PrettyDate value={str(c.data, "start")} /> —{" "}
                    <PrettyDate value={str(c.data, "end")} />
                  </small>
                </button>
              ))}
            </div>
            {!campaigns.length && (
              <Empty>
                Aún no hay campañas. También puedes planificar trabajo
                recurrente sin crear una.
              </Empty>
            )}
          </>
        )}
        {tab === "Campañas" && campaign && (
          <>
            <button onClick={() => setCampaignId("")}>
              <ArrowLeft size={16} />
              Todas las campañas
            </button>
            <div className="st-section-title">
              <div>
                <span className="st-badge">{str(campaign.data, "state")}</span>
                <h2>{campaign.title}</h2>
                <p>{str(campaign.data, "objective")}</p>
              </div>
              <button onClick={() => setEditing(campaign)}>
                Editar campaña
              </button>
            </div>
            <nav className="st-tabs">
              {[
                "Resumen",
                "Entregables",
                "Aprobaciones",
                "Agenda",
                "Resultados",
              ].map((t) => (
                <button
                  className={campaignTab === t ? "st-active" : ""}
                  key={t}
                  onClick={() => setCampaignTab(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
            {campaignTab === "Resumen" && (
              <>
                <div className="st-stats">
                  <Stat
                    label="Entregables vinculados"
                    value={
                      new Set(
                        activities.map((a) => a.source + ":" + a.sourceId),
                      ).size
                    }
                  />
                  <Stat
                    label="Aprobaciones pendientes"
                    value={
                      unapproved.filter(
                        (a) => a.data.campaignId === campaign.id,
                      ).length
                    }
                  />
                  <Stat
                    label="Objetivo medible"
                    value={str(campaign.data, "metric") || "Por definir"}
                    detail={str(campaign.data, "target")}
                  />
                </div>
                <div className="st-two">
                  <section className="st-card">
                    <h3>Concepto y público</h3>
                    <p>
                      {str(campaign.data, "concept") || "Sin concepto definido"}
                    </p>
                    <p>{str(campaign.data, "audience")}</p>
                    <small>Producto o servicio</small>
                    <p>{str(campaign.data, "offer")}</p>
                    <small>Presupuesto de anuncios</small>
                    <p>
                      {campaign.data.paid
                        ? `${campaign.data.adBudget ?? 0} ${str(campaign.data, "currency") || "PEN"} · ${campaign.data.budgetApproved ? "Aprobado" : "Pendiente de aprobación"}`
                        : "Sin pauta definida"}
                    </p>
                    <small>
                      La inversión publicitaria se registra separada de los
                      honorarios y la producción.
                    </small>
                  </section>
                  <section className="st-card">
                    <h3>Hojas de trabajo</h3>
                    {live
                      .filter(
                        (s) =>
                          s.kind === "sheet" &&
                          s.data.campaignId === campaign.id,
                      )
                      .map((s) => (
                        <Jump key={s.id} href={`${base}/hoja/${s.id}`}>
                          {s.title}
                        </Jump>
                      ))}
                    <button
                      onClick={() =>
                        create("sheet", {
                          campaignId: campaign.id,
                          workType: "Campaña",
                        })
                      }
                    >
                      Crear hoja para esta campaña
                    </button>
                  </section>
                </div>
              </>
            )}
            {campaignTab === "Entregables" && (
              <>
                <LinkExisting b={b} campaignId={campaign.id} reload={reload} />
                {workList(activities)}
              </>
            )}
            {campaignTab === "Aprobaciones" && (
              <>
                <div className="st-toolbar">
                  <button
                    className="st-primary"
                    onClick={() =>
                      create("approval", {
                        campaignId: campaign.id,
                        waitingFor: "Cliente",
                      })
                    }
                  >
                    Solicitar aprobación
                  </button>
                </div>
                {approvalCards(
                  approvals.filter((a) => a.data.campaignId === campaign.id),
                )}
              </>
            )}
            {campaignTab === "Agenda" && <Agenda activities={activities} month={calendarMonth} onMonthChange={setCalendarMonth} syncing={calendarLoading} error={calendarError} />}
            {campaignTab === "Resultados" && (
              <Results campaign={campaign} edit={() => setEditing(campaign)} />
            )}
          </>
        )}
        {tab === "Oportunidades" && (
          <>
            <div className="st-section-title">
              <div>
                <h2>Oportunidades e hipótesis</h2>
                <p>
                  Una observación con su fuente antes de convertirla en una
                  propuesta.
                </p>
              </div>
              <button
                className="st-primary"
                onClick={() => create("opportunity")}
              >
                <Plus size={16} />
                Nueva oportunidad
              </button>
            </div>
            <div className="st-grid">
              {live
                .filter((r) => r.kind === "opportunity")
                .map((r) => (
                  <article className="st-card" key={r.id}>
                    <Lightbulb size={24} />
                    <span className="st-badge">{str(r.data, "state")}</span>
                    <h3>{r.title}</h3>
                    <p>{str(r.data, "description")}</p>
                    <blockquote>{str(r.data, "evidence")}</blockquote>
                    <p>
                      <strong>Hipótesis:</strong>{" "}
                      {str(r.data, "hypothesis") || "Por evaluar"}
                    </p>
                    {safeURL(r.data.url) && (
                      <a
                        href={safeURL(r.data.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Consultar fuente ↗
                      </a>
                    )}
                    <div className="st-toolbar">
                      <button onClick={() => setEditing(r)}>Revisar</button>
                      <button
                        onClick={() =>
                          create("campaign", {
                            objective: str(r.data, "hypothesis"),
                            opportunityId: r.id,
                          })
                        }
                      >
                        Proponer campaña
                      </button>
                      <button
                        onClick={() =>
                          create("sheet", {
                            opportunityId: r.id,
                            objective: str(r.data, "hypothesis"),
                          })
                        }
                      >
                        Llevar a una hoja
                      </button>
                    </div>
                  </article>
                ))}
            </div>
            {!live.some((r) => r.kind === "opportunity") && (
              <Empty>
                Registra una observación del cliente, una tendencia o un
                resultado. Identifica siempre la fuente y qué falta validar.
              </Empty>
            )}
          </>
        )}
        {tab === "Marca" && (
          <>
            <nav className="st-tabs">
              {["Contexto", "Alcance del mes", "Biblioteca"].map((t) => (
                <button
                  key={t}
                  className={sub === t ? "st-active" : ""}
                  onClick={() => setSub(t)}
                >
                  {t}
                </button>
              ))}
            </nav>
            {sub === "Contexto" && <Context b={b} />}
            {sub === "Alcance del mes" && (
              <>
                <div className="st-section-title">
                  <div>
                    <h2>Compromisos y avance</h2>
                    <p>
                      El alcance se confirma por mes. Cada tipo de entrega
                      conserva su unidad.
                    </p>
                  </div>
                  {b.me.manager && (
                    <button
                      className="st-primary"
                      onClick={() =>
                        scope
                          ? setEditing(scope)
                          : create("settings", {
                              month,
                              objective: "",
                              scopeSource: "",
                              sessions: 0,
                              videos: 0,
                              designs: 0,
                              adaptations: 0,
                            })
                      }
                    >
                      Definir alcance
                    </button>
                  )}
                </div>
                <section className="st-card">
                  <h3>
                    {str(scope?.data || {}, "objective") ||
                      "Alcance pendiente de confirmar"}
                  </h3>
                  <p>
                    {str(scope?.data || {}, "scopeSource") ||
                      "Vincula la referencia del acuerdo con el cliente. Una propuesta en borrador no confirma el contrato."}
                  </p>
                  <small>
                    Periodo: {str(scope?.data || {}, "month") || month} ·{" "}
                    {scope?.data.confirmed
                      ? "Confirmado por dirección"
                      : "Sin confirmar"}
                  </small>
                  <div className="st-stats">
                    {[
                      ["sessions", "Sesiones de grabación"],
                      ["videos", "Videos"],
                      ["designs", "Diseños"],
                      ["adaptations", "Adaptaciones"],
                    ].map(([key, label]) => {
                      const period = str(scope?.data || {}, "month") || month;
                      const actual =
                        key === "sessions"
                          ? (b.recordings ?? []).filter((r: any) =>
                              r.fecha_real?.startsWith(period),
                            ).length
                          : key === "videos"
                            ? (b.publications ?? []).filter(
                                (p: any) =>
                                  !p.es_tarea_diseno &&
                                  p.editado &&
                                  p.fecha_edicion?.startsWith(period),
                              ).length
                            : key === "designs"
                              ? (b.publications ?? []).filter(
                                  (p: any) =>
                                    p.es_tarea_diseno &&
                                    designFinished(p) &&
                                    (
                                      p.diseno_terminado_at ||
                                      p.fecha_entrega ||
                                      p.fecha_diseno
                                    )?.startsWith(period),
                                ).length
                              : null;
                      return (
                        <Stat
                          key={key}
                          label={label}
                          value={`${actual === null ? "Sin registro" : actual} / ${scope?.data.confirmed ? (scope.data[key] ?? "—") : "—"}`}
                          detail={
                            actual === null
                              ? "Registra la unidad en origen"
                              : "Realizado / comprometido"
                          }
                        />
                      );
                    })}
                  </div>
                  <p className="st-muted">
                    Grabaciones en la agenda del mes: {b.activities.filter(a => a.kind === "Grabación" && a.date?.startsWith(month)).length}. Una cita de Google requiere confirmar su realización para contar como realizada. Las cantidades no se suman entre unidades. El avance usa las
                    fechas registradas en cada módulo.
                  </p>
                </section>
                {approvalCards(approvals.filter((r) => !r.data.campaignId))}
              </>
            )}
            {sub === "Biblioteca" && (
              <>
                <div className="st-two">
                  <section className="st-card">
                    <h2>Materiales de la marca</h2>
                    {safeURL(brand.drive_url) ? (
                      <a
                        className="st-primary"
                        target="_blank"
                        rel="noopener noreferrer"
                        href={safeURL(brand.drive_url)}
                      >
                        Abrir carpeta de Drive ↗
                      </a>
                    ) : (
                      <p>
                        La marca todavía no tiene una carpeta de Drive
                        vinculada.
                      </p>
                    )}
                    <Jump href={`/marca/${brand.slug}`}>
                      Datos y recursos de la marca
                    </Jump>
                  </section>
                  <section className="st-card">
                    <h2>Fuentes de contexto</h2>
                    {(b.profile?.data?.sources || []).map((s: any) => (
                      <div className="st-attention" key={s.id}>
                        <strong>{s.name}</strong>
                        <small>
                          {s.verified ? "Verificada" : "Por validar"} · {s.kind}
                        </small>
                        {safeURL(s.url) && (
                          <a
                            href={safeURL(s.url)}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Abrir fuente ↗
                          </a>
                        )}
                      </div>
                    ))}
                  </section>
                </div>
                <section className="st-card">
                  <h2>Notas y reuniones</h2>
                  {b.notes.map((n: any) => (
                    <div className="st-attention" key={n.id}>
                      <Jump href={`/notas-reuniones/${n.id}`}>{n.titulo}</Jump>
                      <p>{n.resumen?.slice(0, 240)}</p>
                    </div>
                  ))}
                  {!b.notes.length && (
                    <Empty>
                      No hay notas visibles vinculadas a esta marca.
                    </Empty>
                  )}
                </section>
              </>
            )}
          </>
        )}
        <footer className="st-footer">
          <CheckCircle2 size={14} /> Datos de los módulos de la app ·
          actualización cada 30 s · {b.today} · hora de Lima
        </footer>
      </div>
      {editing && (
        <RecordEditor
          record={editing}
          b={b}
          close={() => setEditing(null)}
          save={save}
        />
      )}
    </div>
  );
}

function LinkExisting({
  b,
  campaignId,
  reload,
}: {
  b: BrandPayload;
  campaignId: string;
  reload: () => Promise<void>;
}) {
  const [id, setId] = useState(""),
    [busy, setBusy] = useState(false),
    items = [
      ...new Map(
        b.activities.filter(a => a.source !== "calendar").map((a) => [a.source + ":" + a.sourceId, a]),
      ).values(),
    ];
  async function link() {
    const a = items.find((a) => a.id === id);
    if (!a) return;
    setBusy(true);
    try {
      await api("/api/estrategia", {
        action: "link",
        slug: b.brand.slug,
        campaignId,
        targetType: a.source,
        targetId: a.sourceId,
      });
      await reload();
      setId("");
      toast.success("Vinculado sin duplicar el trabajo");
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="st-toolbar">
      <select
        aria-label="Trabajo existente"
        value={id}
        onChange={(e) => setId(e.target.value)}
      >
        <option value="">Vincular trabajo existente…</option>
        {items.map((a) => (
          <option key={a.id} value={a.id}>
            {a.kind} · {a.title}
          </option>
        ))}
      </select>
      <button onClick={link} disabled={!id || busy}>
        Vincular a la campaña
      </button>
    </div>
  );
}
function Context({ b }: { b: BrandPayload }) {
  const p = b.profile?.data || {};
  return (
    <section className="st-card">
      <div className="st-row">
        <div>
          <h2>Contexto compartido de {b.brand.nombre}</h2>
          <p>La misma información que utiliza Creación de Ideas.</p>
        </div>
        <Jump href={`/creacion-de-ideas?marca=${b.brand.id}`}>
          Editar contexto
        </Jump>
      </div>
      <div className="st-two">
        {[
          ["positioning", "Posicionamiento"],
          ["audience", "Público"],
          ["tone", "Tono de voz"],
          ["offer", "Oferta"],
          ["mandatory", "Lo que siempre debemos incluir"],
          ["avoid", "Lo que debemos evitar"],
        ].map(([k, label]) => (
          <div className="st-context-field" key={k}>
            <small>{label}</small>
            <p>{p[k] || "Por completar"}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
function Results({
  campaign,
  edit,
}: {
  campaign: StrategyRecord;
  edit: () => void;
}) {
  const d = campaign.data,
    services = d.businessType !== "ecommerce";
  return (
    <section className="st-card">
      <div className="st-row">
        <div>
          <h2>Resultados de la campaña</h2>
          <p>
            {services
              ? "Consultas, citas y servicios contratados"
              : "Consultas, pedidos y ventas"}
          </p>
        </div>
        <button onClick={edit}>Cargar resultados</button>
      </div>
      <div className="st-stats">
        {[
          ["messages", "Consultas por WhatsApp"],
          ["appointments", services ? "Citas agendadas" : "Pedidos"],
          ["attended", services ? "Citas atendidas" : "Pedidos entregados"],
          [
            "conversions",
            services ? "Servicios contratados" : "Ventas confirmadas",
          ],
        ].map(([k, label]) => (
          <Stat
            key={k}
            label={label}
            value={
              d[k] === undefined || d[k] === "" ? "Sin datos" : String(d[k])
            }
          />
        ))}
      </div>
      <p>
        <strong>Fuente declarada:</strong>{" "}
        {str(d, "metricSource") || "Pendiente de cargar"}
      </p>
      <p>
        Periodo medido: <PrettyDate value={str(d, "metricStart")} /> —{" "}
        <PrettyDate value={str(d, "metricEnd")} />
      </p>
      <p className="st-muted">
        Registro manual. No atribuye ventas automáticamente a anuncios ni cuenta
        las reuniones de la agencia como citas comerciales del cliente.
      </p>
      {safeURL(d.metricURL) && (
        <a
          href={safeURL(d.metricURL)}
          target="_blank"
          rel="noopener noreferrer"
        >
          Consultar evidencia ↗
        </a>
      )}
    </section>
  );
}

function RecordEditor({
  record,
  b,
  save,
  close,
}: {
  record: StrategyRecord;
  b: BrandPayload;
  save: (r: StrategyRecord) => Promise<void>;
  close: () => void;
}) {
  const [r, setR] = useState(record),
    [busy, setBusy] = useState(false),
    [err, setErr] = useState(""),
    d = r.data,
    k = r.kind;
  const set = (key: string, v: unknown) =>
    setR({ ...r, data: { ...d, [key]: v } });
  const text = (key: string, label: string, multi = false) => (
    <Field label={label} key={key}>
      {multi ? (
        <textarea
          rows={3}
          value={str(d, key)}
          onChange={(e) => set(key, e.target.value)}
        />
      ) : (
        <input value={str(d, key)} onChange={(e) => set(key, e.target.value)} />
      )}
    </Field>
  );
  const date = (key: string, label: string) => (
    <Field label={label}>
      <input
        type="date"
        value={str(d, key)}
        onChange={(e) => set(key, e.target.value)}
      />
    </Field>
  );
  const num = (key: string, label: string) => (
    <Field label={label} key={key}>
      <input
        type="number"
        min="0"
        step="any"
        value={typeof d[key] === "number" ? (d[key] as number) : ""}
        onChange={(e) =>
          set(key, e.target.value === "" ? "" : Number(e.target.value))
        }
      />
    </Field>
  );
  const sel = (key: string, label: string, values: readonly string[]) => (
    <Field label={label}>
      <select value={str(d, key)} onChange={(e) => set(key, e.target.value)}>
        <option value="">Seleccionar</option>
        {values.map((v) => (
          <option key={v}>{v}</option>
        ))}
      </select>
    </Field>
  );
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await save(r);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={`${r.revision ? "Editar" : "Nueva"} ${kindLabel[k]}`}
      close={close}
    >
      <form className="st-form" onSubmit={submit}>
        <Field label="Nombre">
          <input
            autoFocus
            required
            maxLength={180}
            value={r.title}
            onChange={(e) => setR({ ...r, title: e.target.value })}
          />
        </Field>
        {k !== "settings" && (
          <Field label="Responsable">
            <select
              value={str(d, "ownerId")}
              onChange={(e) => set("ownerId", e.target.value)}
            >
              {b.team.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </select>
          </Field>
        )}
        {k === "sheet" && (
          <>
            {sel("state", "Estado", sheetStates)}
            <Field label="Campaña o trabajo recurrente">
              <select
                value={str(d, "campaignId")}
                onChange={(e) =>
                  setR({
                    ...r,
                    data: {
                      ...d,
                      campaignId: e.target.value,
                      workType: e.target.value ? "Campaña" : "Recurrente",
                    },
                  })
                }
              >
                <option value="">Trabajo recurrente</option>
                {b.records
                  .filter((c) => c.kind === "campaign" && !c.archived)
                  .map((c) => (
                    <option value={c.id} key={c.id}>
                      {c.title}
                    </option>
                  ))}
              </select>
            </Field>
            {text("objective", "Objetivo de la hoja", true)}
            {text("description", "Plan de trabajo y prioridades", true)}
            <div className="st-two">
              {date("start", "Periodo de planificación · inicio")}
              {date("end", "Fin del periodo")}
              {date("meetingDate", "Fecha de la reunión")}
            </div>
            <Field label="Participantes">
              <div className="st-checks">
                {b.team.map((m: any) => (
                  <label key={m.id}>
                    <input
                      type="checkbox"
                      checked={
                        Array.isArray(d.participants) &&
                        d.participants.includes(m.id)
                      }
                      onChange={(e) =>
                        set(
                          "participants",
                          e.target.checked
                            ? [
                                ...(Array.isArray(d.participants)
                                  ? d.participants
                                  : []),
                                m.id,
                              ]
                            : (Array.isArray(d.participants)
                                ? d.participants
                                : []
                              ).filter((x) => x !== m.id),
                        )
                      }
                    />
                    {m.nombre}
                  </label>
                ))}
              </div>
            </Field>
            {!r.revision &&
              sel("template", "Inicio del lienzo", [
                "En blanco",
                "Reunión de estrategia",
              ])}
            <Field
              label="Compartir con el cliente"
              hint="Solo el lienzo y los comentarios marcados como compartidos serán visibles. Las sesiones y los acuerdos internos permanecen privados."
            >
              <label>
                <input
                  type="checkbox"
                  checked={d.sharedWithClient === true}
                  onChange={(e) => set("sharedWithClient", e.target.checked)}
                />
                Permitir acceso desde su portal
              </label>
            </Field>
            {d.sharedWithClient === true && r.revision > 0 && (
              <Jump href={`/cliente/planificacion/${r.id}`}>
                Abrir enlace compartido
              </Jump>
            )}
          </>
        )}
        {k === "campaign" && (
          <>
            {sel("state", "Estado", campaignStates)}
            {sel("type", "Tipo de campaña", campaignTypes)}
            {text("objective", "Objetivo", true)}
            {text("offer", "Producto o servicio")}
            {text("audience", "Público objetivo", true)}
            {text("concept", "Concepto creativo", true)}
            <div className="st-two">
              {date("start", "Inicio")}
              {date("end", "Fin")}
              {text("metric", "Indicador principal")}
              {text("target", "Meta")}
            </div>
            <label>
              <input
                type="checkbox"
                checked={d.priority === true}
                onChange={(e) => set("priority", e.target.checked)}
              />{" "}
              Campaña prioritaria
            </label>
            <label>
              <input
                type="checkbox"
                checked={d.paid === true}
                onChange={(e) => set("paid", e.target.checked)}
              />{" "}
              Incluye publicidad pagada
            </label>
            {d.paid === true && (
              <>
                <div className="st-two">
                  {num("adBudget", "Inversión en anuncios")}
                  {sel("currency", "Moneda", ["PEN", "USD"])}
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={d.budgetApproved === true}
                    onChange={(e) => set("budgetApproved", e.target.checked)}
                  />
                  Presupuesto aprobado por el cliente
                </label>
                {text("budgetEvidence", "Referencia de la aprobación")}
              </>
            )}
            <details>
              <summary>Resultados y evidencia</summary>
              {sel("businessType", "Tipo de negocio", [
                "servicios",
                "ecommerce",
              ])}
              <div className="st-two">
                {num("messages", "Consultas por WhatsApp")}
                {num(
                  "appointments",
                  d.businessType === "ecommerce"
                    ? "Pedidos"
                    : "Citas agendadas",
                )}
                {num(
                  "attended",
                  d.businessType === "ecommerce"
                    ? "Pedidos entregados"
                    : "Citas atendidas",
                )}
                {num(
                  "conversions",
                  d.businessType === "ecommerce"
                    ? "Ventas"
                    : "Servicios contratados",
                )}
                {date("metricStart", "Medición desde")}
                {date("metricEnd", "Medición hasta")}
              </div>
              {text("metricSource", "Fuente de los datos")}
              {text("metricURL", "Enlace de evidencia")}
            </details>
          </>
        )}
        {k === "opportunity" && (
          <>
            {sel("state", "Estado", ["Por evaluar", "Validada", "Descartada"])}
            {text("description", "Qué observamos", true)}
            {text("evidence", "Evidencia o cita de la fuente", true)}
            {text("url", "Enlace de la fuente")}
            {date("sourceDate", "Fecha de la observación")}
            {text("hypothesis", "Hipótesis que queremos validar", true)}
          </>
        )}
        {k === "approval" && (
          <>
            {sel("state", "Estado", [
              "Pendiente",
              "En revisión",
              "Cambios solicitados",
              "Aprobada",
            ])}
            {sel("waitingFor", "Esperamos respuesta de", [
              "Cliente",
              "Equipo",
              "Dirección",
            ])}
            {text("description", "Qué necesitamos y qué bloquea", true)}
            {date("date", "Fecha necesaria")}
            {text("evidence", "Referencia de la respuesta o aprobación", true)}
            <label>
              <input
                type="checkbox"
                checked={d.critical !== false}
                onChange={(e) => set("critical", e.target.checked)}
              />
              Bloquea la activación de la campaña
            </label>
            <p className="st-muted">
              Registrar la aprobación no envía un correo ni un mensaje al
              cliente.
            </p>
          </>
        )}
        {k === "settings" && (
          <>
            <Field label="Mes">
              <input
                type="month"
                required
                value={str(d, "month")}
                onChange={(e) => set("month", e.target.value)}
              />
            </Field>
            {text("objective", "Objetivo del mes", true)}
            {text(
              "scopeSource",
              "Referencia del contrato o acuerdo confirmado",
              true,
            )}
            <div className="st-two">
              {num("sessions", "Sesiones de grabación")}
              {num("videos", "Videos")}
              {num("designs", "Diseños")}
              {num("adaptations", "Adaptaciones")}
            </div>
            <label>
              <input
                type="checkbox"
                checked={d.confirmed === true}
                onChange={(e) => set("confirmed", e.target.checked)}
              />
              Confirmo el alcance acordado para este mes
            </label>
          </>
        )}
        {err && (
          <p className="st-error" role="alert">
            {err}
          </p>
        )}
        <div className="st-toolbar">
          <button type="button" onClick={close}>
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="st-primary">
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
