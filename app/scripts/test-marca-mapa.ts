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
assert.equal(mapaSchema.safeParse({ ramas: { propuesta: { resumen: "x".repeat(701) } } }).success, false);
assert.equal(mapaSchema.safeParse({ maletas: { problema: { puntos: Array(13).fill("a") } } }).success, false);
// Arquitectura: submarcas con su propio mapa y bloques desglosables.
const a = leerMapa({ submarcas: [{ id: "little-joe", nombre: "Little Joe", concepto: "Aroma que se ve.", maletas: { unica: { resumen: "Se ve" } } }],
  bloques: [{ id: "guardrails", titulo: "Qué no debe liderar", icono: "alerta", items: ["Duración"] }, { id: "tabla", titulo: "Comparativo", tabla: { columnas: ["A", "B"], filas: [["1", "2"]] } }] });
assert.equal(a.submarcas[0].maletas.unica.resumen, "Se ve");
assert.deepEqual(a.submarcas[0].maletas.problema, { resumen: "", puntos: [], propuesta: false });
assert.equal(a.bloques[1].tabla?.filas[0][1], "2");
assert.equal(mapaSchema.safeParse({ submarcas: [{ id: "Mal Id", nombre: "x" }] }).success, false);
// Mapas guardados antes de la ampliación se siguen leyendo igual.
assert.deepEqual(leerMapa({ frase: "Hola" }).submarcas, []);
console.log("✓ mapa de marca: modelo");
