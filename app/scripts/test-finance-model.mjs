import assert from "node:assert/strict";
import { occurrences, remaining, date } from "../lib/finanzas/model.ts";
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
console.log(
  "PASS weekly/monthly boundaries, leap years, schedule start/end, credit and tax arithmetic, impossible dates",
);
