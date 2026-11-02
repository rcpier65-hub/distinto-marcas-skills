import { Wallet, ArrowUpRight } from "lucide-react";
import {
  accountBalance,
  accountTotals,
  accountUsageName,
  amount,
  ownerNames,
  type Account,
} from "@/lib/finanzas/model";
import styles from "./finance.module.css";

export function AccountBalances({
  accounts,
  today,
  onConfigure,
  onManage,
  detailed = false,
  usage,
  currency,
}: {
  accounts: Account[];
  today: string;
  onConfigure: (account: Account) => void;
  onManage?: () => void;
  detailed?: boolean;
  usage?: "agency" | "personal";
  currency?: "PEN" | "USD";
}) {
  const missing = accounts.filter((a) => accountBalance(a) === null).length;
  const usages: Account["usage"][] = usage ? [usage] : [
    "agency",
    "personal",
    ...(accounts.some((a) => !a.usage) ? [null] : []),
  ];
  const currencies = currency ? [currency] : (["PEN", "USD"] as const).filter(
    (c) => c === "PEN" || accounts.some((a) => a.currency === c),
  );
  return (
    <section className={styles.balances} aria-label="Saldo por cuenta">
      <div className={styles.balanceHeading}>
        <div>
          <h2>
            <Wallet size={20} /> Saldo por cuenta
          </h2>
          <small>
            {usage ? (usage === "personal" ? "Cuentas personales" : "Cuentas de agencia") : "Todas tus cuentas"} · al {today.split("-").reverse().join("/")}
          </small>
        </div>
        {onManage && (
          <button onClick={onManage}>
            Ver cuentas <ArrowUpRight size={15} />
          </button>
        )}
      </div>
      <div className={styles.balanceTotals}>
        {usages.flatMap((usage) =>
          currencies.map((currency) => {
            const total = accountTotals(accounts, currency, usage);
            return (
              <div key={`${usage}-${currency}`}>
                <span>
                  {accountUsageName(usage)} ·{" "}
                  {currency === "PEN" ? "soles" : "dólares"}
                </span>
                <strong>
                  {total.total === null
                    ? "Por completar"
                    : amount(total.total, currency)}
                </strong>
                <small>
                  {total.known}{" "}
                  {total.known === 1 ? "cuenta con saldo" : "cuentas con saldo"}
                  {total.pending > 0 && ` · ${total.pending} por completar`}
                </small>
              </div>
            );
          }),
        )}
      </div>
      <div className={styles.balanceGrid}>
        {accounts.map((a) => {
          const balance = accountBalance(a);
          return (
            <article
              className={styles.balanceCard}
              key={a.id}
              aria-label={a.name}
            >
              <h3>{a.name}</h3>
              <span
                className={styles.accountUsage}
                data-usage={a.usage || "unknown"}
              >
                {accountUsageName(a.usage)}
              </span>
              <small>
                {a.owner ? ownerNames[a.owner] : "Titular por completar"} ·{" "}
                {a.currency || "Moneda pendiente"}
              </small>
              <span className={styles.balanceLabel}>Saldo registrado</span>
              <strong
                className={
                  balance === null
                    ? styles.balanceUnknown
                    : styles.balanceAmount
                }
              >
                {balance === null
                  ? "Por completar"
                  : amount(balance, a.currency!)}
              </strong>
              <small>
                Movimientos netos:{" "}
                {a.currency ? amount(a.movements, a.currency) : "—"}
              </small>
              {detailed && (
                <>
                  {a.opening_date && <small>Apertura: {a.opening_date}</small>}
                  {a.note && <p>{a.note}</p>}
                </>
              )}
              <button
                onClick={() => onConfigure(a)}
                aria-label={`${balance === null ? "Completar saldo" : "Configurar"}: ${a.name}`}
              >
                {balance === null ? "Completar saldo" : "Configurar"}
              </button>
            </article>
          );
        })}
      </div>
      {!accounts.length && <p>Añade tu primera cuenta en Cuentas.</p>}
      <p className={styles.balanceFootnote}>
        {missing > 0 &&
          `${missing} ${missing === 1 ? "cuenta pendiente" : "cuentas pendientes"} de saldo inicial o moneda. `}
        Saldos separados por uso de la cuenta, con movimientos de todos los
        meses. La etiqueta no cambia el titular ni reclasifica gastos
        anteriores. Sin conexión al banco.
      </p>
    </section>
  );
}
