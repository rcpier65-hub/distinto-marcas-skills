import { Wallet, ArrowUpRight } from "lucide-react";
import {
  accountBalance,
  accountTotals,
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
}: {
  accounts: Account[];
  today: string;
  onConfigure: (account: Account) => void;
  onManage?: () => void;
  detailed?: boolean;
}) {
  const missing = accounts.filter((a) => accountBalance(a) === null).length;
  return (
    <section className={styles.balances} aria-label="Saldo por cuenta">
      <div className={styles.balanceHeading}>
        <div>
          <h2><Wallet size={20} /> Saldo por cuenta</h2>
          <small>
            Todas tus cuentas · al {today.split("-").reverse().join("/")}
          </small>
        </div>
        {onManage && (
          <button onClick={onManage}>Ver cuentas <ArrowUpRight size={15} /></button>
        )}
      </div>
      <div className={styles.balanceTotals}>
        {(["PEN", "USD"] as const).map((currency) => {
          const total = accountTotals(accounts, currency);
          return (
            <div key={currency}>
              <span>Total conocido · {currency === "PEN" ? "soles" : "dólares"}</span>
              <strong>{total.total === null ? "Por completar" : amount(total.total, currency)}</strong>
              <small>
                {total.known} {total.known === 1 ? "cuenta con saldo" : "cuentas con saldo"}
                {total.pending > 0 && ` · ${total.pending} por completar`}
              </small>
            </div>
          );
        })}
      </div>
      <div className={styles.balanceGrid}>
        {accounts.map((a) => {
          const balance = accountBalance(a);
          return (
            <article className={styles.balanceCard} key={a.id} aria-label={a.name}>
              <h3>{a.name}</h3>
              <small>{a.owner ? ownerNames[a.owner] : "Titular por completar"} · {a.currency || "Moneda pendiente"}</small>
              <span className={styles.balanceLabel}>Saldo registrado</span>
              <strong className={balance === null ? styles.balanceUnknown : styles.balanceAmount}>
                {balance === null ? "Por completar" : amount(balance, a.currency!)}
              </strong>
              <small>Movimientos netos: {a.currency ? amount(a.movements, a.currency) : "—"}</small>
              {detailed && (
                <>
                  {a.opening_date && <small>Apertura: {a.opening_date}</small>}
                  {a.note && <p>{a.note}</p>}
                </>
              )}
              <button onClick={() => onConfigure(a)} aria-label={`${balance === null ? "Completar saldo" : "Configurar"}: ${a.name}`}>
                {balance === null ? "Completar saldo" : "Configurar"}
              </button>
            </article>
          );
        })}
      </div>
      {!accounts.length && <p>Añade tu primera cuenta en Cuentas.</p>}
      <p className={styles.balanceFootnote}>
        {missing > 0 && `${missing} ${missing === 1 ? "cuenta pendiente" : "cuentas pendientes"} de saldo inicial o moneda. `}
        Calculado con saldo inicial y movimientos registrados. Incluye agencia y
        personales de todos los meses; no depende del filtro mensual. Sin conexión
        al banco.
      </p>
    </section>
  );
}
