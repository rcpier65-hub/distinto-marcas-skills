/* npx tsx scripts/test-marca-mapa.ts */
import assert from "node:assert/strict";
import { leerMapa, mapaVacio, MALETAS, mapaSchema, nodoVacio } from "../lib/marca-mapa/model";

const v = mapaVacio();
assert.equal(Object.keys(v.maletas).length, 7);
assert.ok(MALETAS.every((m) => nodoVacio(v.maletas[m.id])));
assert.equal(v.estado, "borrador");
// Datos parciales o viejos no rompen la lectura.
const p = leerMapa({ frase: "Hola", maletas: { problema: { resumen: "Duran poco" } } });
assert.equal(p.frase, "Hola");
assert.equal(p.maletas.problema.resumen, "Duran poco");
assert.deepEqual(p.maletas.garantia, { resumen: "", puntos: [], propuesta: false });
assert.deepEqual(leerMapa("basura"), mapaVacio());
// Límites.
assert.equal(mapaSchema.safeParse({ ramas: { propuesta: { resumen: "x".repeat(401) } } }).success, false);
assert.equal(mapaSchema.safeParse({ maletas: { problema: { puntos: Array(13).fill("a") } } }).success, false);
console.log("✓ mapa de marca: modelo");
