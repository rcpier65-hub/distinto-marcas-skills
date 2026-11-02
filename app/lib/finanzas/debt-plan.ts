import { occurrences, type Debt, type Charge } from "./model";

// Only an installment is an expense due this month; the loan total is not another expense.
export function debtSchedule(debt: Debt, month: string, charges: Charge[]) {
  if (!debt.active || !debt.first_due) return [];
  const value = debt.frequency === "once" ? debt.total : debt.installment;
  if (value === null) return [];
  const start = debt.first_due.slice(0, 7);
  const periods: { period: string; due: string }[] = [];
  if (debt.frequency === "once") periods.push({ period: "once", due: debt.first_due });
  else {
    let m = start;
    for (let i = 0; m <= month && i < 120; i++) {
      for (const due of occurrences({ frequency: "monthly", day: Number(debt.first_due.slice(8)), starts: debt.first_due, ends: null }, m))
        periods.push({ period: m, due });
      const [y, mo] = m.split("-").map(Number);
      m = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
    }
  }
  const used = charges.filter((c) => c.state !== "void").reduce((n, c) => n + c.base, 0);
  let available = debt.total === null ? Infinity : Math.max(0, debt.total - used);
  const plan: { period: string; due: string; base: number }[] = [];
  for (const p of periods) {
    // Including void rows prevents a cancelled installment from reappearing on refresh.
    if (charges.some((c) => c.debt_period === p.period)) continue;
    const base = Math.min(value, available);
    if (base <= 0) break;
    plan.push({ ...p, base });
    available -= base;
  }
  return plan;
}
