import assert from "node:assert/strict";
import env from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL || "http://localhost:3117";
const service = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } },
);
const sessions = [];
async function session(email) {
  const jar = new Map();
  const auth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [...jar].map(([name, value]) => ({ name, value })),
        setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)),
      },
    },
  );
  const { data, error } = await service.auth.admin.generateLink({
    type: "magiclink",
    email,
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
  return () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
try {
  const owner = await session("pedro@agenciadistinto.com"),
    client = await session("total@distintostudio.com");
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const endpoint = "/api/meta/reporte-redes?marca=little-joe&mes=" + month;
  const get = (query, cookie) =>
    fetch(base + query, {
      headers: cookie ? { cookie: cookie() } : undefined,
      redirect: "manual",
    });
  for (const detail of ["report", "posts"]) {
    assert(
      [401, 307].includes((await get(endpoint + "&detalle=" + detail)).status),
    );
    assert(
      [403, 307].includes(
        (await get(endpoint + "&detalle=" + detail, client)).status,
      ),
    );
  }
  const headers = { cookie: owner() };
  const before = await service
    .from("meta_brand_accounts")
    .select("*")
    .order("marca_id");
  assert.ifError(before.error);
  for (const query of ["accountId=123", "tool=write", "detalle=other"])
    assert.equal((await get(endpoint + "&" + query, owner)).status, 400);
  assert.equal(
    (await get("/api/meta/reporte-redes?marca=little-joe&mes=2026-13", owner))
      .status,
    400,
  );
  assert.equal(
    (
      await get(
        "/api/meta/reporte-redes?marca=missing-brand&mes=" + month,
        owner,
      )
    ).status,
    404,
  );
  assert.equal(
    (await get("/api/meta/reporte-redes?marca=total-sups&mes=" + month, owner))
      .status,
    409,
  );
  const page = await fetch(base + "/marca/little-joe/reportes", { headers });
  assert.equal(page.status, 200);
  assert((await page.text()).includes("Reporte de redes sociales"));
  if (process.env.TEST_LIVE_META === "1") {
    let r = await get(endpoint, owner);
    assert.equal(r.status, 200);
    const d = await r.json();
    assert.deepEqual(
      d.channels.map((c) => c.network),
      ["facebook", "instagram"],
    );
    assert.equal(d.ads.name, "TEAM LITTLE JOE");
    assert.equal(d.ads.currency, "USD");
    for (const c of d.channels) {
      assert.equal(typeof c.followers, "number");
      assert.equal(typeof c.current.views, "number");
      assert.equal(typeof c.current.reach, "number");
      assert.equal(typeof c.current.likes, "number");
    }
    assert.equal(d.channels[1].organic, null);
    const fb = d.channels[0];
    assert.equal(fb.organic + fb.paid, fb.current.views);
    assert(d.ads.current.spend > 0);
    assert(d.ads.current.conversations > 0);
    const again = await get(endpoint, owner).then((r) => r.json());
    assert.equal(
      again.checkedAt,
      d.checkedAt,
      "Repeat read uses a cached snapshot",
    );
    r = await get(endpoint + "&detalle=posts", owner);
    assert.equal(r.status, 200);
    const posts = await r.json();
    assert.equal(posts.groups.length, 2);
    for (const g of posts.groups) {
      assert(g.posts.length <= 3);
      assert(g.posts.length > 0);
      for (const p of g.posts) {
        assert.equal(p.network, g.network);
        assert(p.publishedAt.slice(0, 7) === month);
        assert(p.url?.startsWith("https://"));
      }
    }
    const body = JSON.stringify({ d, posts });
    for (const secret of [
      "access_token",
      "tokens_encrypted",
      "refresh_token",
      "token_context",
    ])
      assert(!body.includes(secret));
    console.log(
      JSON.stringify({
        period: d.period,
        channels: d.channels.map((c) => ({
          network: c.network,
          followers: c.followers,
          views: c.current.views,
          reach: c.current.reach,
          likes: c.current.likes,
        })),
        ads: d.ads.current,
        posts: posts.groups.map((g) => ({
          network: g.network,
          count: g.posts.length,
        })),
        checkedAt: d.checkedAt,
      }),
    );
  }
  const after = await service
    .from("meta_brand_accounts")
    .select("*")
    .order("marca_id");
  assert.ifError(after.error);
  assert.deepEqual(after.data, before.data);
  console.log(
    "PASS report access, fixed brand/account scope, input validation, unchanged bindings and no secrets in report",
  );
} finally {
  for (const auth of sessions) await auth.auth.signOut({ scope: "local" });
}
