"use client";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Mic,
  Square,
  ArrowUpRight,
  Paperclip,
  Wallet,
  X,
} from "lucide-react";
import {
  amount,
  today,
  remaining,
  ownerNames,
  accountUsageName,
  type FinanceData,
} from "@/lib/finanzas/model";
import { prepareQuickEntry, reviewClassification, type QuickDraft } from "@/lib/finanzas/quick-entry";
import { useQuickVoice } from "./use-quick-voice";
import { QuickTransferReview } from "./quick-transfer-review";
import styles from "./finance.module.css";
import q from "./quick-entry.module.css";
export function QuickEntry({
  data,
  scope,
  currency,
  onSave,
}: {
  data: FinanceData;
  scope: string;
  currency: string;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const [text, setText] = useState(""),
    [draft, setDraft] = useState<QuickDraft | null>(null),
    [problems, setProblems] = useState<string[]>([]),
    [saved, setSaved] = useState("");
  const file = useRef<HTMLInputElement>(null);
  function prepare(value = text) {
    setSaved("");
    const result = prepareQuickEntry(value, {
      ...data,
      today: today(),
      scope: scope === "personal" ? "personal" : "agency",
      currency: currency === "USD" ? "USD" : "PEN",
    });
    setProblems(result.problems);
    if (!result.problems.length) setDraft(result);
  }
  const voice = useQuickVoice((value) => {
    setText(value);
    prepare(value);
  });
  const recording = voice.status === "recording",
    working = voice.status !== "idle";
  async function saveDraft(p: Record<string, unknown>) {
    await onSave(p);
    setSaved(p.action === "transfer"
      ? `Transferencia registrada: ${amount(p.amount as number, data.accounts.find((a) => a.id === p.account_id)?.currency || draft?.currency || "PEN")}. Ambos saldos actualizados.`
      : `${p.kind === "income" ? "Cobro" : "Gasto"} registrado: ${amount(p.amount as number, p.currency as string)}.`);
    setText("");
    setDraft(null);
  }
  return (
    <section className={q.quick} aria-label="Registro rápido">
      <div className={q.head}>
        <div>
          <h2>Registra en una frase</h2>
          <p>Escribe o dicta. Revisa y confirma.</p>
        </div>
        <span className={q.tag}>Gastos, cobros y transferencias</span>
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          prepare();
        }}
      >
        <textarea
          aria-label="Describe el gasto, cobro o transferencia"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setProblems([]);
            setSaved("");
          }}
          maxLength={2000}
          rows={2}
          disabled={working}
          placeholder="Gasté 100 soles en movilidad con mi BCP…"
        />
        <div className={q.controls}>
          <button
            type="button"
            onClick={() => (recording ? voice.stop() : void voice.start())}
            disabled={working && !recording}
            className={recording ? q.recording : ""}
          >
            <>
              {recording ? <Square size={18} /> : <Mic size={18} />}{" "}
              {recording ? "Terminar audio" : "Dictar"}
            </>
          </button>
          {voice.status === "permission" || recording ? (
            <button
              type="button"
              onClick={voice.cancel}
              aria-label="Cancelar grabación"
            >
              <X size={18} />
            </button>
          ) : (
            <button
              type="button"
              aria-label="Adjuntar audio"
              title="Adjuntar audio"
              onClick={() => file.current?.click()}
              disabled={working}
            >
              <Paperclip size={18} />
            </button>
          )}
          <button
            type="submit"
            className={styles.primary}
            disabled={!text.trim() || working}
          >
            Preparar <ArrowUpRight size={18} />
          </button>
        </div>
        <input
          ref={file}
          hidden
          type="file"
          accept="audio/*,.m4a,.webm"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void voice.transcribe(f);
            e.target.value = "";
          }}
        />
      </form>
      {working && (
        <p role="status">
          {recording
            ? "Te escucho… toca Terminar audio. Máximo 1 minuto."
            : voice.status === "permission"
              ? "Permite usar el micrófono para comenzar."
              : "Transcribiendo tu audio…"}
        </p>
      )}
      {voice.error && (
        <div role="alert" className={q.error}>
          {voice.error}
          {voice.retryable && (
            <button onClick={voice.retry}>Reintentar audio</button>
          )}
        </div>
      )}
      {!!problems.length && (
        <div role="alert" className={q.error}>
          {problems.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </div>
      )}
      {saved && (
        <p role="status" className={q.saved}>
          <Check size={16} /> {saved}
        </p>
      )}
      <details className={q.examples}>
        <summary>Ver ejemplos y cómo funciona</summary>
        <p>
          «Gasté 100 soles en taxi con BCP de Pedro». «Recibí 1,000 soles de
          Kintu en Yape de Nayeli».
          {" "}«Me transferí 1,500 soles del BCP de Nayeli al BCP de Pedro».
        </p>
        <small>
          El audio se transcribe en tu VPS y no se guarda en tu historial.
          Ningún movimiento se registra hasta que confirmes.
        </small>
      </details>
      {draft?.kind === "transfer" ? (
        <QuickTransferReview initial={draft} data={data} onClose={() => setDraft(null)} onSave={saveDraft} />
      ) : draft && (
        <QuickReview
          initial={draft}
          data={data}
          onClose={() => setDraft(null)}
          onSave={saveDraft}
        />
      )}
    </section>
  );
}
function QuickReview({
  initial,
  data,
  onClose,
  onSave,
}: {
  initial: QuickDraft;
  data: FinanceData;
  onClose: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    lock = useRef(false),
    attempt = useRef<{ hash: string; id: string } | null>(null);
  const [d, setD] = useState(initial),
    [accountId, setAccountId] = useState(
      initial.accountIds.length === 1 ? initial.accountIds[0] : "",
    ),
    [chargeId, setChargeId] = useState(
      initial.chargeIds.length === 1
        ? initial.chargeIds[0]
        : initial.chargeIds.length > 1
          ? ""
          : "new",
    );
  const [showAllAccounts, setShowAllAccounts] = useState(false),
    [setup, setSetup] = useState(false),
    [bankOwner, setBankOwner] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  const account = data.accounts.find((a) => a.id === accountId);
  const charge = data.charges.find((c) => c.id === chargeId);
  const {owner, space} = reviewClassification(d, account, charge);
  const coin = charge?.currency || d.currency;
  const needsSetup = !!account && (!account.currency || !account.owner),
    accountOwner = account?.owner || bankOwner;
  const compatible = data.accounts.filter(
    (a) => !a.currency || a.currency === coin,
  );
  const matches = compatible.filter((a) => initial.accountIds.includes(a.id));
  const accounts = matches.length && !showAllAccounts ? matches : compatible;
  const candidates = data.charges.filter(
    (c) =>
      c.kind === d.kind &&
      c.currency === coin &&
      c.state !== "void" &&
      remaining(c) > 0,
  );
  const missing =
    !accountId ||
    !owner ||
    !d.amount ||
    !d.date ||
    !d.title.trim() ||
    !chargeId ||
    (needsSetup && (!setup || !accountOwner)) ||
    !!(account?.currency && account.currency !== coin) ||
    !!(charge && d.amount > remaining(charge));
  async function save() {
    if (lock.current || missing) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const p = {
      action: "quickEntry",
      kind: d.kind,
      title: charge?.title || d.title,
      scope: space,
      owner,
      currency: coin,
      amount: d.amount,
      date: d.date,
      account_id: accountId,
      charge_id: charge?.id || null,
      configure_account: needsSetup && setup,
      account_owner: needsSetup ? accountOwner : undefined,
      note: d.source,
    };
    const hash = JSON.stringify(p);
    if (attempt.current?.hash !== hash)
      attempt.current = { hash, id: crypto.randomUUID() };
    try {
      await onSave({ ...p, requestId: attempt.current.id });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={ref}
      className={`${styles.dialog} ${q.review}`}
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
      aria-label="Confirmar registro rápido"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className={q.head}>
          <h2>Confirma tu {d.kind === "income" ? "cobro" : "gasto"}</h2>
          <button
            type="button"
            aria-label="Cerrar revisión"
            disabled={busy}
            onClick={onClose}
          >
            <X size={19} />
          </button>
        </div>
        <div className={q.hero}>
          <span>
            {d.kind === "income" ? "Dinero recibido" : "Dinero pagado"}
          </span>
          <strong>{amount(d.amount || 0, coin)}</strong>
          <b>{charge?.title || d.title}</b>
        </div>
        <div className={q.summary}>
          <span>
            {space === "agency" ? "Agencia" : "Personales"} ·{" "}
            {owner ? ownerNames[owner] : "Falta titular"}
          </span>
          <span>
            {d.date === data.today
              ? "Hoy"
              : !d.date
                ? "Falta fecha"
                : new Intl.DateTimeFormat("es-PE", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  }).format(new Date(d.date + "T12:00:00Z"))}
          </span>
        </div>
        {error && (
          <p role="alert" className={q.error}>
            {error}
          </p>
        )}
        <fieldset disabled={busy} className={q.fields}>
          <legend className={q.srOnly}>
            Completa solo los datos que faltan
          </legend>
          {account ? (
            <div className={q.account}>
              <Wallet size={20} />
              <div>
                <strong>
                  {account.name} · {accountUsageName(account.usage)}
                </strong>
                <small>
                  {account.owner
                    ? ownerNames[account.owner]
                    : "Titular por confirmar"}
                </small>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAccountId("");
                  setShowAllAccounts(true);
                  setSetup(false);
                }}
              >
                Cambiar
              </button>
            </div>
          ) : (
            <div>
              <h3>
                ¿Qué cuenta {d.kind === "income" ? "recibió" : "pagó"} el
                dinero?
              </h3>
              <div className={q.choices}>
                {accounts.map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => {
                      setAccountId(a.id);
                      setSetup(false);
                      setBankOwner("");
                    }}
                  >
                    {a.name}
                    {` · ${accountUsageName(a.usage)}`}
                    {a.currency ? ` · ${a.currency}` : ""}
                  </button>
                ))}
              </div>
              {!!matches.length && !showAllAccounts && (
                <button type="button" onClick={() => setShowAllAccounts(true)}>
                  Otra cuenta
                </button>
              )}
            </div>
          )}
          {account?.usage && account.usage !== space && (
            <div className={q.hint} role="status">
              <p>
                La cuenta es de uso{" "}
                {accountUsageName(account.usage).toLowerCase()}, pero este{" "}
                {d.kind === "income" ? "cobro" : "gasto"} se registrará en{" "}
                {space === "agency" ? "Agencia" : "Personales"}. Si pagaste
                desde la cuenta equivocada, conserva la cuenta real y el tipo
                real de gasto.
              </p>
              {!charge && (
                <button
                  type="button"
                  onClick={() =>
                    setD({
                      ...d,
                      scope: account.usage!,
                      scopeExplicit: true,
                      owner:
                        account.usage === "agency"
                          ? "agency"
                          : account.owner === "agency"
                            ? null
                            : account.owner,
                    })
                  }
                >
                  {account.usage === "personal"
                    ? "Este registro es personal"
                    : "Este registro es de la agencia"}
                </button>
              )}
            </div>
          )}
          {account?.currency && account.currency !== coin && (
            <p role="alert" className={q.error}>
              Esta cuenta es {account.currency}. Selecciona otra cuenta para{" "}
              {coin}.
            </p>
          )}
          {needsSetup && (
            <div className={q.setup}>
              {!account.owner && (
                <label>
                  Titular de la cuenta
                  <select
                    aria-label="Titular de la cuenta"
                    value={bankOwner}
                    onChange={(e) => setBankOwner(e.target.value)}
                  >
                    <option value="">Elige el titular</option>
                    {Object.entries(ownerNames).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                <input
                  type="checkbox"
                  checked={setup}
                  onChange={(e) => setSetup(e.target.checked)}
                />{" "}
                Confirmo que esta cuenta es en{" "}
                {coin === "PEN" ? "soles" : "dólares"}
                {accountOwner
                  ? ` de ${ownerNames[accountOwner as keyof typeof ownerNames]}`
                  : ""}
                .
              </label>
              <small>
                Solo se completa esta configuración pendiente. El saldo inicial
                sigue sin completar.
              </small>
            </div>
          )}
          {!owner && (
            <label>
              ¿De quién es el ingreso o gasto?
              <select
                aria-label="Titular del movimiento"
                value={d.owner || ""}
                onChange={(e) =>
                  setD({ ...d, owner: e.target.value as QuickDraft["owner"] })
                }
              >
                <option value="">Elige una persona</option>
                <option value="pedro">Pedro Reyes</option>
                <option value="nayeli">Nayeli Sotelo</option>
              </select>
            </label>
          )}
          {(initial.chargeIds.length > 0 || chargeId !== "new") && (
            <label>
              {initial.chargeIds.length > 1
                ? "Encontré varios pendientes. ¿A cuál corresponde?"
                : "Aplicar al pendiente existente"}
              <select
                aria-label="Pendiente relacionado"
                value={chargeId}
                onChange={(e) => setChargeId(e.target.value)}
              >
                <option value="" disabled>
                  Selecciona un pendiente
                </option>
                {candidates.map((c) => (
                  <option value={c.id} key={c.id}>
                    {c.title} · {c.due} · {amount(remaining(c), c.currency)}
                  </option>
                ))}
                <option value="new">
                  Es otro {d.kind === "income" ? "cobro" : "gasto"} nuevo
                </option>
              </select>
            </label>
          )}
          {charge && (
            <p className={q.hint}>
              {d.amount! > remaining(charge)
                ? "El importe supera el saldo. Corrígelo antes de guardar."
                : `${d.amount === remaining(charge) ? "Cancela" : "Abona a"} este pendiente. Saldo actual: ${amount(remaining(charge), coin)}.`}
            </p>
          )}
          <details className={q.edit}>
            <summary>Corregir datos</summary>
            <div className={q.editGrid}>
              <label>
                Importe
                <input
                  aria-label="Importe del registro"
                  type="number"
                  min="0.01"
                  max="1000000"
                  step="0.01"
                  value={d.amount === null ? "" : d.amount / 100}
                  onChange={(e) =>
                    setD({
                      ...d,
                      amount: e.target.value
                        ? Math.round(Number(e.target.value) * 100)
                        : null,
                    })
                  }
                />
              </label>
              <label>
                Fecha
                <input
                  aria-label="Fecha del registro"
                  type="date"
                  value={d.date}
                  max={data.today}
                  required
                  onChange={(e) => setD({ ...d, date: e.target.value })}
                />
              </label>
              {!charge && (
                <>
                  <label>
                    Concepto
                    <input
                      aria-label="Concepto del registro"
                      value={d.title}
                      required
                      maxLength={300}
                      onChange={(e) => setD({ ...d, title: e.target.value })}
                    />
                  </label>
                  <label>
                    Moneda
                    <select
                      value={d.currency}
                      onChange={(e) => {
                        setD({
                          ...d,
                          currency: e.target.value as QuickDraft["currency"],
                        });
                        setAccountId("");
                        setSetup(false);
                      }}
                    >
                      <option value="PEN">Soles</option>
                      <option value="USD">Dólares</option>
                    </select>
                  </label>
                  <label>
                    Espacio
                    <select
                      value={space}
                      onChange={(e) =>
                        setD({
                          ...d,
                          scope: e.target.value as QuickDraft["scope"],
                          scopeExplicit: true,
                          owner: e.target.value === "agency" ? "agency" : null,
                        })
                      }
                    >
                      <option value="agency">Agencia</option>
                      <option value="personal">Personales</option>
                    </select>
                  </label>
                  <label>
                    Titular del movimiento
                    <select
                      value={owner || ""}
                      onChange={(e) =>
                        setD({
                          ...d,
                          owner: e.target.value as QuickDraft["owner"],
                          scope: space,
                          scopeExplicit: true,
                        })
                      }
                    >
                      <option value="" disabled>
                        Elige un titular
                      </option>
                      {Object.entries(ownerNames).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}
              {initial.chargeIds.length === 0 && chargeId === "new" && (
                <button type="button" onClick={() => setChargeId("")}>
                  Vincular a un pendiente
                </button>
              )}
            </div>
          </details>
        </fieldset>
        <div className={q.confirm}>
          <small>
            Se registra el pago en tu historial. No mueve dinero en el banco.
          </small>
          <button
            className={styles.primary}
            disabled={busy || missing}
            type="submit"
          >
            <Check size={18} />
            {busy
              ? "Guardando…"
              : `Confirmar ${d.kind === "income" ? "cobro" : "gasto"}`}
          </button>
        </div>
      </form>
    </dialog>
  );
}
