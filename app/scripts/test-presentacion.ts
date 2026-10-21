/* Presentación de Desarrollo web (Pedro 21-oct-2026). npx tsx scripts/test-presentacion.ts */
import assert from "node:assert/strict";
import { estimarNivel, NIVELES } from "../lib/presentacion/niveles";
import { PLANES } from "../lib/planes/catalogo";

// Niveles y catálogo.
assert.equal(estimarNivel({}).nivel, "basico");
const tienda = estimarNivel({ tipo: "tienda" });
assert.equal(tienda.nivel, "intermedio");
assert.ok(tienda.motivos.some((m) => /carrito/i.test(m)));
assert.equal(estimarNivel({ productos: "mas-200" }).nivel, "avanzado");
assert.equal(estimarNivel({ tipo: "presentacion", integraciones: true }).nivel, "avanzado");
assert.equal(estimarNivel({ tipo: "presentacion", idiomas: true }).nivel, "intermedio");
assert.equal(estimarNivel({ tipo: "landing", paginas: "hasta-5" }).nivel, "basico");
assert.equal(estimarNivel({ tipo: "presentacion", paginas: "mas-10" }).nivel, "intermedio");
for (const r of [{ tipo: "tienda" as const }, { productos: "mas-200" as const }, { idiomas: true }]) assert.ok(estimarNivel(r).motivos.length > 0);
assert.equal(NIVELES.basico.desde, 1800);
assert.deepEqual([NIVELES.intermedio.desde, NIVELES.intermedio.hasta], [3000, 3500]);
assert.deepEqual([NIVELES.avanzado.desde, NIVELES.avanzado.hasta], [5000, 8000]);
assert.match(NIVELES.avanzado.plazo, /30.*45/);
for (const n of Object.values(NIVELES)) assert.ok(PLANES.some((p) => p.id === n.catalogoId && p.categoria === "web"), n.catalogoId);
console.log("✓ presentación: niveles");

// Checklist, sesión y propuesta.
import { aPropuesta, checklistInicial, CHECKLIST, FAQ, PREGUNTAS, sesionSchema, sesionVacia } from "../lib/presentacion/web";
import { proposalSchema, readyIssues } from "../lib/propuestas/model";
let n = 0;
const uid = () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
assert.ok(PREGUNTAS.length >= 10 && CHECKLIST.length >= 12 && FAQ.length >= 8);
const vacia = sesionVacia({ nombre: "Ana", empresa: "Ferretería Sol", rubro: "Ferretería", contacto: "" });
const pv = aPropuesta(vacia, "2026-10-21", uid);
assert.equal(pv.status, "borrador");
assert.equal(pv.services.length, 1);
assert.equal(pv.services[0].sourceId, "web-nivel-basico");
proposalSchema.parse(pv);

const s = sesionVacia({ nombre: "Ana", empresa: "Ferretería Sol", rubro: "Ferretería", contacto: "ana@sol.pe" });
s.respuestas = { tipo: "tienda", pagos: true };
s.checklist = { ...checklistInicial(s.respuestas), blog: "opcional", idiomas: "no" };
s.notas = "Nota interna: cliente indeciso.";
s.textos = { objetivo: "Vender herramientas online." };
const p = aPropuesta(s, "2026-10-21", uid);
const base = p.services.find((x) => !x.optional)!;
assert.equal(base.sourceId, "web-nivel-intermedio");
assert.equal(base.price, null);
assert.equal(base.frequency, "unico");
assert.match(base.scope, /Carrito/);
assert.ok(p.services.some((x) => x.optional && /Blog/.test(x.name) && x.price === null));
assert.ok(!p.services.some((x) => /idioma/i.test(x.name)));
assert.match(p.objective, /Vender herramientas/);
assert.doesNotMatch(p.objective, /Nota interna/);
assert.match(base.deliverables, /baja, media y alta/);
assert.match(p.payment, /50%/);
const conPrecio = aPropuesta({ ...s, precio: 3200 }, "2026-10-21", uid);
assert.equal(conPrecio.services.find((x) => !x.optional)!.price, 3200);
assert.deepEqual(readyIssues(conPrecio), []);
assert.equal(p.client.name, "Ferretería Sol");
assert.equal(p.client.email, "ana@sol.pe");
proposalSchema.parse(p);
assert.equal(checklistInicial({ tipo: "tienda" }).carrito, "incluido");
assert.equal(sesionSchema.safeParse({ ...s, notas: "x".repeat(4001) }).success, false);
console.log("✓ presentación: checklist y propuesta");

// Revisión final: cambiar el tipo de web baja el nivel y respeta ediciones manuales.
import { aplicarRespuesta, enlaceSeguro, respuestasEfectivas } from "../lib/presentacion/web";
import { crearCola } from "../lib/presentacion/cola";
{
  let x = sesionVacia({ nombre: "", empresa: "X", rubro: "", contacto: "" });
  x = aplicarRespuesta(x, "tipo", "tienda");
  assert.equal(nivelDe(x), "intermedio");
  x = { ...x, checklist: { ...x.checklist, whatsapp: "no", blog: "opcional" } };
  x = aplicarRespuesta(x, "tipo", "presentacion");
  assert.equal(nivelDe(x), "basico");
  assert.equal(x.checklist.carrito ?? "no", "no");
  assert.equal(x.checklist.whatsapp, "no");
  assert.equal(x.checklist.blog, "opcional");
  x = aplicarRespuesta(x, "pagos", true);
  assert.equal(x.checklist.pagos, "incluido");
  x = aplicarRespuesta(x, "pagos", undefined);
  assert.equal(x.checklist.pagos ?? "no", "no");
}
function nivelDe(x: Parameters<typeof aPropuesta>[0]) { return aPropuesta(x, "2026-10-21", uid).services[0].sourceId.replace("web-nivel-", ""); }

// Cola de guardado: un envío a la vez, el último dato gana, flush envía lo pendiente.
void (async () => {
  const enviados: number[] = [];
  let soltar: () => void = () => {};
  const cola = crearCola<number>(async (v) => { enviados.push(v); await new Promise<void>((r) => { soltar = r; }); return true; }, 10);
  const estados: string[] = [];
  cola.alCambiar((e) => estados.push(e));
  cola.programar(1); cola.programar(2);
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(enviados, [2]);
  cola.programar(3);
  await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(enviados, [2], "no envía mientras hay uno en curso");
  soltar(); await new Promise((r) => setTimeout(r, 30));
  assert.deepEqual(enviados, [2, 3], "al terminar envía el último pendiente");
  soltar(); await new Promise((r) => setTimeout(r, 5));
  assert.equal(estados.at(-1), "ok");
  const ok = await (async () => { cola.programar(4); const p = cola.vaciar(); soltar(); return p; })();
  assert.equal(ok, true); assert.deepEqual(enviados, [2, 3, 4]);
  const fallo = crearCola<number>(async () => false, 5);
  fallo.programar(1); assert.equal(await fallo.vaciar(), false);
  console.log("✓ presentación: revisión final");

  /* Web mixta, rangos de productos y fotos (Pedro 21-oct-2026). */
  assert.equal(estimarNivel({ tipo: "mixta" }).nivel, "intermedio");
  assert.equal(checklistInicial({ tipo: "mixta" }).carrito, "incluido");
  assert.equal(checklistInicial({ tipo: "mixta" }).nosotros, "incluido");
  assert.equal(estimarNivel({ productos: "1-50" }).nivel, "intermedio");
  assert.equal(estimarNivel({ productos: "51-100" }).nivel, "intermedio");
  assert.equal(estimarNivel({ productos: "101-200" }).nivel, "avanzado");
  assert.equal(estimarNivel({ variantes: true, fotos: "4-6" }).nivel, "basico");
  assert.equal(estimarNivel({ variantes: true, fotos: "7-10" }).nivel, "avanzado");
  assert.equal(checklistInicial({ productos: "1-50" }).catalogo, "incluido");
  assert.equal(checklistInicial({ productos: "ninguno" }).catalogo, undefined);
  const vieja = sesionSchema.parse({ respuestas: { productos: "mas-100", muchasImagenes: true, variantes: true } });
  assert.equal(vieja.respuestas.productos, "101-200");
  assert.equal(vieja.respuestas.fotos, "7-10");
  assert.equal("muchasImagenes" in vieja.respuestas, false);
  assert.equal(sesionSchema.parse({ respuestas: { productos: "hasta-100" } }).respuestas.productos, "51-100");
  console.log("✓ presentación: web mixta, productos y fotos");

  assert.equal(enlaceSeguro("apple.com"), "https://apple.com/");
  assert.equal(enlaceSeguro("http://x.pe/a"), "http://x.pe/a");
  assert.equal(enlaceSeguro("javascript:alert(1)"), null);
  assert.equal(enlaceSeguro("hola"), null);
  assert.equal(enlaceSeguro("www.a b.com"), null);
  const conRefs = sesionSchema.parse({ cliente: { empresa: "X" }, referencias: [{ url: "apple.com", motivo: "limpia" }, { url: "", motivo: "" }] });
  assert.match(aPropuesta(conRefs, "2026-10-21", () => "id").objective, /Webs de referencia:\n• https:\/\/apple\.com\/ — limpia/);
  assert.equal(sesionSchema.parse({}).referencias.length, 0);
  console.log("✓ presentación: webs de referencia");

  const conPlazo = aplicarRespuesta(sesionSchema.parse({ cliente: { empresa: "X" } }), "plazo", "1-mes");
  assert.equal(conPlazo.respuestas.plazo, "1-mes");
  assert.equal(estimarNivel(conPlazo.respuestas).nivel, "basico");
  assert.match(aPropuesta(conPlazo, "2026-10-21", () => "id").objective, /Plazo deseado: De aquí a un mes/);
  console.log("✓ presentación: plazo estandarizado");

  const ck = checklistInicial({ tipo: "tienda", productos: "101-200", variantes: true });
  assert.equal(ck.reclamaciones, "incluido"); assert.equal(ck.buscador, "incluido"); assert.equal(ck.variantesCheck, "incluido"); assert.equal(ck.legales, "incluido");
  assert.equal(new Set(CHECKLIST.map((c) => c.id)).size, CHECKLIST.length);
  const conMay = sesionSchema.parse({ checklist: { mayoristas: "incluido" } });
  assert.equal(estimarNivel(respuestasEfectivas(conMay)).nivel, "avanzado");
  const conExtras = sesionSchema.parse({ cliente: { empresa: "X" }, extras: [{ texto: "Cotizador de fletes", estado: "incluido" }, { texto: "Intranet", estado: "opcional" }, { texto: "", estado: "opcional" }] });
  const pe = aPropuesta(conExtras, "2026-10-21", () => "id");
  assert.match(pe.services[0].scope, /Cotizador de fletes/);
  assert.ok(pe.services.some((x) => x.name === "Intranet" && x.optional));
  assert.equal(pe.services.filter((x) => x.optional).length, 1);
  console.log("✓ presentación: checklist ampliado y extras");
})().catch((e) => { console.error(e); process.exit(1); });
