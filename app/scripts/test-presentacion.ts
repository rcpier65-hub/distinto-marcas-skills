/* Presentación de Desarrollo web (Pedro 21-oct-2026). npx tsx scripts/test-presentacion.ts */
import assert from "node:assert/strict";
import { estimarNivel, NIVELES } from "../lib/presentacion/niveles";
import { PLANES } from "../lib/planes/catalogo";

// Niveles y catálogo.
assert.equal(estimarNivel({}).nivel, "basico");
const tienda = estimarNivel({ tipo: "tienda" });
assert.equal(tienda.nivel, "intermedio");
assert.ok(tienda.motivos.some((m) => /carrito/i.test(m)));
assert.equal(estimarNivel({ productos: "mas-100" }).nivel, "avanzado");
assert.equal(estimarNivel({ tipo: "presentacion", integraciones: true }).nivel, "avanzado");
assert.equal(estimarNivel({ tipo: "presentacion", idiomas: true }).nivel, "intermedio");
assert.equal(estimarNivel({ tipo: "landing", paginas: "hasta-5" }).nivel, "basico");
assert.equal(estimarNivel({ tipo: "presentacion", paginas: "mas-10" }).nivel, "intermedio");
for (const r of [{ tipo: "tienda" as const }, { productos: "mas-100" as const }, { idiomas: true }]) assert.ok(estimarNivel(r).motivos.length > 0);
assert.equal(NIVELES.basico.desde, 1800);
assert.deepEqual([NIVELES.intermedio.desde, NIVELES.intermedio.hasta], [3000, 3500]);
assert.deepEqual([NIVELES.avanzado.desde, NIVELES.avanzado.hasta], [5000, 8000]);
assert.match(NIVELES.avanzado.plazo, /30.*45/);
for (const n of Object.values(NIVELES)) assert.ok(PLANES.some((p) => p.id === n.catalogoId && p.categoria === "web"), n.catalogoId);
console.log("✓ presentación: niveles");

// Checklist, sesión y propuesta.
import { aPropuesta, checklistInicial, CHECKLIST, FAQ, PREGUNTAS, sesionSchema, sesionVacia } from "../lib/presentacion/web";
import { proposalSchema } from "../lib/propuestas/model";
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
s.notas = "Quiere vender herramientas online.";
const p = aPropuesta(s, "2026-10-21", uid);
const base = p.services.find((x) => !x.optional)!;
assert.equal(base.sourceId, "web-nivel-intermedio");
assert.equal(base.price, null);
assert.equal(base.frequency, "unico");
assert.match(base.scope, /Carrito/);
assert.ok(p.services.some((x) => x.optional && /Blog/.test(x.name) && x.price === null));
assert.ok(!p.services.some((x) => /idioma/i.test(x.name)));
assert.match(p.objective, /vender herramientas/);
assert.equal(p.client.name, "Ferretería Sol");
assert.equal(p.client.email, "ana@sol.pe");
proposalSchema.parse(p);
assert.equal(checklistInicial({ tipo: "tienda" }).carrito, "incluido");
assert.equal(sesionSchema.safeParse({ ...s, notas: "x".repeat(4001) }).success, false);
console.log("✓ presentación: checklist y propuesta");
