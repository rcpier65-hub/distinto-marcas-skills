import assert from "node:assert/strict";
import { occurrences, remaining, date, accountBalance, accountTotals } from "../lib/finanzas/model.ts";
assert.deepEqual(
  occurrences(
    { frequency: "weekly", day: 6, starts: "2026-11-01", ends: null },
    "2026-11",
  ),
  ["2026-11-07", "2026-11-14", "2026-11-21", "2026-11-28"],
);
assert.equal(
  occurrences(
    { frequency: "weekly", day: 6, starts: "2026-01-01", ends: null },
    "2026-08",
  ).length,
  5,
);
assert.deepEqual(
  occurrences(
    { frequency: "monthly", day: 31, starts: "2026-01-01", ends: null },
    "2026-02",
  ),
  ["2026-02-28"],
);
assert.deepEqual(
  occurrences(
    { frequency: "monthly", day: 31, starts: "2026-01-01", ends: null },
    "2028-02",
  ),
  ["2028-02-29"],
);
assert.deepEqual(
  occurrences(
    { frequency: "weekly", day: 6, starts: "2026-11-12", ends: "2026-11-23" },
    "2026-11",
  ),
  ["2026-11-14", "2026-11-21"],
);
assert.equal(
  remaining({
    state: "confirmed",
    base: 180000,
    tax: 0,
    prior_credit: 72000,
    settled: 0,
  }),
  108000,
);
assert.equal(
  remaining({
    state: "confirmed",
    base: 280000,
    tax: 50400,
    prior_credit: 0,
    settled: 330400,
  }),
  0,
);
assert.equal(date.safeParse("2026-02-30").success, false);
// No se convierte un movimiento conocido en saldo ni se suman monedas.
const account = { currency: "PEN", opening: null, opening_date: null, movements: 250000 };
assert.equal(accountBalance(account), null);
assert.equal(accountBalance({ ...account, opening: 0 }), null);
const bank = { ...account, opening: 0, opening_date: "2026-10-30" };
assert.equal(accountBalance(bank), 250000);
assert.equal(accountBalance({ ...bank, currency: null }), null);
const accounts = [bank, account, { ...bank, currency: "USD", opening: 10000, movements: -10000 }];
assert.deepEqual(accountTotals(accounts, "PEN"), { total: 250000, known: 1, pending: 1 });
assert.deepEqual(accountTotals(accounts, "USD"), { total: 0, known: 1, pending: 0 });
assert.deepEqual(accountTotals([account], "PEN"), { total: null, known: 0, pending: 1 });
assert.deepEqual(accountTotals([], "USD"), { total: null, known: 0, pending: 0 });
assert.equal(accountBalance({ ...bank, movements: -10000 }), -10000);
// El neto de cada cuenta ya incorpora transferencias: el total no se duplica.
assert.equal(accountTotals([{ ...bank, opening: 10000, movements: -6000 }, { ...bank, movements: 6000 }], "PEN").total, 10000);
console.log(
  "PASS schedules, credit/tax, dates; account balances, unknown/zero/negative, currency isolation and transfers",
);
