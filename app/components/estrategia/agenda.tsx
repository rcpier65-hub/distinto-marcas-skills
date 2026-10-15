"use client";
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays, List } from "lucide-react";
import { type Activity, todayLima } from "@/lib/estrategia/model";
import { Empty, Jump, Modal, PrettyDate } from "./common";
const kinds = [
  "Publicación",
  "Tarea",
  "Diseño",
  "Edición",
  "Grabación",
  "Reunión",
  "Fecha importante",
];
export function Agenda({ activities }: { activities: Activity[] }) {
  const [month, setMonth] = useState(todayLima().slice(0, 7)),
    [kind, setKind] = useState(""),
    [owner, setOwner] = useState(""),
    [state, setState] = useState(""),
    [mode, setMode] = useState("month"),
    [selected, setSelected] = useState<Activity | null>(null);
  const filtered = useMemo(
    () =>
      activities.filter(
        (a) =>
          (!kind || a.kind === kind) &&
          (!owner || a.owner === owner) &&
          (!state || (state === "done" ? a.done : !a.done)),
      ),
    [activities, kind, owner, state],
  );
  const [year, mon] = month.split("-").map(Number),
    first = new Date(year, mon - 1, 1),
    offset = (first.getDay() + 6) % 7;
  const days = Array.from(
    { length: Math.ceil((offset + new Date(year, mon, 0).getDate()) / 7) * 7 },
    (_, i) => {
      const d = new Date(year, mon - 1, 1 + i - offset);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    },
  );
  function move(n: number) {
    const d = new Date(year, mon - 1 + n, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const chip = (a: Activity) => (
    <button
      key={a.id}
      className={`st-event st-kind-${kinds.indexOf(a.kind)} ${a.done ? "st-done" : ""}`}
      onClick={() => setSelected(a)}
    >
      <small>
        {a.time?.slice(0, 5)} {a.kind}
        {a.delivery ? " · entrega" : ""}
      </small>
      <span>{a.title}</span>
    </button>
  );
  return (
    <section className="st-card st-agenda">
      <div className="st-row">
        <div>
          <h2>Calendario de la marca</h2>
          <p>Publicación, entregas y reuniones en su fecha correspondiente.</p>
        </div>
        <div className="st-row st-tight">
          <button
            className={mode === "month" ? "st-selected" : ""}
            onClick={() => setMode("month")}
            aria-label="Vista mensual"
          >
            <CalendarDays size={17} />
          </button>
          <button
            className={mode === "list" ? "st-selected" : ""}
            onClick={() => setMode("list")}
            aria-label="Vista lista"
          >
            <List size={17} />
          </button>
        </div>
      </div>
      <div className="st-toolbar">
        <button onClick={() => move(-1)} aria-label="Mes anterior">
          <ChevronLeft size={16} />
        </button>
        <strong>
          {first.toLocaleDateString("es-PE", {
            month: "long",
            year: "numeric",
          })}
        </strong>
        <button onClick={() => move(1)} aria-label="Mes siguiente">
          <ChevronRight size={16} />
        </button>
        <button onClick={() => setMonth(todayLima().slice(0, 7))}>Hoy</button>
        <select
          aria-label="Tipo de actividad"
          value={kind}
          onChange={(e) => setKind(e.target.value)}
        >
          <option value="">Todos los tipos</option>
          {kinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <select
          aria-label="Responsable"
          value={owner}
          onChange={(e) => setOwner(e.target.value)}
        >
          <option value="">Todo el equipo</option>
          {[...new Set(activities.map((a) => a.owner))].sort().map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
        <select
          aria-label="Estado"
          value={state}
          onChange={(e) => setState(e.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="pending">Pendientes</option>
          <option value="done">Terminados</option>
        </select>
      </div>
      {mode === "month" ? (
        <div className="st-month">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((d) => (
            <b key={d}>{d}</b>
          ))}
          {days.map((day) => (
            <div
              key={day}
              className={`st-day ${day.slice(0, 7) !== month ? "st-outside" : ""} ${day === todayLima() ? "st-today" : ""}`}
            >
              <strong>{Number(day.slice(-2))}</strong>
              {filtered.filter((a) => a.date?.slice(0, 10) === day).map(chip)}
            </div>
          ))}
        </div>
      ) : (
        <div className="st-list">
          {filtered
            .filter((a) => a.date?.startsWith(month))
            .sort((a, b) => (a.date! + a.time).localeCompare(b.date! + b.time))
            .map((a) => (
              <div className="st-row" key={a.id}>
                <span>
                  <PrettyDate value={a.date} />
                </span>
                {chip(a)}
                <span>{a.owner}</span>
              </div>
            ))}
        </div>
      )}
      <details className="st-undated">
        <summary>
          Pendientes de programar ·{" "}
          {filtered.filter((a) => !a.date && !a.done).length}
        </summary>
        <div className="st-grid">
          {filtered.filter((a) => !a.date && !a.done).map(chip)}
        </div>
        {!filtered.some((a) => !a.date && !a.done) && (
          <Empty>No hay pendientes sin fecha con estos filtros.</Empty>
        )}
      </details>
      {selected && (
        <Modal title={selected.title} close={() => setSelected(null)}>
          <div className="st-detail">
            <span className="st-badge">
              {selected.kind}
              {selected.delivery ? " · fecha de entrega" : ""}
            </span>
            <p>
              <PrettyDate value={selected.date} /> {selected.time?.slice(0, 5)}
            </p>
            <p>
              {selected.owner} · {selected.state}
            </p>
            <Jump href={selected.href}>
              Abrir y editar en{" "}
              {selected.kind === "Tarea" ? "Tareas" : "el módulo de origen"}
            </Jump>
            <small>
              La fecha y el estado se leen del registro original. Los cambios
              aparecerán aquí al actualizar.
            </small>
          </div>
        </Modal>
      )}
    </section>
  );
}
