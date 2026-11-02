"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Plus, X } from "lucide-react";
import { accountBalance, accountUsageName, amount, remaining, type Charge, type FinanceData, type MonthlyCostDraft, type Movement } from "@/lib/finanzas/model";
import { financeDashboard, type Dashboard } from "@/lib/finanzas/dashboard";
import styles from "./finance.module.css";
import s from "./finance-dashboard.module.css";

type Detail = "receivables" | "expenses" | "balances" | "estimate" | "entries" | "movements";
const range = (low: number, high: number, currency: string) => low === high ? amount(low, currency) : `${amount(low, currency)} – ${amount(high, currency)}`;

export function FinanceDashboard({ data, scope, currency, month, onCharge, onRecurring }: {
  data: FinanceData; scope: string; currency: string; month: string;
  onCharge: (charge: Charge) => void; onRecurring: (draft?: MonthlyCostDraft) => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const d = financeDashboard(data, scope, currency, month);
  const personal = scope === "personal";
  const cards: { id: Detail; title: string; value: string; sub: string }[] = personal ? [
    { id: "balances", title: "Saldo personal actual", value: d.balances.total === null ? "Por completar" : amount(d.balances.total, currency), sub: `${d.balances.known} cuentas · saldo registrado hoy${d.balances.pending ? " · faltan saldos" : ""}` },
    { id: "expenses", title: "Gastos personales del mes", value: amount(d.paid, currency), sub: `${d.expenses.length} pagos realizados · ver movimientos` },
    { id: "entries", title: "Entradas del mes", value: amount(d.entriesTotal, currency), sub: "Cobros y transferencias recibidas, separados" },
    { id: "movements", title: "Movimientos del mes", value: String(d.movements.length), sub: "Gastos, cobros y transferencias" },
  ] : [
    { id: "receivables", title: "Por cobrar este mes", value: amount(d.confirmedTotal, currency), sub: `Confirmado · ${amount(d.reviewTotal, currency)} por revisar` },
    { id: "expenses", title: "Gastos este mes", value: amount(d.paid, currency), sub: `Pagados · ${amount(d.pendingCostsTotal, currency)} pendientes previstos` },
    { id: "balances", title: "Saldo de agencia actual", value: d.balances.total === null ? "Por completar" : amount(d.balances.total, currency), sub: `${d.balances.known} cuentas · saldo registrado hoy${d.balances.pending ? " · faltan saldos" : ""}` },
    { id: "estimate", title: "Quedaría estimado", value: range(d.estimateLow, d.estimateHigh, currency), sub: currency === "PEN" ? "Después de pagos y tu retiro · estimación parcial" : "Después de pagos · sin convertir tu retiro en soles" },
  ];
  return <>
    <div className={styles.cards} aria-label={`Indicadores de ${personal ? "Personal" : "Agencia"}`}>
      {cards.map((card) => <button key={card.id} className={`${styles.metric} ${s.metric}`} onClick={() => setDetail(card.id)} aria-haspopup="dialog">
        <span className={s.cardTitle}>{card.title}<ArrowUpRight size={14} aria-hidden="true" /></span>
        <strong className={card.id === "estimate" ? s.estimateValue : undefined}>{card.value}</strong>
        <small>{card.sub}</small>
        <span className={s.tap}>Ver detalle</span>
      </button>)}
    </div>
    {!personal && <div className={s.context}>
      <button onClick={() => setDetail("receivables")}>Saldos anteriores confirmados: {amount(d.olderTotal, currency)}</button>
      <button onClick={() => onRecurring()}><Plus size={15} /> Agregar costo recurrente</button>
    </div>}
    {detail && <DashboardDetail detail={detail} d={d} data={data} scope={scope} currency={currency} month={month} onClose={() => setDetail(null)} onCharge={(c) => { setDetail(null); onCharge(c); }} onRecurring={(draft) => { setDetail(null); onRecurring(draft); }} />}
  </>;
}

function DashboardDetail({ detail, d, data, scope, currency, month, onClose, onCharge, onRecurring }: {
  detail: Detail; d: Dashboard; data: FinanceData; scope: string; currency: string; month: string;
  onClose: () => void; onCharge: (charge: Charge) => void; onRecurring: (draft?: MonthlyCostDraft) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const titles: Record<Detail, string> = { receivables: "Detalle de cobros", expenses: "Detalle de gastos", balances: "Saldo por cuenta", estimate: "Cómo se calcula lo que quedaría", entries: "Entradas del mes", movements: "Movimientos del mes" };
  const monthName = new Intl.DateTimeFormat("es-PE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(month + "-01T12:00:00Z"));
  return <dialog ref={dialog} className={`${styles.dialog} ${s.detail}`} aria-label={titles[detail]} onCancel={(e) => { e.preventDefault(); onClose(); }}>
    <header className={s.head}><div><h2>{titles[detail]}</h2><p>{scope === "agency" ? "Agencia" : "Personal"} · {monthName} · {currency}</p></div><button onClick={onClose} aria-label="Cerrar detalle"><X size={20} /></button></header>
    {detail === "receivables" && <>
      <ChargeList title="Por cobrar este mes · confirmado" rows={d.confirmed} currency={currency} onCharge={onCharge} />
      <details className={s.group}><summary>Por revisar este mes · {amount(d.reviewTotal, currency)}</summary><p>Son mensualidades previstas. Revisa si siguen pendientes; todavía no son deuda confirmada.</p><ChargeList rows={d.review} currency={currency} onCharge={onCharge} /></details>
      <details className={s.group}><summary>Saldos anteriores · {amount(d.olderTotal, currency)} confirmados</summary><p>Se muestran aparte del mes seleccionado. Cada fila conserva su vencimiento.</p><ChargeList rows={d.older} currency={currency} onCharge={onCharge} /></details>
      <details className={s.group}><summary>Cobrado durante el mes · {amount(d.received, currency)}</summary><MovementList rows={d.income} data={data} currency={currency} /></details>
      <p>El saldo de cada cobro descuenta abonos y créditos registrados. Los importes incluyen el IGV indicado en cada registro.</p>
    </>}
    {detail === "expenses" && <>
      <h3>Pagos realizados · {amount(d.paid, currency)}</h3>
      <MovementList rows={d.expenses} data={data} currency={currency} />
      <details className={s.group}><summary>Pendientes previstos del mes · {amount(d.pendingCostsTotal, currency)}</summary><ChargeList rows={d.costsPending} currency={currency} onCharge={onCharge} /></details>
      <MonthlyCosts rows={d.monthlyCosts} onRecurring={onRecurring} />
      <p>Los pagos se cuentan por la fecha del movimiento. Las transferencias entre cuentas no se suman como gastos.</p>
      <button onClick={() => onRecurring()}><Plus size={16} /> Agregar costo recurrente</button>
    </>}
    {detail === "balances" && <>
      <div className={s.total}>Total conocido <strong>{d.balances.total === null ? "Por completar" : amount(d.balances.total, currency)}</strong></div>
      {d.accounts.map((a) => <div className={s.row} key={a.id}><div><strong>{a.name}</strong><small>{accountUsageName(a.usage)} · {a.opening_date ? `Apertura ${formatDate(a.opening_date)}` : "Apertura pendiente"}</small></div><b>{accountBalance(a) === null ? "Por completar" : amount(accountBalance(a)!, currency)}</b></div>)}
      {!d.accounts.length && <p>No hay cuentas clasificadas en este espacio y moneda.</p>}
      {!!d.balances.pending && <p>{d.balances.pending} cuentas sin saldo inicial o moneda; el total es parcial.</p>}
      <p>Saldo registrado al {formatDate(data.today)}, con movimientos de todos los meses. No es el saldo al cierre del mes seleccionado ni una consulta al banco.</p>
    </>}
    {detail === "entries" && <>
      <h3>Cobros · {amount(d.received, currency)}</h3><MovementList rows={d.income} data={data} currency={currency} />
      <h3>Transferencias recibidas · {amount(d.entriesTotal - d.received, currency)}</h3><MovementList rows={d.transfersIn} data={data} currency={currency} />
      <p>Las transferencias desde Agencia se muestran como dinero recibido, separadas de los ingresos. Mover entre dos cuentas personales no crea una nueva entrada.</p>
    </>}
    {detail === "movements" && <MovementList rows={d.movements} data={data} currency={currency} />}
    {detail === "estimate" && <>
      <div className={s.warning}><strong>Estimación parcial</strong><p>Proyecta cobros menos pagos del mes. Incluye lo que está por revisar; completa las plataformas y demás costos para afinar el cálculo. No es utilidad contable ni dinero disponible hoy.</p></div>
      <Formula label="Cobros realizados + pendientes del mes, sin IGV registrado" value={d.expectedReceipts} currency={currency} />
      <Formula label="Pagos realizados + pendientes previstos del mes" value={-d.expectedCosts + d.undatedCostsTotal} currency={currency} />
      {d.undatedCostsTotal > 0 && <Formula label="Reserva de costos mensuales sin fecha" value={-d.undatedCostsTotal} currency={currency} />}
      <Formula label="Resultado antes de tu retiro" value={d.operating} currency={currency} />
      <div className={s.row}><span>Reserva para tu retiro personal</span><b>{range(d.withdrawalLow, d.withdrawalHigh, currency)}</b></div>
      {currency === "PEN" && (data.ownerWeeklyTarget ?? 0) > 0 && <p>{amount(data.ownerWeeklyTarget!, "PEN")} cada semana. Hasta definir el día de retiro, el mes puede tener {d.withdrawalLow / data.ownerWeeklyTarget!}–{d.withdrawalHigh / data.ownerWeeklyTarget!} retiros. Se reserva la meta una sola vez; las transferencias registradas no se descuentan otra vez.</p>}
      {currency !== "PEN" && <p>La meta de retiro está en soles; no se descuenta de esta moneda sin un tipo de cambio.</p>}
      <div className={s.total}>Quedaría estimado <strong>{range(d.estimateLow, d.estimateHigh, currency)}</strong></div>
      <p>Excluye saldos iniciales, cobros pendientes de meses anteriores e impuestos por determinar. Los gastos se toman por el importe pagado o pendiente, sin presumir crédito fiscal. No se vuelve a sumar la parte pagada de una obligación.</p>
      <details className={s.group}><summary>Ver cobros usados en el cálculo</summary><h3>Realizados</h3><MovementList rows={d.income} data={data} currency={currency} /><h3>Pendientes del mes</h3><ChargeList rows={[...d.confirmed, ...d.review]} currency={currency} onCharge={onCharge} /></details>
      <details className={s.group}><summary>Ver pagos usados en el cálculo</summary><h3>Realizados</h3><MovementList rows={d.expenses} data={data} currency={currency} /><h3>Pendientes del mes</h3><ChargeList rows={d.costsPending} currency={currency} onCharge={onCharge} /><p>Si un adelanto se registró como gasto separado, revisa su vínculo con el pago del equipo para no presupuestarlo dos veces.</p></details>
      <h3>Costos recurrentes adicionales</h3>
      <MonthlyCosts rows={d.monthlyCosts} onRecurring={onRecurring} />
      {data.notes.find((n) => n.id === "04-platforms") && <p>{data.notes.find((n) => n.id === "04-platforms")!.body}</p>}
      {d.recurringCosts.map((r) => <div className={s.row} key={r.id}><span>{r.title}<small>{r.frequency === "weekly" ? "Semanal" : "Mensual"}</small></span><b>{amount(r.base + r.tax, currency)}</b></div>)}
      {!d.recurringCosts.length && <p>Todavía no registraste plataformas u otros costos recurrentes en esta moneda.</p>}
      <button className={styles.primary} onClick={() => onRecurring()}><Plus size={16} /> Agregar costo recurrente</button>
    </>}
    <footer className={s.footer}><button onClick={onClose}>Cerrar detalle</button></footer>
  </dialog>;
}

function formatDate(date: string) { return date.split("-").reverse().join("/"); }
function MonthlyCosts({rows,onRecurring}:{rows:MonthlyCostDraft[];onRecurring:(draft:MonthlyCostDraft)=>void}) {
  if (!rows.length) return null;
  return <section><h3>Mensuales · falta programar la fecha</h3><p>Incluidos en la previsión. Aún no son pagos ni vencimientos registrados. Al programarlos se reemplaza esta reserva, sin duplicarla.</p>{rows.map((c) => <button className={s.record} key={c.id} onClick={() => onRecurring(c)}><span><strong>{c.title}</strong><small>{c.note}</small></span><span><b>{amount(c.amount,c.currency)}</b><small>Programar fecha ↗</small></span></button>)}</section>;
}
function ChargeList({ rows, title, currency, onCharge }: { rows: Charge[]; title?: string; currency: string; onCharge: (c: Charge) => void }) {
  const total = rows.reduce((n, c) => n + remaining(c), 0);
  return <section>{title && <h3>{title} · {amount(total, currency)}</h3>}
    {rows.map((c) => <button className={s.record} key={c.id} onClick={() => onCharge(c)}>
      <span><strong>{c.title}</strong><small>Vence {formatDate(c.due)} · {c.state === "review" ? "Por revisar" : "Confirmado"}</small>{c.tax > 0 && <small>Importe original: {amount(c.base, currency)} + IGV {amount(c.tax, currency)}</small>}{c.prior_credit + c.settled > 0 && <small>Abonos y créditos: {amount(c.prior_credit + c.settled, currency)}</small>}</span>
      <span><b>{amount(remaining(c), currency)}</b><small>Registrar pago ↗</small></span>
    </button>)}
    {!rows.length && <p>Sin registros en esta selección.</p>}
  </section>;
}
function MovementList({ rows, data, currency }: { rows: Movement[]; data: FinanceData; currency: string }) {
  const name = (id: string | null) => data.accounts.find((a) => a.id === id)?.name || "Sin cuenta registrada";
  return <div>{rows.map((m) => <div key={m.id} className={s.row}><div><strong>{m.title}</strong><small>{formatDate(m.date)} · {m.kind === "transfer" ? "Transferencia" : m.kind === "expense" ? "Gasto" : "Cobro"} · {m.scope === "personal" ? "Personal" : "Agencia"}</small><small>{name(m.account_id)}{m.destination_id ? ` → ${name(m.destination_id)}` : ""}</small></div><b>{m.kind === "expense" ? "− " : m.kind === "income" ? "+ " : ""}{amount(m.amount, currency)}</b></div>)}{!rows.length && <p>Sin movimientos en esta selección.</p>}</div>;
}
function Formula({ label, value, currency }: { label: string; value: number; currency: string }) { return <div className={s.row}><span>{label}</span><b>{amount(value, currency)}</b></div>; }
