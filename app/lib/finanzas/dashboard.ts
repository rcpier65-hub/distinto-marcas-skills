import { accountTotals, occurrences, remaining, type Charge, type FinanceData } from "./model";

const sum = <T>(rows: T[], value: (row: T) => number) => rows.reduce((n, row) => n + value(row), 0);
// Reserva proporcional del IGV registrado. No calcula renta ni crédito fiscal.
export function withoutRecordedTax(cash: number, charge?: Charge) {
  const gross = charge ? charge.base + charge.tax : 0;
  return gross > 0 ? Math.round(cash * charge!.base / gross) : cash;
}
export function financeDashboard(data: FinanceData, scope: string, currency: string, month: string) {
  const inMonth = (date: string) => date.slice(0, 7) === month;
  const charges = data.charges.filter((c) => c.scope === scope && c.currency === currency && c.state !== "void");
  const due = charges.filter((c) => inMonth(c.due));
  const pending = due.filter((c) => remaining(c) > 0);
  const receivables = pending.filter((c) => c.kind === "income");
  const confirmed = receivables.filter((c) => c.state === "confirmed");
  const review = receivables.filter((c) => c.state === "review");
  const older = charges.filter((c) => c.kind === "income" && c.due.slice(0, 7) < month && remaining(c) > 0);
  const costsPending = pending.filter((c) => c.kind === "expense");
  const accounts = data.accounts.filter((a) => a.usage === scope && a.currency === currency);
  const ids = new Set(accounts.map((a) => a.id));
  const monthMoves = data.movements.filter((m) => inMonth(m.date) && m.currency === currency && !m.void_reason);
  const movements = monthMoves.filter((m) => m.kind === "transfer"
    ? (m.account_id !== null && ids.has(m.account_id)) || (m.destination_id !== null && ids.has(m.destination_id))
    : m.scope === scope);
  const income = movements.filter((m) => m.kind === "income");
  const expenses = movements.filter((m) => m.kind === "expense");
  const transfersIn = movements.filter((m) => m.kind === "transfer" && m.destination_id && ids.has(m.destination_id) && (!m.account_id || !ids.has(m.account_id)));
  const byId = new Map(data.charges.map((c) => [c.id, c]));
  const paid = sum(expenses, (m) => m.amount);
  const received = sum(income, (m) => m.amount);
  const expectedReceipts = sum(income, (m) => withoutRecordedTax(m.amount, byId.get(m.charge_id || "")))
    + sum(receivables, (c) => withoutRecordedTax(remaining(c), c));
  // Se suma solo lo pendiente a lo pagado: un abono vinculado nunca se duplica.
  const monthlyCosts = (data.monthlyCosts ?? []).filter((c) => c.scope === scope && c.currency === currency && c.starts_month <= month);
  const undatedCostsTotal = sum(monthlyCosts, (c) => c.amount);
  const expectedCosts = paid + sum(costsPending, remaining) + undatedCostsTotal;
  const operating = expectedReceipts - expectedCosts;
  let withdrawalLow = 0, withdrawalHigh = 0;
  const weekly = scope === "agency" && currency === "PEN" ? data.ownerWeeklyTarget : null;
  if (weekly != null) {
    const counts = Array.from({ length: 7 }, (_, day) => occurrences({ frequency: "weekly", day, starts: month + "-01", ends: null }, month).length);
    withdrawalLow = weekly * Math.min(...counts);
    withdrawalHigh = weekly * Math.max(...counts);
  } else if (scope === "agency" && currency === "PEN" && data.ownerTarget != null) {
    withdrawalLow = withdrawalHigh = data.ownerTarget;
  }
  return {
    accounts, balances: accountTotals(data.accounts, currency as "PEN" | "USD", scope as "agency" | "personal"),
    confirmed, review, older, costsPending, income, expenses, movements, transfersIn, monthlyCosts, undatedCostsTotal,
    confirmedTotal: sum(confirmed, remaining), reviewTotal: sum(review, remaining),
    olderTotal: sum(older.filter((c) => c.state === "confirmed"), remaining),
    pendingCostsTotal: sum(costsPending, remaining), received, paid,
    entriesTotal: received + sum(transfersIn, (m) => m.amount),
    recurringCosts: data.rules.filter((r) => r.active && r.kind === "expense" && r.scope === scope && r.currency === currency && !r.member_id),
    expectedReceipts, expectedCosts, operating, withdrawalLow, withdrawalHigh,
    estimateLow: operating - withdrawalHigh, estimateHigh: operating - withdrawalLow,
    reviewCount: pending.filter((c) => c.state === "review").length,
  };
}
export type Dashboard = ReturnType<typeof financeDashboard>;
