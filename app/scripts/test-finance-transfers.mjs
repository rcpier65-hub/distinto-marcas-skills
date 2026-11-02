import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import env from "@next/env";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { accountBalance, accountTotals, today } from "../lib/finanzas/model.ts";
import { prepareQuickEntry } from "../lib/finanzas/quick-entry.ts";

env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL;
assert(base, "Indica TEST_BASE_URL");
const dbUrl = new URL(process.env.SUPABASE_DB_URL);
const pool = new pg.Pool({ connectionString: dbUrl.href, ssl: ["localhost", "127.0.0.1"].includes(dbUrl.hostname) ? false : { rejectUnauthorized: false } });
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const prefix = "QA-TRANSFER-" + randomUUID(), sessions = [], accounts = [], requests = [];
async function login(name) {
  const jar = new Map();
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)) } });
  sessions.push(auth);
  const { data, error } = await svc.auth.admin.generateLink({ type: "magiclink", email: name + "@agenciadistinto.com" });
  assert.ifError(error);
  assert.ifError((await auth.auth.verifyOtp({ token_hash: data.properties.hashed_token, type: "magiclink" })).error);
  return { cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "), origin: base, "content-type": "application/json" };
}
async function get(h, status = 200) {
  const r = await fetch(base + "/api/finanzas", { headers: h, redirect: "manual" });
  assert.equal(r.status, status); return r.json();
}
async function post(h, body, status = 200) {
  const requestId = body.requestId || randomUUID(); requests.push(requestId);
  const r = await fetch(base + "/api/finanzas", { method: "POST", headers: h, body: JSON.stringify({ ...body, requestId }) });
  const j = await r.json(); assert.equal(r.status, status, j.error); return j;
}
try {
  const pedro = await login("pedro"), nayeli = await login("nayeli"), ailyn = await login("ailyn");
  await get(ailyn, 403);
  const day = today();
  for (const [name, owner, usage, currency, opening] of [["BCP Nayeli", "nayeli", "agency", "PEN", 250000], ["BCP Pedro", "pedro", "personal", "PEN", 10000], ["Dólares", "pedro", "personal", "USD", 10000]]) {
    const id = randomUUID(); accounts.push(id);
    await pool.query("INSERT INTO finance_accounts(id,name,owner,usage,currency,opening,opening_date) VALUES($1,$2,$3,$4,$5,$6,$7)", [id, prefix + " " + name, owner, usage, currency, opening, day]);
  }
  let d = await get(pedro);
  const fixtures = () => d.accounts.filter((a) => accounts.includes(a.id));
  const draft = prepareQuickEntry("Me transferí mil quinientos soles del BCP de Nayeli al BCP de Pedro", { today: day, scope: "agency", currency: "PEN", accounts: fixtures(), charges: d.charges });
  assert.deepEqual(draft.problems, []); assert.equal(draft.kind, "transfer");
  assert.deepEqual(draft.accountIds, [accounts[0]]); assert.deepEqual(draft.destinationIds, [accounts[1]]);
  const transfer = { action: "transfer", account_id: draft.accountIds[0], destination_id: draft.destinationIds[0], amount: draft.amount, date: draft.date, title: prefix + " retiro semanal", requestId: randomUUID() };
  const beforeTotal = accountTotals(fixtures(), "PEN").total;
  const results = await Promise.all([post(pedro, transfer), post(pedro, transfer)]);
  assert.equal(results[0].id, results[1].id);
  d = await get(nayeli);
  const rows = d.movements.filter((m) => m.account_id === accounts[0]);
  assert.equal(rows.length, 1); assert.equal(rows[0].kind, "transfer");
  assert.equal(rows[0].destination_id, accounts[1]); assert.equal(rows[0].scope, "agency");
  assert.equal(accountBalance(fixtures().find((a) => a.id === accounts[0])), 100000);
  assert.equal(accountBalance(fixtures().find((a) => a.id === accounts[1])), 160000);
  assert.equal(accountTotals(fixtures(), "PEN").total, beforeTotal);
  assert.equal(accountTotals(fixtures(), "PEN", "agency").total, 100000);
  assert.equal(accountTotals(fixtures(), "PEN", "personal").total, 160000);
  const count = async () => (await pool.query("SELECT count(*)::int AS n FROM finance_movements WHERE account_id=ANY($1::uuid[]) OR destination_id=ANY($1::uuid[])", [accounts])).rows[0].n;
  assert.equal(await count(), 1);
  for (const change of [{ destination_id: accounts[0] }, { destination_id: accounts[2] }, { date: "2099-01-01" }, { amount: 0 }, { amount: -100 }, { account_id: randomUUID() }]) {
    await post(pedro, { ...transfer, ...change, requestId: randomUUID() }, 400);
    assert.equal(await count(), 1);
  }
  await post(ailyn, { ...transfer, requestId: randomUUID() }, 403);
  await post({ ...pedro, origin: "https://wrong.invalid" }, { ...transfer, requestId: randomUUID() }, 403);
  await post(pedro, { action: "voidMovement", id: results[0].id, reason: prefix + " comprobación de reversión" });
  d = await get(pedro);
  assert.equal(accountBalance(fixtures().find((a) => a.id === accounts[0])), 250000);
  assert.equal(accountBalance(fixtures().find((a) => a.id === accounts[1])), 10000);
  console.log("PASS frase → transferencia única; doble envío idempotente; ambos saldos y totales; reversión; aislamiento de moneda, fechas, permisos y origen");
} finally {
  await pool.query("DELETE FROM finance_movements WHERE account_id=ANY($1::uuid[]) OR destination_id=ANY($1::uuid[])", [accounts]);
  await pool.query("DELETE FROM finance_accounts WHERE id=ANY($1::uuid[])", [accounts]);
  await pool.query("DELETE FROM finance_audit WHERE detail->>'requestId'=ANY($1::text[])", [requests]);
  await pool.query("DELETE FROM finance_requests WHERE id=ANY($1::uuid[])", [requests]);
  assert.equal((await pool.query("SELECT count(*)::int AS n FROM finance_accounts WHERE name LIKE $1", [prefix + "%"])).rows[0].n, 0);
  await Promise.all(sessions.map((a) => a.auth.signOut({ scope: "local" })));
  await pool.end();
  console.log("PASS cuentas, movimientos y sesiones de prueba eliminados; sin movimientos en cuentas reales");
}
