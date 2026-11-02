import assert from "node:assert/strict";
import { prepareQuickEntry, parseMoney } from "../lib/finanzas/quick-entry.ts";
const accounts = [
  { id: "bcp-p", name: "BCP Pedro / Yape", owner: "pedro", currency: null },
  { id: "bcp-n", name: "BCP Nayeli", owner: "nayeli", currency: "PEN" },
  { id: "yape-n", name: "Yape Nayeli", owner: "nayeli", currency: "PEN" },
  { id: "bbva", name: "BBVA Pedro", owner: "pedro", currency: "PEN" },
];
const charges = [
  {
    id: "kintu",
    title: "Kintu · saldo de octubre",
    kind: "income",
    currency: "PEN",
    scope: "agency",
    owner: "pedro",
    base: 100000,
    tax: 0,
    prior_credit: 0,
    settled: 0,
    state: "confirmed",
  },
  {
    id: "lorena",
    title: "Lorena · honorarios",
    kind: "expense",
    currency: "PEN",
    scope: "agency",
    owner: "agency",
    base: 180000,
    tax: 0,
    prior_credit: 0,
    settled: 0,
    state: "review",
  },
];
const context = {
  today: "2026-11-01",
  scope: "agency",
  currency: "PEN",
  accounts,
  charges,
};
function parse(s) {
  return prepareQuickEntry(s, context);
}
let d = parse("registra un gasto de 100 soles de la cuenta Bcp");
assert.equal(d.amount, 10000);
assert.deepEqual(d.accountIds, ["bcp-p", "bcp-n"]);
assert.deepEqual(d.problems, []);
d = parse("Gasté 100 soles en movilidad con BCP de Pedro");
assert.equal(d.amount, 10000);
assert.deepEqual(d.accountIds, ["bcp-p"]);
assert.match(d.title, /movilidad/i);
assert.equal(d.owner, "agency");
assert.deepEqual(d.problems, []);
d = parse("Pagué cien soles en taxi con B C P de Pedro ayer");
assert.equal(d.amount, 10000);
assert.equal(d.date, "2026-10-31");
assert.deepEqual(d.accountIds, ["bcp-p"]);
assert.deepEqual(d.problems, []);
d = parse("Recibí mil soles de Kintu en Yape de Nayeli");
assert.equal(d.kind, "income");
assert.equal(d.amount, 100000);
assert.deepEqual(d.chargeIds, ["kintu"]);
assert.deepEqual(d.accountIds, ["yape-n"]);
assert.deepEqual(d.problems, []);
d = parse("Pagué mil ochocientos soles a Lorena desde BBVA");
assert.equal(d.amount, 180000);
assert.deepEqual(d.chargeIds, ["lorena"]);
assert.deepEqual(d.problems, []);
for (const [s, n] of [
  ["1,500.50", 150050],
  ["1.500,50", 150050],
  ["100,50", 10050],
  ["ciento veinticinco con cincuenta", 12550],
  ["doscientos treinta y cinco", 23500],
  ["mil quinientos", 150000],
  ["15", 1500],
])
  assert.equal(parseMoney(s), n, s);
d = parse("Gasto personal de 30 soles en almuerzo con BCP Pedro");
assert.equal(d.scope, "personal");
assert.equal(d.owner, null);
assert.equal(d.amount, 3000);
d = parse("Gasto personal de Pedro de 30 soles en almuerzo con Interbank de la agencia");
assert.equal(d.scope, "personal");
assert.equal(d.owner, "pedro");
d = parse("Pagué 20 soles en taxi el 31/10/2026 con BBVA");
assert.equal(d.date, "2026-10-31");
assert.deepEqual(d.problems, []);
d = parse("Gasté S/ 12.50 en café con BBVA");
assert.equal(d.amount, 1250);
assert.deepEqual(d.problems, []);
for (const s of [
  "Gasté 100 soles y 50 soles en taxi",
  "Gasté 100 soles y 50 dólares",
  "No pagué 100 soles a Lorena",
  "No gasté 100 soles en movilidad",
  "No he recibido 100 soles de Kintu",
  "Transfiere 100 soles del BCP a BBVA",
  "Pagaré 100 soles mañana",
  "Gasto de -100 soles en taxi",
  "Gasto de 100 soles el 31/02/2026",
  "Pagué 100 soles con retención",
  "Pagué 100 soles el lunes",
  "Anula un gasto de 100 soles",
  "Gasté 100 soles y 20 en taxi",
])
  assert.ok(parse(s).problems.length, s);
assert.equal(
  parse("Gasté doscientos soles con BBVA anteayer").date,
  "2026-10-30",
);
console.log(
  "PASS phrase parsing, spoken amounts, account ambiguity, ownership separation, debt matching, dates and unsafe instructions",
);
assert.equal(
  parse("Gasté cien soles con cincuenta céntimos en movilidad").amount,
  10050,
);
assert.equal(parse("Gasté 100 soles con 50 céntimos en taxi").amount, 10050);
assert.equal(
  parse("Gasté 100 soles en movilidad con BCP de Pedro").title,
  "Movilidad",
);
assert.equal(parse("Gasto de 1 sol en QA movilidad").title, "Qa movilidad");
assert.equal(parse("Gasté un dólar en café").amount, 100);
