import "server-only";
import { cache } from "react";
import { createHash } from "node:crypto";
import type { PoolClient } from "pg";
import { getUser } from "@/lib/auth/get-user";
import { strategyDB as db, transaction } from "@/lib/estrategia/db";
import {
  actions,
  occurrences,
  today,
  monthSchema,
  type Rule,
  type FinanceData,
} from "./model";
import { z } from "zod";
export class FinanceError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export const financeMember = cache(async () => {
  const user = await getUser();
  if (!user) return null;
  const { rows } = await db().query(
    `SELECT t.id,t.nombre,EXISTS(SELECT 1 FROM finance_access a WHERE a.member_id=t.id) AND COALESCE((t.permisos_override->'finanzas'->>'acceso')='true',false) AS manager FROM team_members t WHERE t.auth_user_id=$1 AND t.activo=true`,
    [user.id],
  );
  return (
    (rows[0] as { id: string; nombre: string; manager: boolean } | undefined) ??
    null
  );
});
export async function actor(req?: Request, staff = false) {
  if (req && req.method !== "GET") {
    const origin = req.headers.get("origin"),
      host = req.headers.get("host") || new URL(req.url).host;
    if (
      !origin ||
      new URL(origin).host !== host ||
      !["https:", "http:"].includes(new URL(origin).protocol)
    )
      throw new FinanceError("Origen no permitido", 403);
  }
  const a = await financeMember();
  if (!a)
    throw new FinanceError(
      "Inicia sesión con una cuenta activa del equipo",
      401,
    );
  if (!staff && !a.manager)
    throw new FinanceError("Finanzas está reservado a Pedro y Nayeli", 403);
  return a;
}
export function failure(e: unknown) {
  if (e instanceof FinanceError)
    return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof z.ZodError)
    return Response.json(
      { error: e.issues[0]?.message ?? "Revisa los campos" },
      { status: 400 },
    );
  if ((e as { code?: string })?.code === "23505")
    return Response.json(
      {
        error:
          "Este registro ya existe. Revisa el historial antes de repetirlo.",
      },
      { status: 409 },
    );
  console.error("[finanzas]", {
    code: (e as { code?: string })?.code,
  });
  return Response.json(
    {
      error:
        "No se pudo guardar. Tus datos anteriores se conservan; vuelve a intentarlo.",
    },
    { status: 503 },
  );
}
export async function readBody(req: Request) {
  const s = await req.text();
  if (s.length > 24000)
    throw new FinanceError("Solicitud demasiado grande", 413);
  try {
    return JSON.parse(s);
  } catch {
    throw new FinanceError("Solicitud inválida");
  }
}
export async function generate(month: string) {
  monthSchema.parse(month);
  const current = today().slice(0, 7);
  if (month > "2099-12" || month < "2026-11") return;
  // Viewing future months is a forecast. Only months already reached are materialized.
  const limit = month < current ? month : current;
  await transaction(async (c) => {
    await c.query(
      "SELECT pg_advisory_xact_lock(hashtext('distinto-finance-recurring'))",
    );
    const { rows } = await c.query(
      `SELECT *,starts::text,ends::text FROM finance_rules WHERE active=true AND starts<($1||'-01')::date+interval '1 month'`,
      [limit],
    );
    for (const r of rows as Rule[]) {
      let m = r.starts.slice(0, 7);
      // Bounded to prevent accidentally backfilling years from a typo.
      let count = 0;
      while (m <= limit && count++ < 120) {
        for (const due of occurrences(r, m))
          await c.query(
            `INSERT INTO finance_charges(rule_id,title,kind,scope,owner,currency,base,tax,due,note,member_id,brand_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT(rule_id,due) DO NOTHING`,
            [
              r.id,
              r.title,
              r.kind,
              r.scope,
              r.owner,
              r.currency,
              r.base,
              r.tax,
              due,
              r.note,
              r.member_id,
              r.brand_id,
            ],
          );
        const [y, mo] = m.split("-").map(Number);
        m = new Date(Date.UTC(y, mo, 1)).toISOString().slice(0, 7);
      }
    }
  });
}
export async function documents(member: { id: string; manager: boolean }) {
  return (
    await db().query(
      `SELECT d.id,d.kind,d.charge_id,c.title AS charge_title,d.member_id,t.nombre AS member_name,d.filename,d.number,to_char(d.period,'YYYY-MM') AS period,d.gross,d.withholding,d.currency,d.status,d.review_note,d.created_at FROM finance_documents d JOIN team_members t ON t.id=d.member_id LEFT JOIN finance_charges c ON c.id=d.charge_id WHERE ($1::boolean OR d.member_id=$2) ORDER BY d.created_at DESC LIMIT 500`,
      [member.manager, member.id],
    )
  ).rows;
}
export async function loadFinance(
  a: { id: string; manager: boolean },
  month: string,
): Promise<FinanceData> {
  if (!a.manager) throw new FinanceError("Sin acceso", 403);
  monthSchema.parse(month);
  await generate(month);
  const end = `${month}-01`;
  const results = await Promise.all([
    db().query(
      `SELECT c.*,c.due::text,COALESCE((SELECT sum(m.amount+m.credit)::float8 FROM finance_movements m WHERE m.charge_id=c.id AND m.void_reason IS NULL),0) AS settled FROM finance_charges c WHERE c.due<($1::date+interval '1 month') ORDER BY c.due,c.title`,
      [end],
    ),
    db().query(
      "SELECT *,starts::text,ends::text FROM finance_rules ORDER BY kind,title",
    ),
    db().query(
      `SELECT a.*,a.opening_date::text,COALESCE((SELECT sum(CASE WHEN m.kind='income' OR m.destination_id=a.id THEN m.amount ELSE -m.amount END)::float8 FROM finance_movements m WHERE (m.account_id=a.id OR m.destination_id=a.id) AND m.void_reason IS NULL AND (a.opening_date IS NULL OR m.date>=a.opening_date)),0) AS movements FROM finance_accounts a ORDER BY a.name`,
    ),
    db().query(
      `SELECT m.*,m.date::text FROM finance_movements m WHERE m.date >= $1::date AND m.date<($1::date+interval '1 month') ORDER BY m.date DESC,m.created_at DESC`,
      [end],
    ),
    documents(a),
    db().query("SELECT * FROM finance_notes ORDER BY id"),
    db().query(
      "SELECT id,nombre FROM team_members WHERE activo=true ORDER BY nombre",
    ),
    db().query(
      "SELECT id,nombre FROM marcas WHERE activa=true ORDER BY nombre",
    ),
    db().query(
      "SELECT value FROM finance_settings WHERE key='owner-monthly-target'",
    ),
  ]);
  return {
    ownerTarget: results[8].rows[0]?.value?.amount ?? null,
    today: today(),
    month,
    charges: results[0].rows,
    rules: results[1].rows,
    accounts: results[2].rows,
    movements: results[3].rows,
    receipts: results[4],
    notes: results[5].rows,
    members: results[6].rows,
    brands: results[7].rows,
  };
}
async function audit(
  c: PoolClient,
  member: string,
  action: string,
  id: string | null,
  detail: unknown,
) {
  await c.query(
    "INSERT INTO finance_audit(member_id,action,record_id,detail) VALUES($1,$2,$3,$4)",
    [member, action, id, JSON.stringify(detail)],
  );
}
async function account(
  c: PoolClient,
  id: string | null,
  currency: string,
  date: string,
) {
  if (!id)
    throw new FinanceError(
      "Selecciona la cuenta o caja que recibió o pagó el dinero",
    );
  const a = (
    await c.query(
      "SELECT *,opening_date::text FROM finance_accounts WHERE id=$1 FOR UPDATE",
      [id],
    )
  ).rows[0];
  if (!a || a.currency !== currency || !a.owner)
    throw new FinanceError(
      "Completa el titular y la moneda de esta cuenta en Cuentas; deben coincidir con el pago",
    );
  if (a.opening_date && date < a.opening_date)
    throw new FinanceError(
      "La fecha es anterior al inicio de esta cuenta. Revisa su fecha de saldo inicial.",
    );
  return a;
}
export async function mutate(
  a: { id: string; manager: boolean },
  raw: unknown,
) {
  if (!a.manager) throw new FinanceError("Sin acceso", 403);
  const b = actions.parse(raw),
    hash = createHash("sha256").update(JSON.stringify(b)).digest("hex");
  return transaction(async (c) => {
    await c.query(
      "INSERT INTO finance_requests(id,member_id,hash) VALUES($1,$2,$3) ON CONFLICT DO NOTHING",
      [b.requestId, a.id, hash],
    );
    const req = (
      await c.query("SELECT * FROM finance_requests WHERE id=$1 FOR UPDATE", [
        b.requestId,
      ])
    ).rows[0];
    if (req.member_id !== a.id || req.hash !== hash)
      throw new FinanceError(
        "La solicitud ya se utilizó para otra operación",
        409,
      );
    if (req.result.ok) return req.result;
    let id: string | null = null;
    if (b.action === "charge" || b.action === "rule") {
      const d = b.data;
      if (b.action === "rule") {
        const r = b.data;
        if (r.starts.slice(0, 7) < today().slice(0, 7))
          throw new FinanceError(
            "Las nuevas recurrencias empiezan este mes o después. Registra deudas anteriores como cobros individuales.",
          );
        id = (
          await c.query(
            `INSERT INTO finance_rules(title,kind,scope,owner,currency,base,tax,frequency,day,starts,ends,note,member_id,brand_id,period_mode) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id`,
            [
              r.title,
              r.kind,
              r.scope,
              r.owner,
              r.currency,
              r.base,
              r.tax,
              r.frequency,
              r.day,
              r.starts,
              r.ends,
              r.note,
              r.member_id,
              r.brand_id,
              r.period_mode,
            ],
          )
        ).rows[0].id;
      } else
        id = (
          await c.query(
            `INSERT INTO finance_charges(title,kind,scope,owner,currency,base,tax,due,note,member_id,brand_id,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'confirmed') RETURNING id`,
            [
              d.title,
              d.kind,
              d.scope,
              d.owner,
              d.currency,
              d.base,
              d.tax,
              b.data.due,
              d.note,
              d.member_id,
              d.brand_id,
            ],
          )
        ).rows[0].id;
    } else if (b.action === "confirm" || b.action === "voidCharge") {
      const ch = (
        await c.query("SELECT * FROM finance_charges WHERE id=$1 FOR UPDATE", [
          b.id,
        ])
      ).rows[0];
      if (!ch)
        throw new FinanceError("Cuenta por cobrar o pagar no encontrada", 404);
      if (b.action === "confirm") {
        if (ch.state === "void")
          throw new FinanceError("El registro está anulado");
        await c.query(
          "UPDATE finance_charges SET state='confirmed' WHERE id=$1",
          [b.id],
        );
      } else {
        const paid = (
          await c.query(
            "SELECT 1 FROM finance_movements WHERE charge_id=$1 AND void_reason IS NULL",
            [b.id],
          )
        ).rowCount;
        if (paid || ch.prior_credit)
          throw new FinanceError(
            "Tiene pagos o un abono anterior. Revisa sus movimientos antes de anular.",
          );
        await c.query(
          "UPDATE finance_charges SET state='void',note=note||E'\nAnulación: '||$2 WHERE id=$1",
          [b.id, b.reason],
        );
      }
      id = b.id;
    } else if (b.action === "pauseRule") {
      await c.query(
        "SELECT pg_advisory_xact_lock(hashtext('distinto-finance-recurring'))",
      );
      const r = await c.query(
        "UPDATE finance_rules SET starts=CASE WHEN $2=true AND active=false THEN GREATEST(starts,$3::date) ELSE starts END,active=$2 WHERE id=$1 RETURNING id",
        [b.id, b.active, today()],
      );
      if (!r.rowCount) throw new FinanceError("Recurrencia no encontrada", 404);
      id = b.id;
    } else if (b.action === "account") {
      if (b.opening_date > today())
        throw new FinanceError("La fecha de apertura no puede ser futura");
      if (b.id) {
        const old = (
          await c.query(
            "SELECT * FROM finance_accounts WHERE id=$1 FOR UPDATE",
            [b.id],
          )
        ).rows[0];
        if (!old) throw new FinanceError("Cuenta no encontrada", 404);
        const existing = (
          await c.query(
            "SELECT min(date)::text AS first FROM finance_movements WHERE account_id=$1 OR destination_id=$1",
            [b.id],
          )
        ).rows[0].first;
        if (
          existing &&
          ((old.currency && old.currency !== b.currency) ||
            (old.owner && old.owner !== b.owner))
        )
          throw new FinanceError(
            "Una cuenta con movimientos conserva su moneda y titular. Crea otra cuenta.",
          );
        if (existing && b.opening_date > existing)
          throw new FinanceError(
            "La apertura debe ser anterior o igual al primer movimiento registrado",
          );
        await c.query(
          "UPDATE finance_accounts SET name=$2,owner=$3,currency=$4,opening=$5,opening_date=$6,note=$7 WHERE id=$1",
          [
            b.id,
            b.name,
            b.owner,
            b.currency,
            b.opening,
            b.opening_date,
            b.note,
          ],
        );
        id = b.id;
      } else
        id = (
          await c.query(
            "INSERT INTO finance_accounts(name,owner,currency,opening,opening_date,note) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
            [b.name, b.owner, b.currency, b.opening, b.opening_date, b.note],
          )
        ).rows[0].id;
    } else if (b.action === "payment") {
      if (b.date > today())
        throw new FinanceError(
          "Registra pagos efectivamente realizados, no pagos futuros",
        );
      const ch = (
        await c.query("SELECT * FROM finance_charges WHERE id=$1 FOR UPDATE", [
          b.charge_id,
        ])
      ).rows[0];
      if (!ch || ch.state === "void")
        throw new FinanceError("Cuenta no disponible", 404);
      const paid = Number(
        (
          await c.query(
            "SELECT COALESCE(sum(amount+credit),0) AS total FROM finance_movements WHERE charge_id=$1 AND void_reason IS NULL",
            [b.charge_id],
          )
        ).rows[0].total,
      );
      if (
        b.amount + b.credit <= 0 ||
        b.amount + b.credit > ch.base + ch.tax - ch.prior_credit - paid
      )
        throw new FinanceError(
          "El pago debe ser mayor que cero y no superar el saldo pendiente",
        );
      if (b.credit > 0 === (b.credit_kind === "none"))
        throw new FinanceError(
          "Indica si el importe separado corresponde a retención o detracción",
        );
      if (b.amount > 0) await account(c, b.account_id, ch.currency, b.date);
      id = (
        await c.query(
          `INSERT INTO finance_movements(kind,scope,owner,currency,amount,credit,credit_kind,account_id,charge_id,title,date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING id`,
          [
            ch.kind,
            ch.scope,
            ch.owner,
            ch.currency,
            b.amount,
            b.credit,
            b.credit_kind,
            b.amount ? b.account_id : null,
            ch.id,
            ch.title,
            b.date,
            a.id,
          ],
        )
      ).rows[0].id;
      await c.query(
        "UPDATE finance_charges SET state='confirmed' WHERE id=$1",
        [ch.id],
      );
    } else if (b.action === "expense") {
      if (b.paid && b.date > today())
        throw new FinanceError("Un gasto pagado no puede tener fecha futura");
      const ch = (
        await c.query(
          `INSERT INTO finance_charges(title,kind,scope,owner,currency,base,due,state,note) VALUES($1,'expense',$2,$3,$4,$5,$6,'confirmed',$7) RETURNING id`,
          [b.title, b.scope, b.owner, b.currency, b.amount, b.date, b.note],
        )
      ).rows[0].id;
      if (b.paid) {
        await account(c, b.account_id, b.currency, b.date);
        id = (
          await c.query(
            `INSERT INTO finance_movements(kind,scope,owner,currency,amount,account_id,charge_id,title,date,created_by) VALUES('expense',$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
            [
              b.scope,
              b.owner,
              b.currency,
              b.amount,
              b.account_id,
              ch,
              b.title,
              b.date,
              a.id,
            ],
          )
        ).rows[0].id;
      } else id = ch;
    } else if (b.action === "transfer") {
      if (b.date > today() || b.account_id === b.destination_id)
        throw new FinanceError("Revisa la fecha y elige dos cuentas distintas");
      const ids = [b.account_id, b.destination_id].sort();
      const locked = (
        await c.query(
          "SELECT * FROM finance_accounts WHERE id=ANY($1::uuid[]) ORDER BY id FOR UPDATE",
          [ids],
        )
      ).rows;
      const from = locked.find((r) => r.id === b.account_id),
        to = locked.find((r) => r.id === b.destination_id);
      if (!from || !to || !from.currency || from.currency !== to.currency)
        throw new FinanceError(
          "La transferencia requiere cuentas de la misma moneda",
        );
      await account(c, b.account_id, from.currency, b.date);
      await account(c, b.destination_id, from.currency, b.date);
      id = (
        await c.query(
          `INSERT INTO finance_movements(kind,scope,owner,currency,amount,account_id,destination_id,title,date,created_by) VALUES('transfer',$1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
          [
            from.owner === "agency" ? "agency" : "personal",
            from.owner,
            from.currency,
            b.amount,
            b.account_id,
            b.destination_id,
            b.title,
            b.date,
            a.id,
          ],
        )
      ).rows[0].id;
    } else if (b.action === "voidMovement") {
      const m = (
        await c.query("SELECT * FROM finance_movements WHERE id=$1", [b.id])
      ).rows[0];
      if (!m) throw new FinanceError("Movimiento no encontrado", 404);
      if (m.charge_id)
        await c.query("SELECT id FROM finance_charges WHERE id=$1 FOR UPDATE", [
          m.charge_id,
        ]);
      await c.query(
        "UPDATE finance_movements SET void_reason=$2 WHERE id=$1 AND void_reason IS NULL",
        [b.id, b.reason],
      );
      id = b.id;
    } else if (b.action === "reviewReceipt") {
      if (
        !(
          await c.query(
            "UPDATE finance_documents SET status=$2,review_note=$3 WHERE id=$1 RETURNING id",
            [b.id, b.status, b.note],
          )
        ).rowCount
      )
        throw new FinanceError("Documento no encontrado", 404);
      id = b.id;
    }
    await audit(c, a.id, b.action, id, b);
    const result = { ok: true, id };
    await c.query("UPDATE finance_requests SET result=$2 WHERE id=$1", [
      b.requestId,
      JSON.stringify(result),
    ]);
    return result;
  });
}
