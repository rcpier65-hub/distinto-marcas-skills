"use client";
import {
  useState,
  useRef,
  useEffect,
  type ReactNode,
  type FormEvent,
} from "react";
import {
  Wallet,
  ArrowLeftRight,
  Plus,
  RefreshCw,
  ShieldCheck,
  CalendarDays,
} from "lucide-react";
import {
  amount,
  remaining,
  ownerNames,
  type FinanceData,
  type Charge,
  type Account,
  type Movement,
} from "@/lib/finanzas/model";
import { DocumentsPanel } from "./documents-panel";
import { QuickEntry } from "./quick-entry";
import styles from "./finance.module.css";
type FormKind =
  | "expense"
  | "charge"
  | "rule"
  | "account"
  | "transfer"
  | "payment"
  | "voidMovement"
  | "voidCharge";
type FormState = {
  kind: FormKind;
  charge?: Charge;
  account?: Account;
  movement?: Movement;
};
export function FinanceView({ initial }: { initial: FinanceData }) {
  const [data, setData] = useState(initial),
    [tab, setTab] = useState("Resumen"),
    [scope, setScope] = useState("agency"),
    [currency, setCurrency] = useState("PEN"),
    [month, setMonth] = useState(initial.month),
    [form, setForm] = useState<FormState | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  async function reload(m = month) {
    setBusy(true);
    try {
      const r = await fetch("/api/finanzas?mes=" + m, { cache: "no-store" }),
        d = await r.json();
      if (!r.ok) throw Error(d.error);
      setData(d);
      setMonth(m);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function send(payload: Record<string, unknown>) {
    setError("");
    setNotice("");
    const r = await fetch("/api/finanzas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      }),
      d = await r.json();
    if (!r.ok) throw Error(d.error);
    await reload();
    setNotice("Guardado. El historial está actualizado.");
  }
  async function quick(payload: Record<string, unknown>) {
    setBusy(true);
    try {
      await send({ ...payload, requestId: crypto.randomUUID() });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const relevant = data.charges.filter(
    (c) => c.scope === scope && c.currency === currency && c.state !== "void",
  );
  const due = relevant.filter((c) => c.due.slice(0, 7) === month);
  const unpaid = relevant.filter((c) => remaining(c) > 0);
  const confirmed = unpaid.filter((c) => c.state === "confirmed");
  const sum = (cs: Charge[]) => cs.reduce((s, c) => s + remaining(c), 0);
  const moves = data.movements.filter(
    (m) => m.scope === scope && m.currency === currency && !m.void_reason,
  );
  const income = moves
      .filter((m) => m.kind === "income")
      .reduce((s, m) => s + m.amount, 0),
    expense = moves
      .filter((m) => m.kind === "expense")
      .reduce((s, m) => s + m.amount, 0);
  const activeRules = data.rules.filter(
    (r) => r.active && r.scope === scope && r.currency === currency,
  );
  const pendingReview = unpaid.filter((c) => c.state === "review").length;
  return (
    <main className={styles.root}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>DISTINTO · FINANZAS PRIVADAS</span>
          <h1>Tu dinero, en orden.</h1>
          <p>
            Separa lo que esperas cobrar, lo que ya cobraste y lo que puedes
            gastar.
          </p>
        </div>
        <span className={styles.secure}>
          <ShieldCheck size={16} /> Pedro y Nayeli
        </span>
      </header>
      <QuickEntry data={data} scope={scope} currency={currency} onSave={send} />
      <div className={styles.toolbar}>
        <div className={styles.segment}>
          {[
            ["agency", "Agencia"],
            ["personal", "Personales"],
          ].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setScope(v)}
              aria-pressed={scope === v}
            >
              {l}
            </button>
          ))}
        </div>
        <label className={styles.compact}>
          Mes
          <input
            aria-label="Mes de finanzas"
            type="month"
            min="2026-11"
            max={data.today.slice(0, 7)}
            value={month}
            onChange={(e) => reload(e.target.value)}
          />
        </label>
        <select
          aria-label="Moneda"
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
        >
          <option value="PEN">Soles · PEN</option>
          <option value="USD">Dólares · USD</option>
        </select>
        <button
          onClick={() => reload()}
          disabled={busy}
          aria-label="Actualizar finanzas"
        >
          <RefreshCw size={17} />
        </button>
        <button
          className={styles.primary}
          onClick={() => setForm({ kind: "expense" })}
        >
          <Plus size={17} /> Formulario de gasto
        </button>
      </div>
      {error && (
        <div role="alert" className={styles.error}>
          {error}
          <button onClick={() => setError("")}>Cerrar</button>
        </div>
      )}
      {notice && (
        <div role="status" className={styles.success}>
          {notice}
        </div>
      )}
      <div className={styles.cards}>
        <Metric
          title="Cobrado en el mes"
          value={amount(income, currency)}
          sub="Dinero registrado en tus cuentas"
        />
        <Metric
          title="Por cobrar confirmado"
          value={amount(
            sum(confirmed.filter((c) => c.kind === "income")),
            currency,
          )}
          sub="Incluye saldos anteriores; no es caja"
        />
        <Metric
          title="Pagado en el mes"
          value={amount(expense, currency)}
          sub="Transferencias excluidas"
        />
        <Metric
          title="Por revisar"
          value={String(pendingReview)}
          sub="Mensualidades sin conciliar"
        />
      </div>
      <nav className={styles.tabs} aria-label="Secciones de finanzas">
        {[
          "Resumen",
          "Cobros",
          "Gastos y equipo",
          "Mensualidades",
          "Cuentas",
          "Movimientos",
          "Documentos",
        ].map((t) => (
          <button key={t} onClick={() => setTab(t)} aria-pressed={tab === t}>
            {t}
          </button>
        ))}
      </nav>
      {tab === "Resumen" && (
        <>
          <div className={styles.twoCol}>
            <section className={styles.panel}>
              <h2>
                <CalendarDays size={20} /> Próximos vencimientos
              </h2>
              <p>
                Los registros por revisar no se consideran deuda confirmada.
              </p>
              {unpaid
                .slice()
                .sort((a, b) => a.due.localeCompare(b.due))
                .slice(0, 7)
                .map((c) => (
                  <div key={c.id} className={styles.listRow}>
                    <div>
                      <strong>{c.title}</strong>
                      <small>
                        {c.due} · {c.kind === "income" ? "Cobro" : "Pago"} ·{" "}
                        {c.state === "review"
                          ? "Por revisar"
                          : c.due < data.today
                            ? "Vencido"
                            : "Pendiente"}
                      </small>
                    </div>
                    <button
                      onClick={() => setForm({ kind: "payment", charge: c })}
                    >
                      {amount(remaining(c), c.currency)}
                    </button>
                  </div>
                ))}
              {!unpaid.length && (
                <p>No hay pendientes registrados para esta selección.</p>
              )}
            </section>
            <section className={styles.panel}>
              <h2>
                <Wallet size={20} /> Plan del mes
              </h2>
              <p>
                Proyección operativa. No representa utilidad ni saldo bancario.
              </p>
              <div className={styles.listRow}>
                <span>Servicios previstos, sin IGV</span>
                <strong>
                  {amount(
                    due
                      .filter((c) => c.kind === "income" && c.rule_id)
                      .reduce((s, c) => s + c.base, 0),
                    currency,
                  )}
                </strong>
              </div>
              <div className={styles.listRow}>
                <span>Pagos previstos al equipo</span>
                <strong>
                  {amount(
                    due
                      .filter((c) => c.kind === "expense" && c.member_id)
                      .reduce((s, c) => s + c.base + c.tax, 0),
                    currency,
                  )}
                </strong>
              </div>
              {scope === "agency" &&
                currency === "PEN" &&
                data.ownerTarget !== null && (
                  <div className={styles.listRow}>
                    <span>
                      Meta de retiro personal de Pedro
                      <small>
                        No es un sueldo registrado ni un gasto pagado
                      </small>
                    </span>
                    <strong>{amount(data.ownerTarget!, "PEN")}</strong>
                  </div>
                )}
              <p className={styles.hint}>
                Registra un pago solo cuando ocurra. Al mover dinero entre tus
                cuentas usa Transferir para no duplicar ingresos ni gastos.
              </p>
              <button onClick={() => setForm({ kind: "transfer" })}>
                <ArrowLeftRight size={16} /> Transferir entre cuentas
              </button>
            </section>
          </div>
          <details className={styles.panel}>
            <summary>Datos por completar y recomendaciones</summary>
            <div className={styles.notes}>
              {data.notes.map((n) => (
                <article key={n.id}>
                  <h3>{n.title}</h3>
                  <p>{n.body}</p>
                </article>
              ))}
            </div>
            <a
              href="https://personas.sunat.gob.pe/trabajador-independiente/suspension-retenciones"
              target="_blank"
              rel="noreferrer"
            >
              Consultar suspensión y retenciones en SUNAT ↗
            </a>
          </details>
        </>
      )}
      {(tab === "Cobros" || tab === "Gastos y equipo") && (
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>
                {tab === "Cobros"
                  ? "Cuentas por cobrar"
                  : "Gastos y pagos del equipo"}
              </h2>
              <p>
                Mes seleccionado y saldos anteriores. Un recibo adjunto no
                confirma un pago.
              </p>
            </div>
            <button
              onClick={() =>
                setForm({ kind: tab === "Cobros" ? "charge" : "expense" })
              }
            >
              <Plus size={16} />{" "}
              {tab === "Cobros" ? "Nuevo cobro" : "Nuevo gasto"}
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Concepto / titular</th>
                  <th>Vence</th>
                  <th>Base + IGV</th>
                  <th>Saldo</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {relevant
                  .filter(
                    (c) =>
                      c.kind === (tab === "Cobros" ? "income" : "expense") &&
                      (c.due.slice(0, 7) === month || remaining(c) > 0),
                  )
                  .map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.title}</strong>
                        <small>
                          {ownerNames[c.owner]}
                          {c.note && (
                            <details>
                              <summary>Detalles</summary>
                              {c.note}
                            </details>
                          )}
                        </small>
                      </td>
                      <td>{c.due}</td>
                      <td>
                        {amount(c.base, c.currency)}
                        <small>
                          {c.tax
                            ? `IGV: ${amount(c.tax, c.currency)}`
                            : "Sin IGV registrado"}
                        </small>
                        {c.prior_credit > 0 && (
                          <small>
                            Abono anterior: {amount(c.prior_credit, c.currency)}
                          </small>
                        )}
                      </td>
                      <td>{amount(remaining(c), c.currency)}</td>
                      <td>
                        <span className={styles.badge}>
                          {remaining(c) === 0
                            ? "Saldado"
                            : c.state === "review"
                              ? "Por revisar"
                              : c.due < data.today
                                ? "Vencido"
                                : c.settled
                                  ? "Pago parcial"
                                  : "Pendiente"}
                        </span>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {remaining(c) > 0 && (
                            <button
                              onClick={() =>
                                setForm({ kind: "payment", charge: c })
                              }
                            >
                              Registrar pago
                            </button>
                          )}
                          {c.state === "review" && (
                            <button
                              disabled={busy}
                              onClick={() =>
                                quick({ action: "confirm", id: c.id })
                              }
                            >
                              Confirmar pendiente
                            </button>
                          )}
                          {!c.settled && !c.prior_credit && (
                            <button
                              onClick={() =>
                                setForm({ kind: "voidCharge", charge: c })
                              }
                            >
                              Anular
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {!relevant.some(
            (c) => c.kind === (tab === "Cobros" ? "income" : "expense"),
          ) && <p>No hay registros en esta selección.</p>}
        </section>
      )}
      {tab === "Mensualidades" && (
        <section className={styles.panel}>
          <div className={styles.sectionHead}>
            <div>
              <h2>Servicios y pagos recurrentes</h2>
              <p>
                Se genera cada vencimiento una sola vez, inicialmente por
                revisar. Pausar detiene los nuevos; los anteriores se conservan.
              </p>
            </div>
            <button onClick={() => setForm({ kind: "rule" })}>
              <Plus size={16} /> Nueva recurrencia
            </button>
          </div>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Servicio / persona</th>
                  <th>Importe</th>
                  <th>Frecuencia</th>
                  <th>Titular</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.rules
                  .filter((r) => r.scope === scope && r.currency === currency)
                  .map((r) => (
                    <tr key={r.id}>
                      <td>
                        <strong>{r.title}</strong>
                        <small>
                          {r.kind === "income" ? "Ingreso" : "Pago"} ·{" "}
                          {r.period_mode === "advance"
                            ? "Adelantado"
                            : r.period_mode === "arrears"
                              ? "Mes vencido"
                              : "Según acuerdo"}
                        </small>
                      </td>
                      <td>
                        {amount(r.base + r.tax, r.currency)}
                        {r.tax > 0 && (
                          <small>Incluye IGV {amount(r.tax, r.currency)}</small>
                        )}
                      </td>
                      <td>
                        {r.frequency === "weekly"
                          ? `Cada ${["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"][r.day]}`
                          : `Día ${r.day} de cada mes`}
                        <small>Desde {r.starts}</small>
                      </td>
                      <td>{ownerNames[r.owner]}</td>
                      <td>
                        <button
                          disabled={busy}
                          onClick={() =>
                            quick({
                              action: "pauseRule",
                              id: r.id,
                              active: !r.active,
                            })
                          }
                        >
                          {r.active ? "Pausar" : "Reactivar"}
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className={styles.hint}>
            {activeRules.length} acuerdos activos. Para cambiar un precio, pausa
            el acuerdo anterior y crea el nuevo desde su fecha de vigencia. El
            historial conserva sus importes.
          </p>
        </section>
      )}
      {tab === "Cuentas" && (
        <section>
          <div className={styles.sectionHead}>
            <div>
              <h2>Cuentas y billeteras</h2>
              <p>
                La cuenta que recibe un pago no cambia el titular del ingreso.
                Los saldos iniciales deben conciliarse.
              </p>
            </div>
            <div className={styles.actions}>
              <button onClick={() => setForm({ kind: "transfer" })}>
                <ArrowLeftRight size={16} /> Transferir
              </button>
              <button onClick={() => setForm({ kind: "account" })}>
                <Plus size={16} /> Cuenta
              </button>
            </div>
          </div>
          <div className={styles.accountGrid}>
            {data.accounts.map((a) => (
              <article className={styles.panel} key={a.id}>
                <h3>{a.name}</h3>
                <p>
                  {a.owner ? ownerNames[a.owner] : "Titular por completar"} ·{" "}
                  {a.currency || "Moneda pendiente"}
                </p>
                <h2>
                  {a.opening === null
                    ? "Saldo por completar"
                    : amount(a.opening + a.movements, a.currency || "PEN")}
                </h2>
                <small>
                  Movimientos registrados:{" "}
                  {a.currency ? amount(a.movements, a.currency) : "—"}
                </small>
                {a.opening_date && <small>Apertura: {a.opening_date}</small>}
                <p>{a.note}</p>
                <button
                  onClick={() => setForm({ kind: "account", account: a })}
                >
                  Configurar cuenta
                </button>
              </article>
            ))}
          </div>
        </section>
      )}
      {tab === "Movimientos" && (
        <section className={styles.panel}>
          <h2>Historial de movimientos</h2>
          <p>
            Los importes de retención o detracción quedan separados del dinero
            disponible. Anular conserva el historial.
          </p>
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Concepto</th>
                  <th>Cuenta</th>
                  <th>Dinero</th>
                  <th>Importe separado</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.movements
                  .filter(
                    (m) =>
                      m.currency === currency &&
                      (m.scope === scope || m.kind === "transfer"),
                  )
                  .map((m) => (
                    <tr key={m.id}>
                      <td>{m.date}</td>
                      <td>
                        <strong>{m.title}</strong>
                        <small>
                          {m.kind === "transfer"
                            ? "Transferencia"
                            : m.kind === "income"
                              ? "Ingreso"
                              : "Salida"}{" "}
                          · {ownerNames[m.owner]}
                        </small>
                      </td>
                      <td>
                        {data.accounts.find((a) => a.id === m.account_id)
                          ?.name || "Sin movimiento de caja"}
                        {m.destination_id && (
                          <small>
                            →{" "}
                            {
                              data.accounts.find(
                                (a) => a.id === m.destination_id,
                              )?.name
                            }
                          </small>
                        )}
                      </td>
                      <td>{amount(m.amount, m.currency)}</td>
                      <td>
                        {m.credit
                          ? `${amount(m.credit, m.currency)} · ${m.credit_kind === "retention" ? "Retención" : "Detracción"}`
                          : "—"}
                      </td>
                      <td>
                        {m.void_reason ? (
                          <span>
                            Anulado<small>{m.void_reason}</small>
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              setForm({ kind: "voidMovement", movement: m })
                            }
                          >
                            Anular
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {tab === "Documentos" && (
        <DocumentsPanel
          initial={data.receipts}
          charges={data.charges.filter((c) => c.state !== "void")}
          manager
          month={month}
          onReview={async (id, status, note) =>
            quick({ action: "reviewReceipt", id, status, note })
          }
        />
      )}
      <footer className={styles.footer}>
        Agencia es una vista operativa; cada registro conserva su titular
        fiscal. La inversión publicitaria pagada directamente a Meta queda fuera
        de estos cobros y gastos.
      </footer>
      {form && (
        <FinanceForm
          state={form}
          data={data}
          scope={scope}
          currency={currency}
          onClose={() => setForm(null)}
          onSave={send}
        />
      )}
    </main>
  );
}
function Metric({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <article className={styles.metric}>
      <span>{title}</span>
      <strong>{value}</strong>
      <small>{sub}</small>
    </article>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      {children}
    </label>
  );
}
function FinanceForm({
  state: s,
  data,
  scope,
  currency,
  onClose,
  onSave,
}: {
  state: FormState;
  data: FinanceData;
  scope: string;
  currency: string;
  onClose: () => void;
  onSave: (v: Record<string, unknown>) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [paid, setPaid] = useState(true),
    [frequency, setFrequency] = useState("monthly"),
    [chosenCurrency, setCurrency] = useState(
      s.charge?.currency || s.account?.currency || currency,
    ),
    [creditKind, setCreditKind] = useState("none");
  const attempt = useRef<{ hash: string; id: string } | null>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const titles = {
    expense: "Registrar gasto",
    charge: "Nuevo cobro",
    rule: "Nueva mensualidad o pago recurrente",
    account: "Configurar cuenta",
    transfer: "Transferencia / retiro",
    payment: "Registrar pago realizado",
    voidMovement: "Anular movimiento",
    voidCharge: "Anular obligación",
  };
  const hasInfo = ["expense", "charge", "rule"].includes(s.kind);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    const f = new FormData(e.currentTarget),
      str = (k: string) => String(f.get(k) || ""),
      cent = (k: string) => Math.round(Number(str(k)) * 100);
    let p: Record<string, unknown> = { action: s.kind };
    if (hasInfo) {
      const common = {
        title: str("title"),
        scope: str("scope"),
        owner: str("owner"),
        currency: chosenCurrency,
        note: str("note"),
      };
      if (s.kind === "expense")
        p = {
          ...p,
          ...common,
          amount: cent("base"),
          date: str("date"),
          paid,
          account_id: paid ? str("account_id") || null : null,
        };
      else {
        const d = {
          ...common,
          kind: str("kind") || "income",
          base: cent("base"),
          tax: cent("tax"),
          brand_id: str("brand_id") || null,
          member_id: str("member_id") || null,
        };
        p = {
          ...p,
          data:
            s.kind === "rule"
              ? {
                  ...d,
                  frequency,
                  day: Number(str("day")),
                  starts: str("date"),
                  ends: str("ends") || null,
                  period_mode: str("period_mode"),
                }
              : { ...d, due: str("date") },
        };
      }
    } else if (s.kind === "account")
      p = {
        ...p,
        id: s.account?.id,
        name: str("name"),
        owner: str("owner"),
        currency: chosenCurrency,
        opening: str("opening") === "" ? null : cent("opening"),
        opening_date: str("date"),
        note: str("note"),
      };
    else if (s.kind === "payment")
      p = {
        ...p,
        charge_id: s.charge!.id,
        account_id: str("account_id") || null,
        amount: cent("amount"),
        credit: creditKind === "none" ? 0 : cent("credit"),
        credit_kind: creditKind,
        date: str("date"),
      };
    else if (s.kind === "transfer")
      p = {
        ...p,
        title: str("title"),
        account_id: str("account_id"),
        destination_id: str("destination_id"),
        amount: cent("amount"),
        date: str("date"),
      };
    else
      p = { ...p, id: s.charge?.id || s.movement?.id, reason: str("reason") };
    const hash = JSON.stringify(p);
    if (attempt.current?.hash !== hash)
      attempt.current = { hash, id: crypto.randomUUID() };
    try {
      await onSave({ ...p, requestId: attempt.current.id });
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const accounts = (name: string, optional = false) => (
    <select name={name} required={!optional}>
      <option value="">Selecciona una cuenta</option>
      {data.accounts
        .filter((a) => a.currency === chosenCurrency && a.owner)
        .map((a) => (
          <option key={a.id} value={a.id}>
            {a.name} · {a.currency}
          </option>
        ))}
    </select>
  );
  const ownership = (
    <>
      <Field label="Espacio">
        <select name="scope" defaultValue={scope}>
          <option value="agency">Agencia · operación</option>
          <option value="personal">Personales</option>
        </select>
      </Field>
      <Field label="Titular del ingreso o gasto">
        <select
          name="owner"
          defaultValue={scope === "agency" ? "agency" : "pedro"}
        >
          {Object.entries(ownerNames).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </Field>
    </>
  );
  return (
    <dialog
      ref={dialog}
      className={styles.dialog}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <form onSubmit={submit}>
        <div className={styles.sectionHead}>
          <h2>{titles[s.kind]}</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar formulario"
          >
            ✕
          </button>
        </div>
        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        {hasInfo && (
          <>
            <Field label="Concepto">
              <input
                name="title"
                required
                maxLength={300}
                placeholder="Cliente, servicio o gasto"
              />
            </Field>
            <div className={styles.formGrid}>
              {ownership}
              <Field label="Importe base">
                <input
                  name="base"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  required
                />
              </Field>
              <Field label="Moneda">
                <select
                  value={chosenCurrency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="PEN">Soles</option>
                  <option value="USD">Dólares</option>
                </select>
              </Field>
              {s.kind !== "expense" && (
                <>
                  <Field label="IGV, si corresponde (importe)">
                    <input
                      name="tax"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue="0"
                    />
                  </Field>
                  <Field label="Marca (opcional)">
                    <select name="brand_id">
                      <option value="">Sin vincular</option>
                      {data.brands.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.nombre}
                        </option>
                      ))}
                    </select>
                  </Field>
                </>
              )}
            </div>
            {s.kind === "expense" && (
              <>
                <Field label="Estado">
                  <select
                    value={paid ? "paid" : "pending"}
                    onChange={(e) => setPaid(e.target.value === "paid")}
                  >
                    <option value="paid">Ya lo pagué</option>
                    <option value="pending">Pendiente de pago</option>
                  </select>
                </Field>
                {paid && (
                  <Field label="Cuenta desde la que pagaste">
                    {accounts("account_id")}
                  </Field>
                )}
              </>
            )}
            {s.kind === "rule" && (
              <div className={styles.formGrid}>
                <Field label="Tipo">
                  <select name="kind">
                    <option value="income">Cobro a cliente</option>
                    <option value="expense">Pago / gasto</option>
                  </select>
                </Field>
                <Field label="Frecuencia">
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value)}
                  >
                    <option value="monthly">Mensual</option>
                    <option value="weekly">Semanal</option>
                  </select>
                </Field>
                <Field
                  label={
                    frequency === "monthly" ? "Día del mes" : "Día de la semana"
                  }
                >
                  {frequency === "monthly" ? (
                    <input
                      key="monthly"
                      name="day"
                      required
                      type="number"
                      min="1"
                      max="31"
                      defaultValue="6"
                    />
                  ) : (
                    <select key="weekly" name="day" defaultValue="6">
                      {[
                        "Domingo",
                        "Lunes",
                        "Martes",
                        "Miércoles",
                        "Jueves",
                        "Viernes",
                        "Sábado",
                      ].map((d, i) => (
                        <option key={i} value={i}>
                          {d}
                        </option>
                      ))}
                    </select>
                  )}
                </Field>
                <Field label="Condición">
                  <select name="period_mode">
                    <option value="arrears">Mes vencido</option>
                    <option value="advance">Adelantado</option>
                    <option value="other">Otro acuerdo</option>
                  </select>
                </Field>
                <Field label="Miembro del equipo (si es un pago)">
                  <select name="member_id">
                    <option value="">No aplica</option>
                    {data.members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.nombre}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Termina (opcional)">
                  <input name="ends" type="date" />
                </Field>
              </div>
            )}
          </>
        )}
        {s.kind === "account" && (
          <>
            <Field label="Nombre de la cuenta">
              <input name="name" defaultValue={s.account?.name} required />
            </Field>
            <div className={styles.formGrid}>
              <Field label="Titular">
                <select
                  name="owner"
                  defaultValue={s.account?.owner || ""}
                  required
                >
                  <option value="">Selecciona el titular</option>
                  {Object.entries(ownerNames).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Moneda">
                <select
                  value={chosenCurrency}
                  onChange={(e) => setCurrency(e.target.value)}
                >
                  <option value="PEN">Soles</option>
                  <option value="USD">Dólares</option>
                </select>
              </Field>
            </div>
            <Field label="Saldo al inicio del día de apertura (déjalo vacío si aún no lo conoces)">
              <input
                name="opening"
                type="number"
                step="0.01"
                defaultValue={
                  s.account?.opening == null ? "" : s.account.opening / 100
                }
              />
            </Field>
            <p className={styles.hint}>
              Este saldo debe excluir los pagos que registrarás desde esa fecha.
              No se convierte en un ingreso nuevo.
            </p>
          </>
        )}
        {s.kind === "payment" && (
          <>
            <h3>{s.charge!.title}</h3>
            <p>
              Saldo pendiente: {amount(remaining(s.charge!), chosenCurrency)}.
              Registra el depósito real, aunque sea parcial.
            </p>
            <Field label="Dinero efectivamente recibido o pagado">
              <input
                name="amount"
                required
                type="number"
                min="0"
                step="0.01"
                defaultValue={remaining(s.charge!) / 100}
              />
            </Field>
            <Field label="Cuenta del movimiento">
              {accounts("account_id", true)}
            </Field>
            <details>
              <summary>Retención o detracción acreditada</summary>
              <p>
                Solo con comprobante. No es dinero disponible en esta cuenta. Si
                separas un importe, reduce el efectivo de arriba.
              </p>
              <Field label="Tipo">
                <select
                  value={creditKind}
                  onChange={(e) => setCreditKind(e.target.value)}
                >
                  <option value="none">Ninguna registrada</option>
                  <option value="retention">Retención acreditada</option>
                  <option value="detraction">Detracción acreditada</option>
                </select>
              </Field>
              {creditKind !== "none" && (
                <Field label="Importe acreditado">
                  <input
                    name="credit"
                    type="number"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </Field>
              )}
            </details>
          </>
        )}
        {s.kind === "transfer" && (
          <>
            <Field label="Concepto">
              <input
                name="title"
                defaultValue="Transferencia entre cuentas"
                required
              />
            </Field>
            <Field label="Moneda">
              <select
                value={chosenCurrency}
                onChange={(e) => setCurrency(e.target.value)}
              >
                <option value="PEN">Soles</option>
                <option value="USD">Dólares</option>
              </select>
            </Field>
            <Field label="Cuenta de origen">{accounts("account_id")}</Field>
            <Field label="Cuenta de destino">
              {accounts("destination_id")}
            </Field>
            <Field label="Importe">
              <input
                name="amount"
                type="number"
                required
                min="0.01"
                step="0.01"
              />
            </Field>
            <p className={styles.hint}>
              También sirve para retiros y reembolsos entre estas cuentas. No se
              cuenta nuevamente como ingreso o gasto. No ejecuta transferencias
              bancarias.
            </p>
          </>
        )}
        {["voidMovement", "voidCharge"].includes(s.kind) ? (
          <>
            <p>
              Se conservará el registro y quedará anulado. Una anulación de pago
              restaura el saldo pendiente.
            </p>
            <Field label="Motivo">
              <textarea name="reason" required maxLength={300} />
            </Field>
          </>
        ) : (
          <Field
            label={
              s.kind === "rule"
                ? "Fecha de inicio"
                : s.kind === "account"
                  ? "Fecha de apertura"
                  : s.kind === "charge" || (s.kind === "expense" && !paid)
                    ? "Vencimiento"
                    : "Fecha del movimiento"
            }
          >
            <input
              name="date"
              type="date"
              required
              defaultValue={s.account?.opening_date || data.today}
              max={
                s.kind === "payment" ||
                s.kind === "transfer" ||
                (s.kind === "expense" && paid)
                  ? data.today
                  : undefined
              }
            />
          </Field>
        )}
        {(hasInfo || s.kind === "account") && (
          <Field label="Notas / proveedor / sustento">
            <textarea
              name="note"
              maxLength={2000}
              defaultValue={s.account?.note || ""}
            />
          </Field>
        )}
        <div className={styles.dialogFooter}>
          <button type="button" onClick={onClose} disabled={busy}>
            Cancelar
          </button>
          <button className={styles.primary} disabled={busy}>
            {busy ? "Guardando…" : "Guardar registro"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
