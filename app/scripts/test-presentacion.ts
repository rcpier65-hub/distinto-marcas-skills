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
