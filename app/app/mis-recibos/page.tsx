import { redirect } from "next/navigation";
import { financeMember, documents, generate } from "@/lib/finanzas/server";
import { strategyDB } from "@/lib/estrategia/db";
import { today, amount } from "@/lib/finanzas/model";
import { DocumentsPanel } from "../finanzas/documents-panel";
import styles from "../finanzas/finance.module.css";
export const dynamic = "force-dynamic";
export default async function Page() {
  const a = await financeMember();
  if (!a) redirect("/inicio");
  const month = today().slice(0, 7);
  await generate(month);
  const rows = (
    await strategyDB().query(
      `SELECT c.id,c.title,c.currency,c.base+c.tax AS total,c.due::text,c.state,COALESCE((SELECT sum(m.amount+m.credit)::int FROM finance_movements m WHERE m.charge_id=c.id AND m.void_reason IS NULL),0)+c.prior_credit AS paid FROM finance_charges c WHERE c.member_id=$1 AND c.kind='expense' AND c.state<>'void' ORDER BY c.due DESC LIMIT 100`,
      [a.id],
    )
  ).rows;
  // Even finance managers see only their own files and payables in this personal route.
  const docs = await documents({ ...a, manager: false });
  return (
    <main className={styles.root}>
      <span className={styles.eyebrow}>MI ESPACIO · DOCUMENTOS</span>
      <h1>Mis recibos</h1>
      <p>
        Adjunta tu RH y consulta la revisión. Tu información se comparte
        únicamente con Pedro y Nayeli.
      </p>
      <DocumentsPanel
        initial={docs}
        charges={rows.map((r) => ({
          id: r.id,
          title: r.title + " · " + r.due,
        }))}
        manager={false}
        month={month}
      />
      <section className={styles.panel}>
        <h2>Mis pagos registrados</h2>
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>Concepto</th>
                <th>Fecha prevista</th>
                <th>Importe</th>
                <th>Registrado como pagado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={i}>
                  <td>{r.title}</td>
                  <td>{r.due}</td>
                  <td>{amount(r.total, r.currency)}</td>
                  <td>{amount(r.paid, r.currency)}</td>
                  <td>
                    {r.paid >= r.total
                      ? "Saldado"
                      : r.state === "review"
                        ? "Por confirmar"
                        : r.paid
                          ? "Pago parcial"
                          : "Pendiente"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && <p>Todavía no hay pagos programados a tu nombre.</p>}
      </section>
    </main>
  );
}
