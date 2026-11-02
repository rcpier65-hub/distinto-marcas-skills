import { z } from "zod";
export const money = z.number().int().min(1).max(100000000);
export const currency = z.enum(["PEN", "USD"]);
export const owner = z.enum(["agency", "pedro", "nayeli"]);
export const scope = z.enum(["agency", "personal"]);
export const date = z
  .string()
  .regex(/^20\d{2}-\d{2}-\d{2}$/)
  .refine(
    (s) =>
      !Number.isNaN(Date.parse(s)) &&
      new Date(s).toISOString().slice(0, 10) === s,
    "Fecha inválida",
  );
export const monthSchema = z.string().regex(/^20\d{2}-(0[1-9]|1[0-2])$/);
export const text = z.string().trim().min(1).max(300);
export const ownerNames = {
  agency: "Distinto Agencia",
  pedro: "Pedro Reyes",
  nayeli: "Nayeli Sotelo",
};
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function amount(n: number, c = "PEN") {
  return new Intl.NumberFormat("es-PE", {
    style: "currency",
    currency: c,
  }).format(n / 100);
}
export type Rule = {
  id: string;
  title: string;
  kind: "income" | "expense";
  scope: "agency" | "personal";
  owner: keyof typeof ownerNames;
  currency: "PEN" | "USD";
  base: number;
  tax: number;
  frequency: "monthly" | "weekly";
  day: number;
  starts: string;
  ends: string | null;
  active: boolean;
  note: string;
  member_id: string | null;
  brand_id: string | null;
  period_mode: string;
};
export function occurrences(
  r: Pick<Rule, "frequency" | "day" | "starts" | "ends">,
  month: string,
) {
  monthSchema.parse(month);
  const [y, m] = month.split("-").map(Number),
    last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days =
    r.frequency === "monthly"
      ? [Math.min(r.day, last)]
      : Array.from({ length: last }, (_, i) => i + 1).filter(
          (d) => new Date(Date.UTC(y, m - 1, d)).getUTCDay() === r.day,
        );
  return days
    .map((d) => `${month}-${String(d).padStart(2, "0")}`)
    .filter((d) => d >= r.starts && (!r.ends || d <= r.ends));
}
export type Charge = {
  id: string;
  rule_id: string | null;
  title: string;
  kind: "income" | "expense";
  scope: "agency" | "personal";
  owner: keyof typeof ownerNames;
  currency: "PEN" | "USD";
  base: number;
  tax: number;
  prior_credit: number;
  settled: number;
  due: string;
  state: "review" | "confirmed" | "void";
  note: string;
  member_id: string | null;
  brand_id: string | null;
};
export function remaining(c: Charge) {
  return c.state === "void"
    ? 0
    : Math.max(0, c.base + c.tax - c.prior_credit - c.settled);
}
export type Account = {
  id: string;
  name: string;
  owner: keyof typeof ownerNames | null;
  currency: "PEN" | "USD" | null;
  opening: number | null;
  opening_date: string | null;
  movements: number;
  note: string;
};
export type Movement = {
  id: string;
  kind: "income" | "expense" | "transfer";
  scope: "agency" | "personal";
  owner: keyof typeof ownerNames;
  currency: "PEN" | "USD";
  amount: number;
  credit: number;
  credit_kind: string;
  account_id: string | null;
  destination_id: string | null;
  charge_id: string | null;
  title: string;
  date: string;
  void_reason: string | null;
  created_at: string;
};
export type Receipt = {
  charge_id: string | null;
  charge_title: string | null;
  id: string;
  kind: "rh" | "expense";
  member_id: string;
  member_name: string;
  filename: string;
  number: string;
  period: string;
  gross: number;
  withholding: number;
  currency: string;
  status: string;
  review_note: string;
  created_at: string;
};
export type FinanceData = {
  ownerTarget: number | null;
  today: string;
  month: string;
  charges: Charge[];
  rules: Rule[];
  accounts: Account[];
  movements: Movement[];
  receipts: Receipt[];
  notes: { id: string; title: string; body: string }[];
  members: { id: string; nombre: string }[];
  brands: { id: string; nombre: string }[];
};
export const chargeInput = z.object({
  title: text,
  kind: z.enum(["income", "expense"]),
  scope,
  owner,
  currency,
  base: money,
  tax: z.number().int().min(0).max(100000000).default(0),
  due: date,
  note: z.string().max(2000).default(""),
  member_id: z.string().uuid().nullable().default(null),
  brand_id: z.string().uuid().nullable().default(null),
});
export const ruleInput = chargeInput
  .omit({ due: true })
  .extend({
    frequency: z.enum(["monthly", "weekly"]),
    day: z.number().int().min(0).max(31),
    starts: date,
    ends: date.nullable().default(null),
    period_mode: z.enum(["advance", "arrears", "other"]).default("other"),
  })
  .refine(
    (r) => (r.frequency === "monthly" ? r.day >= 1 : r.day <= 6),
    "Día inválido",
  )
  .refine(
    (r) => !r.ends || r.ends >= r.starts,
    "La fecha final debe ser posterior al inicio",
  );
export const actions = z
  .discriminatedUnion("action", [
    z.object({
      action: z.literal("quickEntry"),
      kind: z.enum(["income", "expense"]),
      title: text,
      scope,
      owner,
      currency,
      amount: money,
      date,
      account_id: z.string().uuid(),
      charge_id: z.string().uuid().nullable(),
      configure_account: z.boolean().default(false),
      account_owner: owner.optional(),
      note: z.string().max(2000).default(""),
    }),
    z.object({ action: z.literal("charge"), data: chargeInput }),
    z.object({ action: z.literal("confirm"), id: z.string().uuid() }),
    z.object({
      action: z.literal("voidCharge"),
      id: z.string().uuid(),
      reason: text,
    }),
    z.object({ action: z.literal("rule"), data: ruleInput }),
    z.object({
      action: z.literal("pauseRule"),
      id: z.string().uuid(),
      active: z.boolean(),
    }),
    z.object({
      action: z.literal("account"),
      id: z.string().uuid().optional(),
      name: text,
      owner,
      currency,
      opening: z.number().int().min(-100000000).max(100000000).nullable(),
      opening_date: date,
      note: z.string().max(2000).default(""),
    }),
    z.object({
      action: z.literal("payment"),
      charge_id: z.string().uuid(),
      account_id: z.string().uuid().nullable(),
      amount: z.number().int().min(0).max(100000000),
      credit: z.number().int().min(0).max(100000000).default(0),
      credit_kind: z.enum(["none", "retention", "detraction"]).default("none"),
      date,
    }),
    z.object({
      action: z.literal("expense"),
      title: text,
      scope,
      owner,
      currency,
      amount: money,
      date,
      account_id: z.string().uuid().nullable(),
      paid: z.boolean(),
      note: z.string().max(2000).default(""),
    }),
    z.object({
      action: z.literal("transfer"),
      account_id: z.string().uuid(),
      destination_id: z.string().uuid(),
      amount: money,
      date,
      title: text,
    }),
    z.object({
      action: z.literal("voidMovement"),
      id: z.string().uuid(),
      reason: text,
    }),
    z.object({
      action: z.literal("reviewReceipt"),
      id: z.string().uuid(),
      status: z.enum(["reviewed", "rejected"]),
      note: text,
    }),
  ])
  .and(z.object({ requestId: z.string().uuid() }));
