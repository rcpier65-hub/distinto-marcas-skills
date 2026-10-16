"use client";
import {
  CheckSquare,
  Paintbrush,
  Film,
  Send,
  Video,
  ArrowUpRight,
} from "lucide-react";
import type { Activity } from "@/lib/estrategia/model";
import { weekWindow } from "@/lib/estrategia/activity-status";

export const workKinds = [
  { kind: "Tarea", label: "Tareas", Icon: CheckSquare, color: "#8561d7" },
  { kind: "Diseño", label: "Diseño", Icon: Paintbrush, color: "#e478a7" },
  { kind: "Edición", label: "Edición de video", Icon: Film, color: "#6a8fe5" },
  { kind: "Publicación", label: "Publicaciones", Icon: Send, color: "#26a493" },
  { kind: "Grabación", label: "Grabaciones", Icon: Video, color: "#cb943a" },
] as const;
export type WorkPeriod = "mes" | "semana" | "sinfecha";
export function periodWork(
  activities: Activity[],
  today: string,
  period: WorkPeriod,
) {
  const week = weekWindow(today);
  return activities.filter(
    (a) =>
      workKinds.some((k) => k.kind === a.kind) &&
      (period === "sinfecha"
        ? !a.date && !a.done
        : period === "semana"
          ? a.date && a.date >= week.start && a.date <= week.end
          : a.date?.startsWith(today.slice(0, 7))),
  );
}
export function ExistingWork({
  activities,
  today,
  period,
  setPeriod,
  open,
}: {
  activities: Activity[];
  today: string;
  period: WorkPeriod;
  setPeriod: (period: WorkPeriod) => void;
  open: (kind: string) => void;
}) {
  const items = periodWork(activities, today, period);
  return (
    <section className="st-card st-production" aria-label="Trabajo del equipo">
      <div className="st-row st-dash-heading">
        <h2>Trabajo del equipo</h2>
        <select
          aria-label="Periodo del trabajo"
          value={period}
          onChange={(e) => setPeriod(e.target.value as WorkPeriod)}
        >
          <option value="mes">Este mes</option>
          <option value="semana">Esta semana</option>
          <option value="sinfecha">Sin fecha</option>
        </select>
      </div>
      <table className="st-production-table">
        <thead>
          <tr>
            <th>Área</th>
            <th>Listos / total</th>
            <th>Avance</th>
            <th>Pendientes</th>
            <th>
              <span className="sr-only">Detalle</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {workKinds.map(({ kind, label, Icon, color }) => {
            const rows = items.filter((a) => a.kind === kind),
              done = rows.filter((a) => a.done).length;
            const progress = rows.length
              ? Math.round((done / rows.length) * 100)
              : 0;
            return (
              <tr key={kind}>
                <th scope="row">
                  <span className="st-area-label">
                    <span
                      className="st-area-icon"
                      style={{ color, background: `${color}15` }}
                    >
                      <Icon size={15} />
                    </span>
                    {label}
                  </span>
                </th>
                <td>
                  {done}
                  <span className="st-table-muted"> / {rows.length}</span>
                </td>
                <td>
                  <div
                    className="st-progress"
                    role="progressbar"
                    aria-label={`Avance de ${label}`}
                    aria-valuenow={progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <span
                      style={{ width: `${progress}%`, background: color }}
                    />
                  </div>
                  <span className="st-progress-value">
                    {rows.length ? `${progress}%` : "—"}
                  </span>
                </td>
                <td>
                  <span
                    className={
                      rows.length - done ? "st-count-pending" : "st-count-clear"
                    }
                  >
                    {rows.length - done}
                  </span>
                </td>
                <td>
                  <button
                    className="st-icon"
                    aria-label={`Ver ${label}`}
                    onClick={() => open(kind)}
                  >
                    <ArrowUpRight size={16} />
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="st-production-foot">
        <small>Avance del trabajo registrado en este periodo.</small>
        <button className="st-text-button" onClick={() => open("")}>
          Ver todo →
        </button>
      </div>
    </section>
  );
}
