"use client";
import { useState, type FormEvent } from "react";
import { amount, type Receipt } from "@/lib/finanzas/model";
import styles from "./finance.module.css";
export function DocumentsPanel({
  initial,
  charges = [],
  manager,
  month,
  onReview,
}: {
  initial: Receipt[];
  charges?: { id: string; title: string }[];
  manager: boolean;
  month: string;
  onReview?: (id: string, status: string, note: string) => Promise<void>;
}) {
  const [docs, setDocs] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [success, setSuccess] = useState(""),
    [review, setReview] = useState<string | null>(null);
  async function refresh() {
    const r = await fetch("/api/finanzas/documentos", { cache: "no-store" }),
      j = await r.json();
    if (!r.ok) throw Error(j.error);
    setDocs(j);
  }
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    if (busy) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const f = new FormData(form);
      f.set("gross", String(Math.round(Number(f.get("gross")) * 100)));
      f.set(
        "withholding",
        String(Math.round(Number(f.get("withholding") || 0) * 100)),
      );
      const r = await fetch("/api/finanzas/documentos", {
          method: "POST",
          body: f,
        }),
        j = await r.json();
      if (!r.ok) throw Error(j.error);
      await refresh();
      form.reset();
      setSuccess("Documento recibido. Esto no lo marca como pagado.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function reviewDoc(e: FormEvent<HTMLFormElement>, id: string) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const f = new FormData(e.currentTarget);
      await onReview?.(id, String(f.get("status")), String(f.get("note")));
      await refresh();
      setReview(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className={styles.panel}>
      <h2>{manager ? "Documentos privados" : "Mis recibos por honorarios"}</h2>
      <p>
        {manager
          ? "Revisa los RH del equipo y adjunta comprobantes de gastos."
          : "Solo tú, Pedro y Nayeli pueden consultar tus documentos."}{" "}
        Adjuntar un documento no registra un pago ni determina que sea
        deducible.
      </p>
      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
      {success && (
        <p className={styles.success} role="status">
          {success}
        </p>
      )}
      <details>
        <summary>Subir documento · PDF o imagen, máximo 8 MB</summary>
        <form onSubmit={submit} className={styles.upload}>
          <label>
            Documento
            <select name="kind">
              <option value="rh">Recibo por honorarios</option>
              {manager && <option value="expense">Comprobante de gasto</option>}
            </select>
          </label>
          <label>
            Número de comprobante
            <input
              name="number"
              required
              maxLength={100}
              placeholder="E001-123"
            />
          </label>
          <label>
            Periodo
            <input type="month" name="period" defaultValue={month} required />
          </label>
          <label>
            Importe bruto
            <input type="number" name="gross" min="0.01" step="0.01" required />
          </label>
          <label>
            Retención del documento
            <input
              type="number"
              name="withholding"
              min="0"
              step="0.01"
              defaultValue="0"
              required
            />
          </label>
          <label>
            Moneda
            <select name="currency">
              <option value="PEN">Soles</option>
              <option value="USD">Dólares</option>
            </select>
          </label>
          <label>
            Vincular al cobro o pago
            <select name="charge_id">
              <option value="">Sin vincular</option>
              {charges.map((c) => (
                <option value={c.id} key={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            Archivo
            <input
              name="file"
              type="file"
              required
              accept="application/pdf,image/png,image/jpeg,image/webp"
            />
          </label>
          <button className={styles.primary} disabled={busy}>
            {busy ? "Guardando…" : "Subir documento"}
          </button>
        </form>
      </details>
      <div className={styles.tableWrap}>
        <table>
          <thead>
            <tr>
              {manager && <th>Presentado por</th>}
              <th>Documento</th>
              <th>Periodo</th>
              <th>Bruto / neto</th>
              <th>Revisión</th>
              <th>Archivo</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                {manager && <td>{d.member_name}</td>}
                <td>
                  {d.number}
                  {d.charge_title && <small>{d.charge_title}</small>}
                  <small>{d.kind === "rh" ? "RH" : "Gasto"}</small>
                </td>
                <td>{d.period}</td>
                <td>
                  {amount(d.gross, d.currency)}
                  <small>
                    Neto: {amount(d.gross - d.withholding, d.currency)}
                  </small>
                </td>
                <td>
                  {d.status === "received"
                    ? "Recibido"
                    : d.status === "reviewed"
                      ? "Revisado"
                      : "Requiere corrección"}
                  <small>{d.review_note}</small>
                  {manager && (
                    <button
                      onClick={() => setReview(review === d.id ? null : d.id)}
                    >
                      Revisar
                    </button>
                  )}
                  {review === d.id && (
                    <form onSubmit={(e) => reviewDoc(e, d.id)}>
                      <select name="status">
                        <option value="reviewed">Revisado</option>
                        <option value="rejected">Requiere corrección</option>
                      </select>
                      <input
                        name="note"
                        aria-label="Nota de revisión"
                        required
                        maxLength={300}
                        placeholder="Nota de revisión"
                      />
                      <button disabled={busy}>Guardar revisión</button>
                    </form>
                  )}
                </td>
                <td>
                  <a href={"/api/finanzas/documentos/" + d.id}>
                    Descargar original ↗
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!docs.length && (
        <p>
          Aún no hay documentos. Tus archivos quedarán aquí con su historial de
          revisión.
        </p>
      )}
    </section>
  );
}
