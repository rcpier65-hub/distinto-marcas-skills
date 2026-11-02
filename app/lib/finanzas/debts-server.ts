import "server-only";
import type { PoolClient } from "pg";
import { debtSchedule } from "./debt-plan";
import { today, occurrences, type Charge, type Debt, type debtInput } from "./model";
import type { z } from "zod";

export class DebtError extends Error {}
async function chargesFor(c: PoolClient, id: string): Promise<Charge[]> {
  return (await c.query(`SELECT c.*,c.due::text,COALESCE((SELECT sum(amount+credit)::float8 FROM finance_movements m WHERE m.charge_id=c.id AND m.void_reason IS NULL),0) AS settled FROM finance_charges c WHERE c.debt_id=$1 ORDER BY c.due FOR UPDATE`, [id])).rows;
}
export async function generateDebts(c: PoolClient, month: string) {
  // Same advisory lock in generate() and saveDebt(); debt payments lock the charge.
  const debts = (await c.query("SELECT *,first_due::text FROM finance_debts WHERE active=true ORDER BY id FOR UPDATE")).rows as Debt[];
  for (const debt of debts) {
    const charges = await chargesFor(c, debt.id);
    for (const p of debtSchedule(debt, month, charges))
      await c.query(`INSERT INTO finance_charges(debt_id,debt_period,title,kind,scope,owner,currency,base,due,state,note) VALUES($1,$2,$3,'expense','personal',$4,$5,$6,$7,$8,$9) ON CONFLICT DO NOTHING`, [debt.id,p.period,debt.title,debt.owner,debt.currency,p.base,p.due,debt.estimated ? "review" : "confirmed",debt.note]);
  }
}
export async function saveDebt(c: PoolClient, data: z.infer<typeof debtInput>, id?: string, revision?: number) {
  await c.query("SELECT pg_advisory_xact_lock(hashtext('distinto-finance-recurring'))");
  let debtId = id;
  if (id) {
    const old = (await c.query("SELECT *,first_due::text FROM finance_debts WHERE id=$1 FOR UPDATE", [id])).rows[0] as Debt | undefined;
    if (!old) throw new DebtError("Esta deuda no existe. Actualiza la pantalla.");
    if (old.revision !== revision) throw new DebtError("La deuda cambió en otra pantalla. Actualiza antes de editar.");
    const charges = await chargesFor(c, id);
    const paid = charges.reduce((n, ch) => n + ch.settled + ch.prior_credit, 0);
    if (data.total !== null && data.total < paid) throw new DebtError("El total no puede ser menor que los abonos registrados.");
    if (charges.length && (old.currency !== data.currency || old.owner !== data.owner || old.frequency !== data.frequency))
      throw new DebtError("Una deuda con vencimientos conserva su moneda, titular y tipo. Puedes editar sus importes, fecha y nota.");
    if (charges.length && (!data.first_due || (data.frequency === "once" ? data.total === null : data.installment === null)))
      throw new DebtError("Ya tiene vencimientos. Conserva importe y fecha; puedes pausar las próximas cuotas.");
    if (charges.length && data.frequency === "monthly" && old.first_due?.slice(0,7) !== data.first_due?.slice(0,7))
      throw new DebtError("Conserva el mes inicial; puedes cambiar el día de pago mensual.");
    const current = today().slice(0,7);
    // Paid/partially paid installments and prior months retain their agreed amounts.
    const editable = charges.filter((ch) => ch.state !== "void" && (data.frequency === "once" || (!ch.settled && !ch.prior_credit && ch.due.slice(0,7) >= current)));
    const fixed = charges.filter((ch) => ch.state !== "void" && !editable.includes(ch)).reduce((n,ch)=>n+ch.base,0);
    if (data.total !== null && data.total < fixed) throw new DebtError("El total no puede ser menor que las cuotas históricas. Revisa los vencimientos anteriores.");
    let available = data.total === null ? Infinity : data.total-fixed;
    for (const ch of editable) {
      const base = data.frequency === "once" ? data.total! : Math.min(data.installment!,available);
      if (base <= 0 || base < ch.settled + ch.prior_credit) throw new DebtError("El total debe cubrir los vencimientos existentes. Revisa el importe antes de guardar.");
      const due = data.frequency === "once" ? data.first_due! : occurrences({frequency:"monthly",day:Number(data.first_due!.slice(8)),starts:ch.debt_period!+'-01',ends:null},ch.debt_period!)[0];
      await c.query("UPDATE finance_charges SET title=$2,base=$3,due=$4,note=$5,state=$6 WHERE id=$1", [ch.id,data.title,base,due,data.note,data.estimated && !ch.settled ? "review":"confirmed"]);
      available -= base;
    }
    await c.query("UPDATE finance_debts SET title=$2,owner=$3,currency=$4,frequency=$5,total=$6,installment=$7,first_due=$8,estimated=$9,active=$10,note=$11,revision=revision+1 WHERE id=$1", [id,data.title,data.owner,data.currency,data.frequency,data.total,data.installment,data.first_due,data.estimated,data.active,data.note]);
  } else {
    if (data.frequency === "monthly" && data.first_due && data.first_due.slice(0,7) < today().slice(0,7))
      throw new DebtError("Inicia el pago recurrente este mes o después. Registra los saldos anteriores como deuda de pago único.");
    debtId = (await c.query("INSERT INTO finance_debts(title,owner,currency,frequency,total,installment,first_due,estimated,active,note) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id", [data.title,data.owner,data.currency,data.frequency,data.total,data.installment,data.first_due,data.estimated,data.active,data.note])).rows[0].id;
  }
  await generateDebts(c,today().slice(0,7));
  return debtId!;
}
