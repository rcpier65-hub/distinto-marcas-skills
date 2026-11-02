import assert from "node:assert/strict";
import { prepareQuickEntry, parseMoney, reviewClassification } from "../lib/finanzas/quick-entry.ts";
const accounts = [
  { id: "bcp-p", name: "BCP Pedro / Yape", owner: "pedro", usage: "personal", currency: null },
  { id: "bcp-n", name: "BCP Nayeli", owner: "nayeli", usage: "agency", currency: "PEN" },
  { id: "yape-n", name: "Yape Nayeli", owner: "nayeli", usage: "personal", currency: "PEN" },
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
assert.deepEqual(reviewClassification(parse('Gasté 31.40 soles en desodorante con Yape de Nayeli'), accounts[2]), {space:'personal',owner:'nayeli'});
assert.deepEqual(reviewClassification(parse('Gasté 20 soles para la agencia con Yape de Nayeli'), accounts[2]), {space:'agency',owner:'agency'});
assert.deepEqual(reviewClassification(parse('Gasto personal de Pedro de 20 soles con BCP de Nayeli'), accounts[1]), {space:'personal',owner:'pedro'});
assert.deepEqual(reviewClassification(parse('Recibí mil soles de Kintu en Yape de Nayeli'), accounts[2], charges[0]), {space:'agency',owner:'pedro'});
assert.deepEqual(reviewClassification(parse('Pagué a Lorena 1800 soles con Yape de Nayeli'), accounts[2], charges[1]), {space:'agency',owner:'agency'});
assert.deepEqual(reviewClassification(parse('Gasté 10 soles en café con BCP'), accounts[1]), {space:'agency',owner:'agency'});
assert.deepEqual(reviewClassification(parse('Gasté 10 soles en café con BCP'), accounts[0]), {space:'personal',owner:'pedro'});
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

for (const phrase of [
  "Me transferí 1,500 soles del BCP de Nayeli al BCP de Pedro",
  "Transferí mil quinientos soles desde BCP Nayeli hacia BCP Pedro",
  "Me transferí 1500 a BCP Pedro desde BCP Nayeli",
  "Registra una transferencia de 1500 soles del BCP de Nayeli al BCP de Pedro",
]) {
  const t = parse(phrase);
  assert.equal(t.kind, "transfer", phrase);
  assert.equal(t.amount, 150000, phrase);
  assert.deepEqual(t.accountIds, ["bcp-n"], phrase);
  assert.deepEqual(t.destinationIds, ["bcp-p"], phrase);
  assert.deepEqual(t.chargeIds, []);
  assert.deepEqual(t.problems, [], phrase);
}
d = parse("Me transferí a mi cuenta personal");
assert.equal(d.kind, "transfer");
assert.equal(d.amount, null);
assert.deepEqual(d.accountIds, []);
assert.deepEqual(d.destinationIds, ["bcp-p", "yape-n"]);
assert.deepEqual(d.problems, []);
d = parse("Transferí 100 soles desde BBVA a Yape Nayeli ayer");
assert.equal(d.date, "2026-10-31");
assert.deepEqual(d.accountIds, ["bbva"]);
assert.deepEqual(d.destinationIds, ["yape-n"]);
d = parse("Transferí 20 soles del BCP a mi cuenta personal");
assert.deepEqual(d.accountIds, ["bcp-p", "bcp-n"]);
assert.deepEqual(d.destinationIds, ["bcp-p", "yape-n"]);
assert.equal(parse("Recibí una transferencia de Kintu por 100 soles en BCP Pedro").kind, "income");
assert.equal(parse("Pagué una comisión por transferencia de 5 soles con BBVA").kind, "expense");
for (const phrase of [
  "No me transferí 100 soles de BCP Nayeli a BCP Pedro",
  "No me he transferido 100 soles",
  "Voy a transferirme 100 soles del BCP a BBVA",
  "Transferí -100 soles del BCP a BBVA",
  "Transferí 100 soles y 100 dólares del BCP a BBVA",
  "Transferí 100 soles mañana del BCP a BBVA",
  "Transferí 100 soles y 50 soles del BCP a BBVA",
]) assert.ok(parse(phrase).problems.length, phrase);
console.log("PASS internal transfers, separate source/destination, spoken amounts, incomplete drafts, ambiguous personal accounts and non-transfer bank payments");
