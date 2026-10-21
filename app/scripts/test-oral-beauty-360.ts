/* Reporte 360 Oral Beauty. npx tsx scripts/test-oral-beauty-360.ts */
import assert from "node:assert/strict";
import { respuestaClinica, combinar, totales, type GastoAnuncio } from "../lib/oral-beauty/modelo360";

const fila = { id_empresa: 6 as const, sede: "LIMA" as const, ad_id: "123", titulo: "Prótesis", url: "https://x.pe", escribieron: 100, personas: 90, ficha: 40, cita: 10, asistio: 5, presupuesto: 4, inicio: 2, termino: 1, cobrado_pen: 3000 };
const ok = respuestaClinica.parse({ mes: "2026-10", generado_at: "2026-10-21T10:00:00Z", gasto_guardado: 2, filas: [fila] });
assert.equal(ok.filas.length, 1);
// Esquema estricto: sin campos extra (no viajan datos personales), sin negativos.
assert.equal(respuestaClinica.safeParse({ ...ok, filas: [{ ...fila, telefono: "999" }] }).success, false);
assert.equal(respuestaClinica.safeParse({ ...ok, filas: [{ ...fila, cita: -1 }] }).success, false);
assert.equal(respuestaClinica.safeParse({ ...ok, extra: 1 }).success, false);
assert.equal(respuestaClinica.safeParse({ ...ok, filas: Array(2001).fill(fila) }).success, false);

const gasto: GastoAnuncio[] = [
  { sede: "LIMA", id_empresa: 6, ad_id: "123", ad_name: "LIM_PROT_VID", campaign_id: "c1", campaign_name: "LIM_PROT_MSJ", adset_name: "A", gasto: 100, moneda: "USD", gasto_pen: 375, impresiones: 1000, clics: 20, resultados: 95 },
  { sede: "RIOJA", id_empresa: 20, ad_id: "999", ad_name: "RIO_BRK", campaign_id: "c2", campaign_name: "RIO_BRK_MSJ", adset_name: "B", gasto: 50, moneda: "PEN", gasto_pen: 50, impresiones: 500, clics: 5, resultados: 0 },
];
const filas = combinar(gasto, [fila, { ...fila, ad_id: "777", titulo: "Anuncio viejo", escribieron: 30 }]);
const a = filas.find((f) => f.ad_id === "123")!;
assert.equal(a.costoChat, 375 / 100);
assert.equal(a.costoCita, 37.5);
assert.equal(a.costoAsistencia, 75);
assert.equal(a.costoInicio, 187.5);
assert.equal(a.retorno, 3000 / 375);
assert.equal(a.campana, "LIM_PROT_MSJ");
assert.equal(filas.find((f) => f.ad_id === "999")!.alerta, "gasto-sin-chats");
assert.equal(filas.find((f) => f.ad_id === "777")!.alerta, "chats-sin-gasto");
assert.equal(filas.find((f) => f.ad_id === "777")!.nombre, "Anuncio viejo");
const t = totales(filas.filter((f) => f.sede === "LIMA"));
assert.equal(t.gasto_pen, 375);
assert.equal(t.escribieron, 130);
assert.equal(totales([]).costoChat, null);
console.log("✓ reporte 360: esquema, unión por anuncio y costos");
