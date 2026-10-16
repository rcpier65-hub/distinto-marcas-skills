"use client";
import { useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Clock3,
  Flag,
  Lightbulb,
  ListChecks,
  MessageCircle,
  TriangleAlert,
  Users,
  Video,
} from "lucide-react";
import type { BrandPayload } from "@/lib/estrategia/load";
import {
  str,
  type Activity,
  type StrategyRecord,
} from "@/lib/estrategia/model";
import {
  operational,
  periodWork,
  DEFAULT_WORK_PERIOD,
  type WorkPeriod,
} from "@/lib/estrategia/activity-status";
import { Modal, PrettyDate, Empty } from "./common";
import { Agenda } from "./agenda";
import { ExistingWork, workKinds } from "./existing-work";
import { SocialCard } from "./social-card";

type BrandObservation = {
  id: string;
  atendida: boolean;
  autor_nombre: string;
  texto: string;
};
type BrandMember = { id: string; nombre: string; rol: string };

type Detail =
  | "work"
  | "calendar"
  | "attention"
  | "client"
  | "team"
  | "changes"
  | null;
export function BrandOverview({
  b,
  navigate,
  edit,
  createPlan,
  createApproval,
  calendarMonth, onCalendarMonthChange, calendarLoading, calendarError,
}: {
  b: BrandPayload;
  calendarMonth: string;
  onCalendarMonthChange: (month: string) => void;
  calendarLoading: boolean;
  calendarError: string | null;
  navigate: (tab: string, sub?: string) => void;
  edit: (r: StrategyRecord) => void;
  createPlan: () => void;
  createApproval: () => void;
}) {
  const [detail, setDetail] = useState<Detail>(null),
    [period, setPeriod] = useState<WorkPeriod>(DEFAULT_WORK_PERIOD);
  const [detailPeriod, setDetailPeriod] =
    useState<WorkPeriod>(DEFAULT_WORK_PERIOD);
  const [workKind, setWorkKind] = useState(""),
    [includeDone, setIncludeDone] = useState(false);
  const live = b.records.filter((r) => !r.archived),
    month = b.today.slice(0, 7);
  const scope = live.find(
    (r) => r.kind === "settings" && r.data.month === month,
  );
  const plan = live.find(
    (r) => r.kind === "sheet" && (!r.data.end || String(r.data.end) >= b.today),
  );
  const pending = b.activities.filter((a) => operational(a) && !a.done);
  const late = pending.filter(
    (a) => a.date && a.date.startsWith(month) && a.date < b.today,
  );
  const approvals = live.filter(
    (r) => r.kind === "approval" && r.data.state !== "Aprobada",
  );
  const observations = ((b.observations || []) as BrandObservation[]).filter(
    (o) => !o.atendida,
  );
  const team = b.team as BrandMember[];
  const client = approvals.filter((r) => r.data.waitingFor === "Cliente");
  const published = b.activities.filter(
    (a) => a.kind === "Publicación" && a.done && a.date?.startsWith(month),
  );
  const soon = b.activities
    .filter(
      (a) =>
        a.date &&
        a.date >= b.today &&
        !a.done &&
        !["cancelada", "cancelado"].includes(a.state.toLowerCase()),
    )
    .sort((a, c) =>
      `${a.date}${a.time || ""}`.localeCompare(`${c.date}${c.time || ""}`),
    );
  const meeting = soon.find((a) => a.kind === "Reunión");
  const linked = plan
    ? b.activities.filter((a) =>
        b.links.some(
          (l) =>
            l.sheet_id === plan.id &&
            l.target_id === a.sourceId &&
            l.target_type === a.source,
        ),
      )
    : [];
  const campaigns = live.filter(
    (r) => r.kind === "campaign" && r.data.state !== "Cerrada",
  );
  const opportunities = live.filter(
    (r) =>
      r.kind === "opportunity" &&
      !["Descartada", "Implementada"].includes(str(r.data, "state")),
  );
  const work = periodWork(b.activities, b.today, detailPeriod)
    .filter(
      (a) => (!workKind || a.kind === workKind) && (includeDone || !a.done),
    )
    .sort(
      (a, c) =>
        Number(a.done) - Number(c.done) ||
        (a.date || "9999").localeCompare(c.date || "9999"),
    );
  const monthLabel = new Date(`${month}-15T12:00:00`).toLocaleDateString(
    "es-PE",
    { month: "long", year: "numeric" },
  );
  function openWork(kind = "", nextPeriod = period) {
    setWorkKind(kind);
    setDetailPeriod(nextPeriod);
    setIncludeDone(false);
    setDetail("work");
  }
  const activityList = (items: Activity[]) => (
    <div className="st-dash-detail-list">
      {items.map((a) => (
        <Link key={a.id} href={a.href}>
          <span className="st-detail-item-copy">
            <small>
              {a.kind} · {a.owner}
            </small>
            <strong>{a.title}</strong>
          </span>
          <span>
            {a.kind === "Tarea" && "Entrega: "}
            <PrettyDate value={a.date} />
            {a.time ? ` · ${a.time.slice(0, 5)}` : ""}
            {a.kind === "Tarea" && a.createdDate && (
              <small>Creada: <PrettyDate value={a.createdDate} /></small>
            )}
            <small className={a.done ? "st-done" : ""}>
              {a.done ? "Terminada" : a.state.replaceAll("_", " ")}
            </small>
          </span>
          <ArrowUpRight size={15} />
        </Link>
      ))}
      {!items.length && <Empty>No hay registros en esta selección.</Empty>}
    </div>
  );
  const titles = {
    work: "Trabajo de la marca",
    calendar: "Calendario de la marca",
    attention: "Pendientes que requieren atención",
    client: "Aprobaciones y comentarios del cliente",
    team: "Equipo con acceso a la marca",
    changes: "Últimas decisiones y cambios",
  };
  return (
    <>
      <div className="st-dashboard" aria-label="Resumen de la marca">
        <div className="st-dashboard-top">
          <section className="st-card st-dash-focus">
            <div className="st-row">
              <span className="st-eyebrow">FOCO DEL MES</span>
              <button
                className="st-text-button"
                onClick={() => navigate("Marca", "Alcance del mes")}
              >
                Alcance {scope?.data.confirmed ? "confirmado" : "por confirmar"}{" "}
                <ChevronRight size={13} />
              </button>
            </div>
            <h2 title={str(scope?.data || {}, "objective")}>
              {str(scope?.data || {}, "objective") ||
                "Define el objetivo de este mes"}
            </h2>
            <div className="st-dash-plan-row">
              {plan ? (
                <>
                  <span title={plan.title}>
                    {plan.title} · {linked.filter((a) => a.done).length}/
                    {linked.length} actividades listas
                  </span>
                  <Link
                    href={`/marca/${b.brand.slug}/estrategia/hoja/${plan.id}`}
                  >
                    Abrir plan y lienzo <ArrowUpRight size={14} />
                  </Link>
                </>
              ) : (
                <>
                  <span>Organiza las prioridades de la marca.</span>
                  <button className="st-text-button" onClick={createPlan}>
                    Crear plan <ArrowUpRight size={14} />
                  </button>
                </>
              )}
            </div>
          </section>
          <SocialCard
            key={b.brand.slug}
            slug={b.brand.slug}
            manager={b.me.manager}
            compact
          />
        </div>
        <div className="st-dashboard-stats">
          <button
            onClick={() => {
              openWork("Publicación", "mes");
              setIncludeDone(true);
            }}
          >
            <span className="st-kpi-icon st-kpi-green">
              <ListChecks size={18} />
            </span>
            <span>
              <small>Publicadas este mes</small>
              <strong>{published.length}</strong>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button onClick={() => openWork("", "semana")}>
            <span className="st-kpi-icon">
              <CalendarDays size={18} />
            </span>
            <span>
              <small>Pendientes esta semana</small>
              <strong>
                {
                  periodWork(b.activities, b.today, "semana").filter(
                    (a) => !a.done,
                  ).length
                }
              </strong>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button onClick={() => openWork("", "sinfecha")}>
            <span className="st-kpi-icon st-kpi-blue">
              <Clock3 size={18} />
            </span>
            <span>
              <small>Sin fecha asignada</small>
              <strong>{pending.filter((a) => !a.date).length}</strong>
            </span>
            <ArrowUpRight size={14} />
          </button>
          <button onClick={() => setDetail("attention")}>
            <span className="st-kpi-icon st-kpi-amber">
              <TriangleAlert size={18} />
            </span>
            <span>
              <small>Requieren atención</small>
              <strong>
                {late.length + approvals.length + observations.length}
              </strong>
            </span>
            <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="st-dashboard-main">
          <ExistingWork
            activities={b.activities}
            today={b.today}
            period={period}
            setPeriod={setPeriod}
            open={openWork}
          />
          <section className="st-card st-dash-agenda">
            <div className="st-row st-dash-heading">
              <h2>Agenda próxima</h2>
              <button
                className="st-text-button"
                onClick={() => setDetail("calendar")}
                aria-label="Abrir calendario completo"
              >
                <CalendarDays size={15} /> Ver calendario
              </button>
            </div>
            <div className="st-next-events">
              {soon.slice(0, 3).map((a) => (
                <Link key={a.id} href={a.href}>
                  <span className="st-next-day">
                    <b>{Number(a.date?.slice(8, 10))}</b>
                    <small>
                      {new Date(`${a.date}T12:00:00`).toLocaleDateString(
                        "es-PE",
                        { month: "short" },
                      )}
                    </small>
                  </span>
                  <span className="st-next-copy">
                    <strong title={a.title}>{a.title}</strong>
                    <small>
                      {a.kind} · {a.time?.slice(0, 5) || a.owner}
                    </small>
                  </span>
                  <ChevronRight size={14} />
                </Link>
              ))}
              {!soon.length && (
                <p className="st-quiet-empty">
                  Sin actividades próximas programadas.
                </p>
              )}
            </div>
            <button
              className="st-next-meeting"
              onClick={() => setDetail("calendar")}
            >
              <Video size={17} />
              <span>
                <small>Próxima reunión</small>
                <strong title={meeting?.title}>
                  {meeting ? (
                    <>
                      <PrettyDate value={meeting.date} /> ·{" "}
                      {meeting.time?.slice(0, 5)} · {meeting.title}
                    </>
                  ) : (
                    "Por programar"
                  )}
                </strong>
              </span>
              <ChevronRight size={14} />
            </button>
          </section>
        </div>
        <div className="st-dashboard-bottom">
          <button
            className={
              client.length + observations.length ? "st-needs-attention" : ""
            }
            onClick={() => setDetail("client")}
          >
            <MessageCircle size={16} />
            <span>
              Cliente <b>{client.length + observations.length}</b>
            </span>
            <ChevronRight size={13} />
          </button>
          <button onClick={() => navigate("Campañas")}>
            <Flag size={16} />
            <span>
              Campañas <b>{campaigns.length}</b>
            </span>
            <ChevronRight size={13} />
          </button>
          <button onClick={() => navigate("Oportunidades")}>
            <Lightbulb size={16} />
            <span>
              Oportunidades <b>{opportunities.length}</b>
            </span>
            <ChevronRight size={13} />
          </button>
          <button onClick={() => setDetail("team")}>
            <Users size={16} />
            <span>
              Equipo <b>{team.length}</b>
            </span>
            <ChevronRight size={13} />
          </button>
          <button onClick={() => setDetail("changes")}>
            <Clock3 size={16} />
            <span>Actividad</span>
            <ChevronRight size={13} />
          </button>
        </div>
        <span className="sr-only">
          Resumen de {monthLabel}. Los detalles se abren desde cada indicador.
        </span>
      </div>
      {detail && (
        <Modal title={titles[detail]} close={() => setDetail(null)}>
          <div
            className={`st-dash-detail ${detail === "calendar" ? "st-calendar-detail" : ""}`}
          >
            {detail === "work" && (
              <>
                <div className="st-toolbar">
                  <select
                    aria-label="Área del detalle"
                    value={workKind}
                    onChange={(e) => setWorkKind(e.target.value)}
                  >
                    <option value="">Todas las áreas</option>
                    {workKinds.map((k) => (
                      <option key={k.kind} value={k.kind}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Periodo del detalle"
                    value={detailPeriod}
                    onChange={(e) =>
                      setDetailPeriod(e.target.value as WorkPeriod)
                    }
                  >
                    <option value="todos">Todas las fechas</option>
                    <option value="mes">Este mes</option>
                    <option value="semana">Esta semana</option>
                    <option value="sinfecha">Sin fecha</option>
                  </select>
                  <label>
                    <input
                      type="checkbox"
                      checked={includeDone}
                      onChange={(e) => setIncludeDone(e.target.checked)}
                    />{" "}
                    Incluir terminados
                  </label>
                </div>
                <p>
                  {work.length} actividades · abre una para trabajar en su
                  módulo original.
                  {(detailPeriod === "mes" || detailPeriod === "semana") && (
                    <> Tareas sin fecha de entrega: se usa la fecha de creación.</>
                  )}
                </p>
                {activityList(work)}
              </>
            )}
            {detail === "calendar" && <Agenda activities={b.activities} month={calendarMonth} onMonthChange={onCalendarMonthChange} syncing={calendarLoading} error={calendarError} />}
            {detail === "attention" && (
              <>
                <h3>Vencidos de este mes · {late.length}</h3>
                {activityList(late)}
                <h3>Aprobaciones · {approvals.length}</h3>
                {approvals.map((r) => (
                  <button
                    className="st-detail-record"
                    key={r.id}
                    onClick={() => {
                      setDetail(null);
                      edit(r);
                    }}
                  >
                    <strong>{r.title}</strong>
                    <span>
                      {str(r.data, "waitingFor")} ·{" "}
                      <PrettyDate value={str(r.data, "date")} />
                    </span>
                  </button>
                ))}
                <button
                  className="st-text-button"
                  onClick={() => setDetail("client")}
                >
                  Comentarios del cliente · {observations.length} →
                </button>
              </>
            )}
            {detail === "client" && (
              <>
                <div className="st-toolbar">
                  <button
                    onClick={() => {
                      setDetail(null);
                      createApproval();
                    }}
                  >
                    Añadir aprobación
                  </button>
                </div>
                {client.map((r) => (
                  <button
                    className="st-detail-record"
                    key={r.id}
                    onClick={() => {
                      setDetail(null);
                      edit(r);
                    }}
                  >
                    <strong>{r.title}</strong>
                    <span>{str(r.data, "description")}</span>
                  </button>
                ))}
                {observations.map((o) => (
                  <article className="st-detail-record" key={o.id}>
                    <strong>{o.autor_nombre}</strong>
                    <p>{o.texto}</p>
                    <Link href={`/grilla/${b.brand.slug}`}>
                      Revisar en grilla →
                    </Link>
                  </article>
                ))}
                {!client.length && !observations.length && (
                  <Empty>No hay aprobaciones ni comentarios pendientes.</Empty>
                )}
              </>
            )}
            {detail === "team" && (
              <div className="st-team-directory">
                {team.map((m) => (
                  <div key={m.id}>
                    <span className="st-team-initial">
                      {m.nombre
                        .split(" ")
                        .map((n: string) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </span>
                    <span>
                      <strong>{m.nombre}</strong>
                      <small>{m.rol.replaceAll("_", " ")}</small>
                    </span>
                  </div>
                ))}
              </div>
            )}
            {detail === "changes" && (
              <>
                {live.slice(0, 20).map((r) =>
                  r.kind === "sheet" ? (
                    <Link
                      className="st-detail-record"
                      key={r.id}
                      href={`/marca/${b.brand.slug}/estrategia/hoja/${r.id}`}
                    >
                      <strong>{r.title}</strong>
                      <span>
                        {str(r.data, "state")} ·{" "}
                        <PrettyDate value={r.updated_at} />
                      </span>
                    </Link>
                  ) : (
                    <button
                      className="st-detail-record"
                      key={r.id}
                      onClick={() => {
                        setDetail(null);
                        edit(r);
                      }}
                    >
                      <strong>{r.title}</strong>
                      <span>
                        {str(r.data, "state")} ·{" "}
                        <PrettyDate value={r.updated_at} />
                      </span>
                    </button>
                  ),
                )}
                {!live.length && (
                  <Empty>Aún no hay decisiones registradas.</Empty>
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </>
  );
}
