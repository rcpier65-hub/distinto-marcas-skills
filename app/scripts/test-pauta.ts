/* npx tsx scripts/test-pauta.ts */
import assert from "node:assert/strict";
import { alertas, configSchema, contarResultado, metricas, ritmo, type Anuncio } from "../lib/pauta/model";

// Resultado: primera acción de la lista, sin sumar variantes duplicadas.
const acciones = [{ action_type: "omni_purchase", value: "5" }, { action_type: "purchase", value: "5" }, { action_type: "onsite_conversion.messaging_conversation_started_7d", value: "40" }];
assert.equal(contarResultado(acciones, "compras"), 5);
assert.equal(contarResultado(acciones, "mensajes"), 40);
assert.equal(contarResultado(acciones, "leads"), 0);
assert.equal(contarResultado(undefined, "leads"), null);

const m = metricas({ spend: "200", impressions: "10000", frequency: "1.8", actions: acciones, cpm: "20" }, "mensajes");
assert.equal(m.costoResultado, 5);
assert.equal(metricas({ spend: "0", actions: [] }, "compras").costoResultado, null);

// Ritmo: día 15 de un mes de 30 días, 14 días completos con 500 de 1000 → proyecta ~1071.
const r = ritmo(500, 1000, "2026-11-15")!;
assert.ok(Math.abs(r.proyeccion - 500 / 14 * 30) < 1e-9);
assert.equal(r.diasRestantes, 15);
assert.equal(ritmo(500, null, "2026-11-15"), null);

// Alertas.
const base = (o: Partial<Anuncio>): Anuncio => ({ id: "1", nombre: "A", estado: "ACTIVE", campana: "C", conjunto: "S", objetivo: null, presupuestoDiario: null, miniatura: null, texto: null, titulo: null, motivoRechazo: null, mes: metricas({ frequency: "1.2" }, "mensajes"), ...o });
const al = alertas({
  anuncios: [base({ estado: "DISAPPROVED" }), base({ id: "2", nombre: "Cansado", mes: metricas({ frequency: "4.1" }, "mensajes") })],
  actual: metricas({ spend: "300", actions: [{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "30" }] }, "mensajes"),
  anterior: metricas({ spend: "300", actions: [{ action_type: "onsite_conversion.messaging_conversation_started_7d", value: "60" }] }, "mensajes"),
  ritmo: ritmo(900, 1000, "2026-11-15"), metaCosto: 8, estadoCuenta: 1, resultado: "mensajes",
});
const textos = al.map((a) => a.texto).join(" | ");
assert.match(textos, /1 anuncio rechazado/);
assert.match(textos, /Frecuencia alta.*Cansado/);
assert.match(textos, /más que el presupuesto/);
assert.match(textos, /costo por mensaje subió 100%/);
assert.match(textos, /por encima de la meta/);
assert.doesNotMatch(textos, /No hay anuncios activos/);
assert.match(alertas({ anuncios: [], actual: metricas(null, "clics"), anterior: metricas(null, "clics"), ritmo: null, metaCosto: null, estadoCuenta: 2, resultado: "clics" }).map((a) => a.texto).join(), /no está activa/);

// Configuración.
assert.deepEqual(configSchema.parse({}), { presupuestoMensual: null, resultado: "mensajes", metaCosto: null });
assert.equal(configSchema.safeParse({ presupuestoMensual: -5 }).success, false);
console.log("✓ pauta: resultados, ritmo, alertas y configuración");
