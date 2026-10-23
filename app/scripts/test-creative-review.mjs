import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import env from "@next/env";
import sharp from "sharp";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL || "http://localhost:3122",
  service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
const u = new URL(
    process.env.SUPABASE_DB_URL || process.env.SUPABASE_DB_URL_DIRECT,
  ),
  db = new pg.Client({
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    host: u.hostname,
    port: Number(u.port) || 5432,
    database: u.pathname.slice(1),
    ssl: { rejectUnauthorized: false },
  });
const brand = randomUUID(),
  other = randomUUID(),
  parent = randomUUID(),
  child = randomUUID(),
  video = randomUUID(),
  carousel = randomUUID(),
  restricted = randomUUID(),
  suffix = randomUUID(),
  slug = "qa-review-" + suffix;
const users = [],
  sessions = [];
const ok = async (promise) => {
  const r = await promise;
  assert.ifError(r.error);
  return r.data;
};
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
  const link = await ok(
    service.auth.admin.generateLink({ type: "magiclink", email }),
  );
  await ok(
    auth.auth.verifyOtp({
      token_hash: link.properties.hashed_token,
      type: "magiclink",
    }),
  );
  sessions.push(auth);
  return () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function request(path, cookie, data, extra = {}) {
  const r = await fetch(base + path, {
    method: data ? "POST" : "GET",
    redirect: "manual",
    headers: {
      ...(cookie ? { cookie: cookie() } : {}),
      ...(data
        ? { "Content-Type": "application/json", origin: new URL(base).origin }
        : {}),
      ...extra,
    },
    ...(data ? { body: JSON.stringify(data) } : {}),
  });
  const raw = await r.text();
  let out;
  try {
    out = JSON.parse(raw);
  } catch {
    out = raw;
  }
  return { status: r.status, out };
}
const versions = async (id) =>
  (
    await db.query(
      "select * from creative_versions where publicacion_id=$1 order by created_at,version",
      [id],
    )
  ).rows;
try {
  await db.connect();
  await ok(
    service.from("marcas").insert([
      { id: brand, slug, nombre: "QA Revisiones", activa: true },
      { id: other, slug: slug + "-b", nombre: "QA Otra marca", activa: true },
    ]),
  );
  const owner = await session("pedro@agenciadistinto.com");
  for (const role of ["restricted", "client"]) {
    const email = `qa-review-${role}-${suffix}@example.com`;
    const user = await ok(
      service.auth.admin.createUser({ email, email_confirm: true }),
    );
    users.push({ id: user.user.id, email });
  }
  await ok(
    service.from("team_members").insert({
      id: restricted,
      auth_user_id: users[0].id,
      email: users[0].email,
      nombre: "QA Diseño",
      rol_base: "disenador",
      activo: true,
      marcas_acceso: [other],
      permisos_override: {
        diseno: { acceso: true },
        marcas: { acceso: true },
      },
    }),
  );
  await ok(
    service.from("marca_clientes").insert({
      marca_id: brand,
      auth_user_id: users[1].id,
      email: users[1].email,
      nombre: "QA Cliente",
    }),
  );
  const team = await session(users[0].email),
    client = await session(users[1].email);
  for (const [id, name, design] of [
    [parent, "QA Diseño principal", true],
    [child, "QA Entregable", true],
    [video, "QA Video", false],
    [carousel, "QA Carrusel", true],
  ])
    await ok(
      service.from("publicaciones").insert({
        id,
        marca_id: brand,
        nombre: name,
        es_tarea_diseno: design,
        estado_tarea: "sin_empezar",
      }),
    );
  await ok(
    service.from("diseno_entregables").insert({
      tarea_id: parent,
      publicacion_id: child,
      titulo: "QA Entregable",
      orden: 1,
    }),
  );
  const path = "/api/creative-review/" + parent;
  assert.equal((await request(path, owner)).status, 200);
  assert.equal((await request(path, team)).status, 404);
  assert([403, 307].includes((await request(path, client)).status));
  assert([401, 307].includes((await request(path, null)).status));
  const post = async (id) => {
    const r = await request(path, owner, id);
    assert.equal(r.status, 200, JSON.stringify(r.out));
    return r.out;
  };
  const url1 = "https://example.com/design-v1.png",
    url2 = "https://example.com/design-v2.png";
  await post({
    action: "delivery",
    publicationId: child,
    slot: "diseno",
    url: url1,
  });
  let vs = await versions(child);
  assert.equal(vs.length, 1);
  assert.equal(vs[0].version, 1);
  assert.equal(vs[0].counts_change, false);
  await post({
    action: "delivery",
    publicationId: child,
    slot: "diseno",
    url: url1,
  });
  assert.equal((await versions(child)).length, 1);
  await Promise.all([
    post({
      action: "delivery",
      publicationId: child,
      slot: "diseno",
      url: url2,
    }),
    post({
      action: "delivery",
      publicationId: child,
      slot: "diseno",
      url: url2,
    }),
  ]);
  vs = await versions(child);
  assert.equal(vs.length, 2);
  assert.equal(vs[1].version, 2);
  assert(vs[1].counts_change);
  const mirrors = await db.query(
    "select d.link,p.drive_resultado_url,p.portada_editada_url from diseno_entregables d join publicaciones p on p.id=d.publicacion_id where p.id=$1",
    [child],
  );
  assert(Object.values(mirrors.rows[0]).every((x) => x === url2));
  const noteId = randomUUID();
  const note = {
    action: "note",
    id: noteId,
    versionId: vs[0].id,
    text: "Cambiar el color del título",
    attachments: [
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jB1sAAAAASUVORK5CYII=",
    ],
    requestedBy: "Cliente de prueba",
    x: 0.3,
    y: 0.2,
    width: 0.2,
    height: 0.15,
    page: 1,
  };
  await post(note);
  const referencePath = `/api/creative-review/reference/${noteId}/0`;
  const reference = await fetch(base + referencePath, {
    headers: { cookie: owner() },
  });
  assert.equal(reference.status, 200);
  assert.equal(reference.headers.get("content-type"), "image/png");
  assert.equal(
    Buffer.from(await reference.arrayBuffer())
      .subarray(0, 4)
      .toString("hex"),
    "89504e47",
  );
  assert.equal((await request(referencePath, team)).status, 404);
  assert([403, 307].includes((await request(referencePath, client)).status));
  await post(note);
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from creative_review_notes where version_id=$1",
        [vs[0].id],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (await request(path, owner, note, { origin: "https://evil.example" }))
      .status,
    403,
  );
  assert.equal(
    (await request(path, owner, { ...note, id: randomUUID(), x: 2 })).status,
    400,
  );
  await post({ action: "closeRound", versionId: vs[0].id });
  await post({ ...note, id: randomUUID(), text: "Segunda ronda" });
  assert.equal(
    (
      await db.query(
        "select count(*)::int n from creative_review_rounds where version_id=$1",
        [vs[0].id],
      )
    ).rows[0].n,
    2,
  );
  await post({
    action: "state",
    id: noteId,
    state: "aplicado",
    appliedVersionId: vs[1].id,
  });
  assert.equal(
    (
      await db.query(
        "select applied_version_id from creative_review_notes where id=$1",
        [noteId],
      )
    ).rows[0].applied_version_id,
    vs[1].id,
  );
  assert.equal(
    (await request("/api/creative-review/media/" + vs[0].id, team)).status,
    404,
  );
  assert(
    [403, 307].includes(
      (await request("/api/creative-review/media/" + vs[0].id, client)).status,
    ),
  );
  const force = {
    action: "manualVersion",
    versionId: vs[1].id,
    requestId: randomUUID(),
  };
  await post(force);
  await post(force);
  assert.equal((await versions(child)).length, 3);
  await post({
    action: "exclude",
    versionId: vs[1].id,
    reason: "Enlace equivocado de prueba",
  });
  assert((await versions(child))[1].exclusion_reason);
  // All existing write paths are covered by the DB trigger, including independent video variants.
  const driveId = "1AbCdEfGhIjKlMnOpQrStUvWxYz12345";
  await ok(
    service
      .from("publicaciones")
      .update({
        video_con_musica_url: `https://drive.google.com/file/d/${driveId}/view?usp=sharing`,
      })
      .eq("id", video),
  );
  await ok(
    service
      .from("publicaciones")
      .update({
        video_con_musica_url: `https://drive.google.com/open?id=${driveId}`,
        video_sin_musica_url: "https://example.com/silent1.mp4",
      })
      .eq("id", video),
  );
  assert.equal((await versions(video)).length, 2);
  assert(
    (await versions(video)).every((v) => v.version === 1 && !v.counts_change),
  );
  await ok(
    service
      .from("publicaciones")
      .update({ video_sin_musica_url: "https://example.com/silent2.mp4" })
      .eq("id", video),
  );
  assert.equal((await versions(video)).at(-1).version, 2);
  await ok(
    service
      .from("publicaciones")
      .update({ video_sin_musica_url: null })
      .eq("id", video),
  );
  await ok(
    service
      .from("publicaciones")
      .update({ video_sin_musica_url: "https://example.com/silent2.mp4" })
      .eq("id", video),
  );
  assert.equal((await versions(video)).length, 3);
  const slides = [
    "https://example.com/slide1.png",
    "https://example.com/slide2.png",
  ];
  await ok(
    service
      .from("publicaciones")
      .update({
        carrusel_slides: slides,
        drive_resultado_url: slides[0],
        portada_editada_url: slides[0],
      })
      .eq("id", carousel),
  );
  assert.equal((await versions(carousel)).length, 2);
  assert((await versions(carousel)).every((v) => v.version === 1));
  const cr = await request("/api/creative-review/" + carousel, owner, {
    action: "delivery",
    publicationId: carousel,
    slot: "slide_2",
    url: "https://example.com/slide2b.png",
  });
  assert.equal(cr.status, 200, JSON.stringify(cr.out));
  assert.equal((await versions(carousel)).length, 3);
  const month = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
  }).format(new Date());
  const metrics = await request(
    `/api/creative-review/stats?mes=${month}&marca=${slug}`,
    owner,
  );
  assert.equal(metrics.status, 200, JSON.stringify(metrics.out));
  assert.equal(metrics.out.delivered, 3);
  assert.equal(metrics.out.returned, 3);
  assert.equal(metrics.out.updates, 3);
  assert.equal(metrics.out.rate, 100);
  assert.equal(
    (
      await request(
        `/api/creative-review/stats?mes=${month}&marca=${slug}`,
        team,
      )
    ).status,
    404,
  );
  const snapshot = 'data:image/png;base64,' + (await sharp({ create: { width: 300, height: 180, channels: 3, background: '#ab74ed' } }).png().toBuffer()).toString('base64');
  const sketchPath = path + '/boceto';
  const seed = { versionId: vs[0].id, image: snapshot, create: true };
  assert.equal((await request(sketchPath, team, seed)).status, 404);
  assert([403, 307].includes((await request(sketchPath, client, seed)).status));
  assert([401, 307].includes((await request(sketchPath, null, seed)).status));
  assert.equal((await request(sketchPath, owner, seed, { origin: 'https://evil.example' })).status, 403);
  assert.equal((await request(sketchPath, owner, { ...seed, image: 'data:image/png;base64,SGVsbG8=' })).status, 422);
  assert.equal((await request(sketchPath, owner, { ...seed, versionId: (await versions(carousel))[0].id })).status, 404);
  const seeded = await Promise.all([request(sketchPath, owner, seed), request(sketchPath, owner, seed)]);
  seeded.forEach(r => assert.equal(r.status, 200, JSON.stringify(r.out)));
  assert.equal(seeded.filter(r => r.out.inserted).length, 1);
  const sheet = (await db.query('SELECT * FROM strategy_records WHERE boceto_publicacion_id=$1', [parent])).rows;
  assert.equal(sheet.length, 1); assert.equal(sheet[0].data.sharedWithClient, false);
  const scenePath = '/api/estrategia/hojas/' + sheet[0].id;
  let scene = (await request(scenePath, owner)).out.scene;
  assert.equal(scene.elements.filter(e => e.customData?.deliveryVersionId).length, 1);
  assert.equal(Object.keys(scene.files).length, 1);
  const anchor = scene.elements.find(e => e.id === seeded[0].out.anchorId);
  assert.equal(anchor.customData.deliveryVersionId, vs[0].id); assert.equal(anchor.locked, true);
  const mark = { ...scene.elements.find(e => e.type === 'rectangle'), id: randomUUID(), x: 200, y: 200, width: 90, height: 60, version: 2 };
  assert.equal((await request(scenePath, owner, { action: 'scene', elements: [...scene.elements, mark], files: scene.files })).status, 200);
  const next = await request(sketchPath, owner, { ...seed, versionId: vs[1].id });
  assert.equal(next.status, 200); assert(next.out.inserted);
  // A late save from another tab must keep the imported V2.
  assert.equal((await request(scenePath, owner, { action: 'scene', elements: [...scene.elements, mark], files: scene.files })).status, 200);
  scene = (await request(scenePath, owner)).out.scene;
  assert.equal(scene.elements.filter(e => e.customData?.deliveryVersionId).length, 2);
  assert(scene.elements.some(e => e.id === mark.id)); assert.equal(Object.keys(scene.files).length, 2);
  const beforeVersions = (await versions(child)).length;
  assert.equal((await request('/api/creative-review/' + child + '/boceto', owner, seed)).out.inserted, false);
  assert.equal((await versions(child)).length, beforeVersions);
  const deleted = scene.elements.map(e => e.id === anchor.id ? { ...e, isDeleted: true, version: e.version + 1 } : e);
  await request(scenePath, owner, { action: 'scene', elements: deleted, files: scene.files });
  assert.equal((await request(sketchPath, owner, seed)).out.inserted, false);
  assert((await request(scenePath, owner)).out.scene.elements.find(e => e.id === anchor.id).isDeleted);
  await db.query('UPDATE strategy_records SET archived=true WHERE id=$1', [sheet[0].id]);
  assert.equal((await request(sketchPath, owner, seed)).status, 409);
  await db.query('UPDATE strategy_records SET archived=false WHERE id=$1', [sheet[0].id]);
  console.log('PASS: sketch import, image validation, parent/child, concurrent deduplication, V1/V2 separation, annotations and stale saves preserved, deletion, archive, brand/client/origin isolation.');
  const ssrf = "https://127.0.0.1/private";
  await post({
    action: "delivery",
    publicationId: child,
    slot: "diseno",
    url: ssrf,
  });
  const blocked = await request(
    "/api/creative-review/media/" +
      (await versions(child)).at(-1).id +
      "?info=1",
    owner,
  );
  assert.equal(blocked.status, 422);
  const anon = await service
    .from("creative_versions")
    .select("id")
    .eq("publicacion_id", child);
  assert.ifError(anon.error);
  const publicClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    { auth: { persistSession: false } },
  );
  const denied = await publicClient
    .from("creative_versions")
    .select("id")
    .eq("publicacion_id", child);
  assert(denied.error || denied.data.length === 0);
  const canon = (
    await db.query(
      "select creative_asset_key('https://example.com/a?utm_source=a&x=1') a,creative_asset_key('https://example.com/a?x=1') b",
    )
  ).rows[0];
  assert.equal(canon.a, canon.b);
  console.log(
    "PASS: V1/V2, concurrent/idempotent saves, mirror fields, canonical Drive, video variants, carousel, pin/round history, resolve against newer version, manual versions, exclusions, monthly rates, permissions, RLS and SSRF.",
  );
} finally {
  await Promise.allSettled(
    sessions.map((s) => s.auth.signOut({ scope: "local" })),
  );
  await ok(service.from("publicaciones").delete().eq("marca_id", brand));
  await ok(service.from("marca_clientes").delete().eq("marca_id", brand));
  await ok(service.from("team_members").delete().eq("id", restricted));
  for (const user of users) await ok(service.auth.admin.deleteUser(user.id));
  await ok(service.from("marcas").delete().in("id", [brand, other]));
  await db.end();
  console.log("Temporary QA data removed.");
}
