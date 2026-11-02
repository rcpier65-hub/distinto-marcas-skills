import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import env from "@next/env";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL || "http://localhost:3133",
  pool = new pg.Pool({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  }),
  svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const prefix = "QA-FIN-" + randomUUID(),
  sessions = [],
  ids = { accounts: [], charges: [], docs: [], requests: [] };
async function login(name) {
  const jar = new Map(),
    auth = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => [...jar].map(([name, value]) => ({ name, value })),
          setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)),
        },
      },
    );
  const { data, error } = await svc.auth.admin.generateLink({
    type: "magiclink",
    email: name.includes("@") ? name : name + "@agenciadistinto.com",
  });
  assert.ifError(error);
  assert.ifError(
    (
      await auth.auth.verifyOtp({
        token_hash: data.properties.hashed_token,
        type: "magiclink",
      })
    ).error,
  );
  sessions.push(auth);
  return {
    cookie: [...jar].map(([k, v]) => `${k}=${v}`).join("; "),
    origin: base,
  };
}
async function get(h, path = "/api/finanzas") {
  const r = await fetch(base + path, { headers: h, redirect: "manual" });
  return {
    status: r.status,
    data: r.headers.get("content-type")?.includes("json")
      ? await r.json()
      : await r.text(),
  };
}
async function post(h, b, status = 200) {
  const requestId = b.requestId || randomUUID();
  ids.requests.push(requestId);
  const r = await fetch(base + "/api/finanzas", {
      method: "POST",
      headers: { ...h, "content-type": "application/json" },
      body: JSON.stringify({ ...b, requestId }),
    }),
    j = await r.json();
  assert.equal(r.status, status, j.error);
  return j;
}
const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
  }).format(new Date()),
  month = day.slice(0, 7);
try {
  const pedro = await login("pedro"),
    nayeli = await login("nayeli"),
    ailyn = await login("ailyn"),
    pieer = await login("pieer");
  let initial = await get(pedro);
  assert.equal(initial.status, 200, JSON.stringify(initial.data));
  let d = initial.data;
  assert.equal(
    d.rules
      .filter(
        (r) => r.kind === "income" && r.external_key?.startsWith("intake"),
      )
      .reduce((s, r) => s + r.base, 0),
    1670000,
  );
  assert.equal(
    d.charges
      .filter(
        (c) =>
          c.kind === "expense" &&
          c.member_id &&
          c.due.slice(0, 7) === "2026-11",
      )
      .reduce((s, c) => s + c.base, 0),
    610000,
  );
  assert.equal(
    d.charges.find((c) => c.external_key === "intake-20261101-kintu-oct").due,
    "2026-10-18",
  );
  assert.equal(
    d.charges.find((c) => c.external_key === "intake-20261101-vid-web")
      .prior_credit,
    72000,
  );
  assert.equal((await get(nayeli)).status, 200);
  for (const name of ["lorena", "paolo", "ruth", "jimena"]) {
    const h = await login(name);
    assert.equal((await get(h)).status, 403);
    await post(h, { action: "confirm", id: randomUUID() }, 403);
    console.log("PASS denied", name);
  }
  for (const h of [ailyn, pieer]) {
    assert.equal((await get(h)).status, 403);
    assert.equal((await get(h, "/api/finanzas/documentos")).status, 200);
  }
  const client = await login("total@distintostudio.com");
  assert([401, 403, 307].includes((await get(client)).status));
  assert(
    [401, 403, 307].includes(
      (await get(client, "/api/finanzas/documentos")).status,
    ),
  );
  assert([401, 307].includes((await get({})).status));
  await post(
    { ...pedro, origin: "https://untrusted.invalid" },
    { action: "confirm", id: randomUUID() },
    403,
  );
  await post(
    { ...pedro, origin: "" },
    { action: "confirm", id: randomUUID() },
    403,
  );
  const count = (await pool.query("select count(*) from finance_charges")).rows;
  await Promise.all([get(pedro), get(nayeli)]);
  assert.deepEqual(
    (await pool.query("select count(*) from finance_charges")).rows,
    count,
  );
  console.log(
    "PASS access, origin, recurrence deduplication and intake totals",
  );
  async function account(name, currency = "PEN") {
    const j = await post(pedro, {
      action: "account",
      name: prefix + name,
      owner: "pedro",
      currency,
      opening: 100000,
      opening_date: day,
    });
    ids.accounts.push(j.id);
    return j.id;
  }
  const acc = await account("-A"),
    acc2 = await account("-B"),
    usd = await account("-USD", "USD");
  const ch = await post(pedro, {
    action: "charge",
    data: {
      title: prefix + " collection",
      kind: "income",
      scope: "agency",
      owner: "pedro",
      currency: "PEN",
      base: 10000,
      tax: 0,
      due: day,
    },
  });
  ids.charges.push(ch.id);
  await post(
    pedro,
    {
      action: "payment",
      charge_id: ch.id,
      account_id: usd,
      amount: 1000,
      date: day,
    },
    400,
  );
  const requestId = randomUUID(),
    payload = {
      action: "payment",
      charge_id: ch.id,
      account_id: acc,
      amount: 4000,
      date: day,
      requestId,
    };
  const pair = await Promise.all([post(pedro, payload), post(pedro, payload)]);
  assert.equal(pair[0].id, pair[1].id);
  d = (await get(pedro)).data;
  assert.equal(d.charges.find((c) => c.id === ch.id).settled, 4000);
  const bodies = [1, 2].map(() => ({
    action: "payment",
    charge_id: ch.id,
    account_id: acc,
    amount: 6000,
    date: day,
    requestId: randomUUID(),
  }));
  ids.requests.push(...bodies.map((b) => b.requestId));
  const results = await Promise.all(
    bodies.map((b) =>
      fetch(base + "/api/finanzas", {
        method: "POST",
        headers: { ...pedro, "content-type": "application/json" },
        body: JSON.stringify(b),
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [200, 400]);
  await post(pedro, { action: "voidCharge", id: ch.id, reason: "QA" }, 400);
  await post(pedro, {
    action: "voidMovement",
    id: pair[0].id,
    reason: "QA reversión",
  });
  d = (await get(pedro)).data;
  assert.equal(d.charges.find((c) => c.id === ch.id).settled, 6000);
  const paid = await post(pedro, {
    action: "payment",
    charge_id: ch.id,
    account_id: acc,
    amount: 3680,
    credit: 320,
    credit_kind: "retention",
    date: day,
  });
  d = (await get(pedro)).data;
  assert.equal(d.charges.find((c) => c.id === ch.id).settled, 10000);
  const beforeA = d.accounts.find((a) => a.id === acc).movements,
    beforeB = d.accounts.find((a) => a.id === acc2).movements;
  await post(pedro, {
    action: "transfer",
    account_id: acc,
    destination_id: acc2,
    amount: 3000,
    title: prefix + " transfer",
    date: day,
  });
  d = (await get(pedro)).data;
  assert.equal(d.accounts.find((a) => a.id === acc).movements, beforeA - 3000);
  assert.equal(d.accounts.find((a) => a.id === acc2).movements, beforeB + 3000);
  assert.equal(d.movements.find((m) => m.id === paid.id).amount, 3680);
  await post(pedro, {
    action: "expense",
    title: prefix + " pending",
    scope: "personal",
    owner: "pedro",
    currency: "PEN",
    amount: 2500,
    date: day,
    account_id: null,
    paid: false,
  }).then((j) => ids.charges.push(j.id));
  const n = (await pool.query("select count(*) as n from finance_charges"))
    .rows;
  await post(
    pedro,
    {
      action: "expense",
      title: prefix + " invalid",
      scope: "personal",
      owner: "pedro",
      currency: "PEN",
      amount: 2500,
      date: day,
      account_id: usd,
      paid: true,
    },
    400,
  );
  assert.deepEqual(
    (await pool.query("select count(*) as n from finance_charges")).rows,
    n,
  );
  console.log(
    "PASS partial payments, retries, overpayment race, currency isolation, reversal, withheld credit, transfers and rollback",
  );
  const f = new FormData();
  for (const [k, v] of Object.entries({
    kind: "rh",
    number: prefix,
    period: month,
    gross: "10000",
    withholding: "0",
    currency: "PEN",
  }))
    f.set(k, v);
  f.set(
    "file",
    new Blob(
      [
        Buffer.from(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
          "base64",
        ),
      ],
      { type: "image/png" },
    ),
    "qa.png",
  );
  f.set("charge_id", ch.id);
  assert.equal(
    (
      await fetch(base + "/api/finanzas/documentos", {
        method: "POST",
        headers: ailyn,
        body: f,
      })
    ).status,
    403,
  );
  f.delete("charge_id");
  const up = await fetch(base + "/api/finanzas/documentos", {
      method: "POST",
      headers: ailyn,
      body: f,
    }),
    doc = await up.json();
  assert.equal(up.status, 200, doc.error);
  ids.docs.push(doc.id);
  assert(
    (await get(ailyn, "/api/finanzas/documentos")).data.some(
      (d) => d.id === doc.id,
    ),
  );
  assert(
    !(await get(pieer, "/api/finanzas/documentos")).data.some(
      (d) => d.id === doc.id,
    ),
  );
  assert.equal(
    (await get(pieer, "/api/finanzas/documentos/" + doc.id)).status,
    404,
  );
  assert.equal(
    (await get(nayeli, "/api/finanzas/documentos/" + doc.id)).status,
    200,
  );
  assert.equal(
    (
      await fetch(base + "/api/finanzas/documentos", {
        method: "POST",
        headers: ailyn,
        body: f,
      })
    ).status,
    409,
  );
  await post(
    ailyn,
    { action: "reviewReceipt", id: doc.id, status: "reviewed", note: "QA" },
    403,
  );
  await post(nayeli, {
    action: "reviewReceipt",
    id: doc.id,
    status: "reviewed",
    note: "QA revisado",
  });
  assert.equal(
    (await get(ailyn, "/api/finanzas/documentos")).data.find(
      (d) => d.id === doc.id,
    ).status,
    "reviewed",
  );
  await post(nayeli, {
    action: "reviewReceipt",
    id: doc.id,
    status: "rejected",
    note: "QA corrección",
  });
  f.set(
    "file",
    new Blob([Buffer.from("%PDF-1.4\n% QA revised receipt\n%%EOF")], {
      type: "application/pdf",
    }),
    "qa-corrected.pdf",
  );
  const correctedResponse = await fetch(base + "/api/finanzas/documentos", {
    method: "POST",
    headers: ailyn,
    body: f,
  });
  const corrected = await correctedResponse.json();
  assert.equal(correctedResponse.status, 200, corrected.error);
  ids.docs.push(corrected.id);
  assert.notEqual(corrected.id, doc.id);
  const rest = await fetch(
    process.env.NEXT_PUBLIC_SUPABASE_URL + "/rest/v1/finance_charges?select=id",
    { headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY } },
  );
  assert([401, 403, 307].includes(rest.status));
  console.log(
    "PASS receipt duplicates, downloads, staff isolation, manager review and REST denial",
  );
} finally {
  await pool.query("DELETE FROM finance_documents WHERE id=ANY($1::uuid[])", [
    ids.docs,
  ]);
  await pool.query(
    "DELETE FROM finance_movements WHERE account_id=ANY($1::uuid[]) OR destination_id=ANY($1::uuid[])",
    [ids.accounts],
  );
  await pool.query(
    "DELETE FROM finance_charges WHERE id=ANY($1::uuid[]) OR title LIKE $2",
    [ids.charges, prefix + "%"],
  );
  await pool.query("DELETE FROM finance_accounts WHERE id=ANY($1::uuid[])", [
    ids.accounts,
  ]);
  await pool.query(
    "DELETE FROM finance_audit WHERE detail->>'requestId'=ANY($1::text[])",
    [ids.requests],
  );
  await pool.query("DELETE FROM finance_requests WHERE id=ANY($1::uuid[])", [
    ids.requests,
  ]);
  await Promise.all(sessions.map((a) => a.auth.signOut({ scope: "local" })));
  await pool.end();
  console.log("QA fixtures and sessions removed");
}
