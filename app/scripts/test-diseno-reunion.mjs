// Integración real, con registros temporales y limpieza garantizada.
// TEST_BASE_URL=http://localhost:3122 node scripts/test-diseno-reunion.mjs
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import env from "@next/env";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
env.loadEnvConfig(process.cwd(), false, { info() {}, error() {} });
const base = process.env.TEST_BASE_URL || "http://localhost:3122";
const service = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const suffix = randomUUID(), brandA = randomUUID(), brandB = randomUUID(), design = randomUUID(), normal = randomUUID(), task = randomUUID(), member = randomUUID();
const slugA = `qa-reunion-${suffix}`, slugB = `qa-reunion-b-${suffix}`;
const sessions = [];
let userId;
async function ok(query) { const r = await query; assert.ifError(r.error); return r.data; }
async function session(email) {
  const jar = new Map();
  const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: { getAll: () => [...jar].map(([name, value]) => ({ name, value })), setAll: (cs) => cs.forEach((c) => jar.set(c.name, c.value)) },
  });
  const link = await ok(service.auth.admin.generateLink({ type: "magiclink", email }));
  await ok(auth.auth.verifyOtp({ token_hash: link.properties.hashed_token, type: "magiclink" }));
  sessions.push(auth);
  return () => [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
async function request(path, cookie, data, extra = {}) {
  const r = await fetch(base + path, { method: data ? "POST" : "GET", redirect: "manual", headers: { ...(cookie ? { cookie: cookie() } : {}), ...(data ? { "Content-Type": "application/json", origin: new URL(base).origin } : {}), ...extra }, ...(data ? { body: JSON.stringify(data) } : {}) });
  const text = await r.text();
  let out; try { out = JSON.parse(text); } catch { out = text.slice(0, 100); }
  return { status: r.status, out };
}
const endpoint = "/api/diseno/reunion";
const payload = (activa = true, publicacionId = design) => ({ publicacionId, activa });
const temas = async (cookie, slug = slugA) => {
  const r = await request(`/api/estrategia/reunion-temas?marca=${slug}`, cookie);
  assert.equal(r.status, 200, JSON.stringify(r.out)); return r.out.temas;
};
try {
  await ok(service.from("marcas").insert([{ id: brandA, slug: slugA, nombre: "QA Reunión A", activa: true }, { id: brandB, slug: slugB, nombre: "QA Reunión B", activa: true }]));
  await ok(service.from("publicaciones").insert([
    { id: design, marca_id: brandA, nombre: "QA Diseño para presentar", es_tarea_diseno: true, estado_tarea: "en_progreso" },
    { id: normal, marca_id: brandA, nombre: "QA Publicación sin diseño", es_tarea_diseno: false, estado_tarea: "sin_empezar" },
  ]));
  await ok(service.from("tareas").insert({ id: task, texto: "QA Tarea existente", marca_slug: slugA, completada: true }));
  await ok(service.from("reunion_temas").insert([{ marca_id: brandA, tarea_id: task, texto: "" }, { marca_id: brandA, tarea_id: null, texto: "QA Tema manual" }]));
  const before = await ok(service.from("publicaciones").select("*").eq("id", design).single());
  const owner = await session("pedro@agenciadistinto.com"), client = await session("total@distintostudio.com");
  const email = `qa-reunion-${suffix}@example.com`;
  const created = await ok(service.auth.admin.createUser({ email, email_confirm: true })); userId = created.user.id;
  await ok(service.from("team_members").insert({ id: member, auth_user_id: userId, email, nombre: "QA Diseño reunión", rol_base: "disenador", activo: true, marcas_acceso: [brandB], permisos_override: { diseno: { acceso: true }, marcas: { acceso: true } } }));
  const restricted = await session(email);
  for (const data of [undefined, payload()]) {
    assert([401, 307].includes((await request(endpoint, null, data)).status));
    assert([403, 307].includes((await request(endpoint, client, data)).status));
  }
  assert.equal((await request(endpoint, owner, payload(), { origin: "https://other.example" })).status, 403);
  assert.equal((await request(endpoint, owner, { ...payload(), marca: slugB })).status, 400);
  assert.equal((await request(endpoint, owner, payload(true, normal))).status, 400);
  assert.equal((await request(endpoint, restricted, payload())).status, 403);
  const added = await Promise.all(Array.from({ length: 4 }, () => request(endpoint, owner, payload())));
  for (const r of added) assert.equal(r.status, 200, JSON.stringify(r.out));
  let topics = await temas(owner);
  assert.equal(topics.filter((t) => t.publicacionId === design).length, 1, "Concurrent marking must not duplicate");
  assert.equal(topics.find((t) => t.tareaId === task).hecha, true);
  assert(topics.some((t) => t.tipo === "tema" && t.texto === "QA Tema manual"));
  let d = topics.find((t) => t.publicacionId === design);
  assert.equal(d.tipo, "diseno"); assert.equal(d.hecha, false); assert.equal(d.href, `/diseno/${design}`);
  assert.deepEqual(await ok(service.from("publicaciones").select("*").eq("id", design).single()), before, "Selecting must not alter the original design");
  assert((await request(endpoint, owner)).out.ids.includes(design));
  assert(!(await request(endpoint, restricted)).out.ids.includes(design));
  assert(!(await temas(owner, slugB)).some((t) => t.publicacionId === design));
  await ok(service.from("publicaciones").update({ nombre: "QA Diseño actualizado", diseno_terminado_at: new Date().toISOString(), estado_tarea: "listo", fecha_publicacion: "2026-10-23", es_tarea_diseno: false }).eq("id", design));
  d = (await temas(owner)).find((t) => t.publicacionId === design);
  assert.equal(d.texto, "QA Diseño actualizado"); assert.equal(d.hecha, true); assert.equal(d.href, `/publicaciones/${design}`);
  assert.equal((await request(endpoint, owner, payload(false))).status, 200);
  assert(!(await temas(owner)).some((t) => t.publicacionId === design));
  await ok(service.from("publicaciones").update({ marcas_extra: [brandB] }).eq("id", design));
  assert.equal((await request(endpoint, restricted, payload())).status, 200);
  assert(!(await temas(owner)).some((t) => t.publicacionId === design), "Restricted member only marks their assigned brand");
  assert((await temas(owner, slugB)).some((t) => t.publicacionId === design));
  assert.equal((await request(endpoint, owner, payload())).status, 200);
  assert.equal((await temas(owner, slugB)).filter((t) => t.publicacionId === design).length, 1);
  await ok(service.from("publicaciones").update({ marca_id: brandB, marcas_extra: [] }).eq("id", design));
  assert(!(await temas(owner)).some((t) => t.publicacionId === design), "Brand reassignment removes the old pending selection");
  const start = await request("/api/estrategia/reunion-temas", owner, { marca: slugB, accion: "empezar" });
  assert.equal(start.status, 200, JSON.stringify(start.out));
  const note = await ok(service.from("notas_reuniones").select("cuerpo").eq("id", start.out.notaId).single());
  assert(note.cuerpo.includes("Para presentar")); assert(note.cuerpo.includes("QA Diseño actualizado"));
  const closed = await request("/api/estrategia/reunion-temas", owner, { marca: slugB, accion: "presentado" });
  assert.equal(closed.status, 200); assert.equal(closed.out.temas.length, 0);
  assert(!(await request(endpoint, owner)).out.ids.includes(design));
  await request(endpoint, owner, payload());
  const history = await ok(service.from("reunion_temas").select("estado").eq("publicacion_id", design));
  assert.equal(history.filter((r) => r.estado === "presentado").length, 1);
  assert.equal(history.filter((r) => r.estado === "pendiente").length, 1);
  await ok(service.from("team_members").update({ permisos_override: { diseno: { acceso: false } } }).eq("id", member));
  assert.equal((await request(endpoint, restricted, payload(false))).status, 403);
  assert.equal((await request(endpoint, restricted)).status, 403);
  const invalid = await service.from("reunion_temas").insert({ marca_id: brandB, publicacion_id: design, tarea_id: task });
  assert(invalid.error, "Two sources must be rejected by the database");
  const html = await fetch(base + "/diseno", { headers: { cookie: owner() } }).then((r) => r.text());
  assert(html.includes("Para presentar en reunión"));
  console.log("PASS: guardado concurrente, títulos y estados reales, aislamiento, varias marcas, reasignación, notas, cierre/historial, permisos y botón SSR.");
} finally {
  await Promise.allSettled(sessions.map((s) => s.auth.signOut({ scope: "local" })));
  await ok(service.from("reunion_temas").delete().in("marca_id", [brandA, brandB]));
  await ok(service.from("notas_reuniones").delete().in("marca_id", [brandA, brandB]));
  await ok(service.from("publicaciones").delete().in("id", [design, normal]));
  await ok(service.from("tareas").delete().eq("id", task));
  await ok(service.from("team_members").delete().eq("id", member));
  if (userId) await ok(service.auth.admin.deleteUser(userId));
  await ok(service.from("marcas").delete().in("id", [brandA, brandB]));
  console.log("Registros y sesiones temporales eliminados.");
}
