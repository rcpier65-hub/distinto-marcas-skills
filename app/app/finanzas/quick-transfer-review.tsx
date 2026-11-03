"use client";
import { useEffect, useRef, useState } from "react";
import { ArrowDown, Check, X } from "lucide-react";
import { accountBalance, accountUsageName, amount, today, type FinanceData } from "@/lib/finanzas/model";
import { parseMoney, type QuickDraft } from "@/lib/finanzas/quick-entry";
import styles from "./finance.module.css";
import q from "./quick-entry.module.css";

export function QuickTransferReview({ initial, data, onClose, onSave }: {
  initial: QuickDraft;
  data: FinanceData;
  onClose: () => void;
  onSave: (p: Record<string, unknown>) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const lock = useRef(false);
  const attempt = useRef<{ hash: string; id: string } | null>(null);
  const initialAccount = (ids: string[]) => ids.length === 1 && data.accounts.some((a) => a.id === ids[0] && a.currency === initial.currency && a.owner) ? ids[0] : "";
  const [sourceId, setSourceId] = useState(() => initialAccount(initial.accountIds));
  const [destinationId, setDestinationId] = useState(() => initialAccount(initial.destinationIds));
  const [coin, setCoin] = useState(initial.currency);
  const [value, setValue] = useState(initial.amount ? String(initial.amount / 100) : "");
  const [date, setDate] = useState(initial.date);
  const [title, setTitle] = useState(initial.title);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { ref.current?.showModal(); }, []);

  const cents = parseMoney(value);
  const accounts = data.accounts.filter((a) => a.currency === coin && a.owner);
  const source = accounts.find((a) => a.id === sourceId);
  const destination = accounts.find((a) => a.id === destinationId);
  const sameAccount = !!sourceId && sourceId === destinationId;
  const sourceBalance = source ? accountBalance(source) : null;
  const destinationBalance = destination ? accountBalance(destination) : null;
  const validDate = /^20\d{2}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date && date <= today();
  const missing = !cents || !source || !destination || sameAccount || !validDate || !title.trim();
  // No inventar saldos si falta la apertura o si el movimiento es anterior a ella.
  const previewSource = sourceBalance !== null && cents && date >= (source?.opening_date || "") ? sourceBalance - cents : null;
  const previewDestination = destinationBalance !== null && cents && date >= (destination?.opening_date || "") ? destinationBalance + cents : null;

  async function save() {
    if (lock.current || missing) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const p = { action: "transfer", account_id: sourceId, destination_id: destinationId, amount: cents, date, title: title.trim() };
    const hash = JSON.stringify(p);
    if (attempt.current?.hash !== hash) attempt.current = { hash, id: crypto.randomUUID() };
    try { await onSave({ ...p, requestId: attempt.current.id }); }
    catch (e) { setError((e as Error).message); }
    finally { lock.current = false; setBusy(false); }
  }

  return <dialog ref={ref} className={`${styles.dialog} ${q.review}`} aria-label="Confirmar transferencia" onCancel={(e) => { e.preventDefault(); if (!busy) onClose(); }}>
    <form onSubmit={(e) => { e.preventDefault(); void save(); }}>
      <div className={q.head}>
        <h2>Transferir entre cuentas</h2>
        <button type="button" aria-label="Cerrar revisión" disabled={busy} onClick={onClose}><X size={19} /></button>
      </div>
      <p className={q.hint}>Un solo movimiento: sale de una cuenta y entra en la otra.</p>
      {error && <p role="alert" className={q.error}>{error}</p>}
      <fieldset disabled={busy} className={q.fields}>
        <legend className={q.srOnly}>Revisa el importe y las dos cuentas</legend>
        <div className={q.transferAmount}>
          <label>Importe<input inputMode="decimal" required value={value} placeholder="1500" onChange={(e) => setValue(e.target.value)} /></label>
          <label>Moneda<select value={coin} onChange={(e) => { setCoin(e.target.value as "PEN" | "USD"); setSourceId(""); setDestinationId(""); }}><option value="PEN">Soles</option><option value="USD">Dólares</option></select></label>
        </div>
        <label>Desde · cuenta de origen<select value={sourceId} required onChange={(e) => setSourceId(e.target.value)}>
          <option value="">¿De qué cuenta salió?</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {accountUsageName(a.usage)} · Saldo: {accountBalance(a) === null ? "Por completar" : amount(accountBalance(a)!, coin)}</option>)}
        </select></label>
        {source && <p className={q.balancePreview}>Saldo actual: <strong>{sourceBalance !== null ? amount(sourceBalance, coin) : "Por completar"}</strong><br />Sale {amount(cents || 0, coin)} · Saldo resultante: <strong>{previewSource !== null ? amount(previewSource, coin) : "Por completar"}</strong></p>}
        <ArrowDown className={q.transferArrow} size={18} aria-hidden="true" />
        <label>Hacia · cuenta de destino<select value={destinationId} required onChange={(e) => setDestinationId(e.target.value)}>
          <option value="">¿A qué cuenta llegó?</option>
          {accounts.map((a) => <option key={a.id} value={a.id}>{a.name} · {accountUsageName(a.usage)} · Saldo: {accountBalance(a) === null ? "Por completar" : amount(accountBalance(a)!, coin)}</option>)}
        </select></label>
        {destination && <p className={q.balancePreview}>Saldo actual: <strong>{destinationBalance !== null ? amount(destinationBalance, coin) : "Por completar"}</strong><br />Entra {amount(cents || 0, coin)} · Saldo resultante: <strong>{previewDestination !== null ? amount(previewDestination, coin) : "Por completar"}</strong></p>}
        {sameAccount && <p className={q.error} role="alert">Elige dos cuentas diferentes.</p>}
        {accounts.length < 2 && <p className={q.hint}>Configura al menos dos cuentas con titular y esta moneda en Cuentas.</p>}
        <details className={q.edit} open={!validDate}>
          <summary>Fecha: {date || "Por completar"} · editar detalle</summary>
          <label>Fecha de transferencia<input type="date" required max={today()} value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <label>Concepto<input required maxLength={300} value={title} onChange={(e) => setTitle(e.target.value)} /></label>
        </details>
      </fieldset>
      <div className={q.confirm}>
        <small>Actualiza los saldos del sistema. No realiza una transferencia bancaria.</small>
        <button type="submit" className={styles.primary} disabled={busy || missing}><Check size={18} />{busy ? "Registrando…" : "Confirmar transferencia"}</button>
      </div>
    </form>
  </dialog>;
}
