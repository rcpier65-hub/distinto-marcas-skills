import assert from "node:assert/strict";
import {
  reportPeriod,
  chunks30,
  combineInstagram,
  blankValues,
  number,
  exactSum,
  delta,
  daily,
  uniqueReach,
  splitViews,
  growth,
  publicURL,
} from "../lib/social-reports/model.ts";

const current = reportPeriod("2026-10", "2026-10-17");
assert.deepEqual(current.current, {
  start: "2026-10-01",
  end: "2026-10-17",
  days: 16,
});
assert.deepEqual(current.previous, {
  start: "2026-09-01",
  end: "2026-09-17",
  days: 16,
});
assert.equal(reportPeriod("2026-10", "2026-10-01").current.days, 0);
assert.equal(reportPeriod("2024-02", "2025-01-17").current.days, 29);
assert.equal(reportPeriod("2026-02", "2026-03-01").current.days, 28);
assert.equal(reportPeriod("2026-03", "2026-03-31").previous.days, 28);
for (const month of ["2026-13", "2026-1", "2026-11", "2020-01"])
  assert.throws(() => reportPeriod(month, "2026-10-17"));
const full31 = reportPeriod("2026-08", "2026-10-17").current;
assert.deepEqual(chunks30(full31), [
  { start: "2026-08-01", end: "2026-08-31", days: 30 },
  { start: "2026-08-31", end: "2026-09-01", days: 1 },
]);
const parts = [
  { ...blankValues(), views: 300, reach: 100, likes: 0 },
  { ...blankValues(), views: 20, reach: 15, likes: 0 },
];
assert.equal(combineInstagram(parts).views, 320);
assert.equal(
  combineInstagram(parts).reach,
  null,
  "Never add unique accounts across subperiods",
);
assert.equal(combineInstagram(parts).likes, 0, "Real zero is preserved");
assert.equal(combineInstagram(parts).comments, null, "Missing is not zero");
assert.equal(combineInstagram([parts[0]]).reach, 100);
assert.equal(exactSum([3, null]), null);
assert.equal(exactSum([]), null);
for (const value of [null, undefined, "", "bad", -1, Infinity, "9".repeat(400)])
  assert.equal(number(value), null);
assert.equal(number("0"), 0);
assert.equal(delta(10, 0), null);
assert.equal(delta(0, 10), -100);
assert.equal(delta(120, 100), 20);
const values = [
  { value: 10, end_time: "2026-10-02T07:00:00Z" },
  { value: 20, end_time: "2026-10-03T07:00:00Z" },
];
assert.equal(daily([{ name: "views", values }], "views", 2), 30);
assert.equal(
  daily([{ name: "views", values: values.slice(0, 1) }], "views", 2),
  null,
  "Missing days must not look complete",
);
assert.equal(
  daily([{ name: "views", values: [values[0], values[0]] }], "views", 2),
  null,
  "Duplicate days rejected",
);
assert.equal(
  daily([{ name: "views", values: [{ value: 3 }] }], "views", 1),
  null,
);
assert.equal(
  uniqueReach([{ name: "reach", period: "day", values }], "reach"),
  null,
);
assert.equal(
  uniqueReach(
    [{ name: "reach", period: "total_over_range", values: [{ value: 25 }] }],
    "reach",
  ),
  25,
);
assert.equal(
  daily(
    [
      {
        name: "reactions",
        values: [
          { ...values[0], value: { like: 3, love: 2 } },
          { ...values[1], value: {} },
        ],
      },
    ],
    "reactions",
    2,
    "like",
  ),
  3,
);
const split = [
  {
    name: "page_media_view",
    values: [
      ...values.map((v) => ({ ...v, is_from_ads: "0" })),
      ...values.map((v) => ({ ...v, value: 100, is_from_ads: "1" })),
    ],
  },
];
assert.deepEqual(splitViews(split, 2), { organic: 30, paid: 200 });
assert.deepEqual(splitViews(split, 3), { organic: null, paid: null });
assert.equal(
  growth(
    [
      {
        name: "follows_and_unfollows",
        total_value: {
          breakdowns: [
            {
              dimension_keys: ["follow_type"],
              results: [
                { dimension_values: ["FOLLOWER"], value: 42 },
                { dimension_values: ["NON_FOLLOWER"], value: 8 },
              ],
            },
          ],
        },
      },
    ],
    "NON_FOLLOWER",
  ),
  8,
);
assert.equal(
  publicURL("https://www.instagram.com/p/123/", "instagram"),
  "https://www.instagram.com/p/123/",
);
for (const url of [
  "javascript:alert(1)",
  "https://evil.example/image",
  "https://facebook.com.evil.example/p",
  "https://www.facebook.com/p?access_token=secret",
  "https://user:secret@facebook.com/p",
])
  assert.equal(publicURL(url, "facebook"), null);
console.log(
  "PASS monthly/comparable periods, leap year, 31-day API limit, unique reach, zero/missing data, daily completeness, reactions, follows and public links",
);
