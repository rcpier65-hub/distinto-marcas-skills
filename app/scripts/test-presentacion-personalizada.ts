import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { aPropuesta, sesionSchema, sesionVacia } from "../lib/presentacion/web";
import { crearPersonalizacion, personalizacionSchema, propuestaPersonalizada, puedeActualizarPropuesta } from "../lib/presentacion/personalizacion";
import { proposalSchema, totals } from "../lib/propuestas/model";
import { proposalHtml } from "../lib/propuestas/document";

const sesion = sesionVacia({ empresa: "QA personalizada", nombre: "Prueba", rubro: "Servicios", contacto: "" });
sesion.servicios = ["social"];
sesion.social.plan = "sm-integration-pro";
sesion.notas = "NOTA PRIVADA QUE NO VA EN EL PDF";
const base = aPropuesta(sesion, "2026-11-03", randomUUID);
const original = JSON.stringify(base);
const p = crearPersonalizacion(base, 3, randomUUID);
const id = p.documento.services[0].id;
p.documento.services[0].name = "Plan a medida";
p.documento.services[0].price = 2500;
p.documento.payment = "50% al inicio y 50% el día 26.";
p.documento.date = "2026-11-10";
p.alcances[id] = [
  { id: randomUUID(), texto: "Historias", cantidad: 5, periodo: "semana", incluido: true },
  { id: randomUUID(), texto: "Carruseles", cantidad: 3, periodo: "mes", incluido: true },
  { id: randomUUID(), texto: "Reunión de planning", cantidad: 2, periodo: "mes", incluido: true },
  { id: randomUUID(), texto: "Reunión de reportes", cantidad: 1, periodo: "mes", incluido: true },
  { id: randomUUID(), texto: "Revisión de guiones", cantidad: 1, periodo: "semana", incluido: true },
  { id: randomUUID(), texto: "EXCLUIDO", cantidad: 7, periodo: "mes", incluido: false },
  { id: randomUUID(), texto: "", cantidad: 1, periodo: "mes", incluido: true },
];
sesion.personalizacion = p;
const recargada = sesionSchema.parse(JSON.parse(JSON.stringify(sesion)));
const doc = aPropuesta(recargada, "2026-12-01", randomUUID);
proposalSchema.parse(doc);
assert.equal(doc.date, "2026-11-10");
assert.equal(doc.services[0].scope, "Historias: 5 por semana\nCarruseles: 3 por mes\nReunión de planning: 2 por mes\nReunión de reportes: 1 por mes\nRevisión de guiones: 1 por semana");
assert.equal(totals(doc).monthly.total, 2500);
assert.equal(doc.payment, p.documento.payment);
assert.equal(JSON.stringify(base), original, "La personalización no modifica el plan original");
recargada.social.plan = "sm-contenido";
assert.deepEqual(aPropuesta(recargada, "2027-01-01", randomUUID), doc, "Cambiar el plan no descarta lo personalizado");
const html = proposalHtml(doc, "QA");
assert.ok(html.includes("Historias: 5 por semana"));
assert.ok(html.includes("Reunión de planning: 2 por mes"));
assert.ok(!html.includes("NOTA PRIVADA"));
assert.ok(!html.includes("EXCLUIDO"));
p.alcances[id][0].cantidad = 8;
assert.ok(propuestaPersonalizada(p).services[0].scope.includes("Historias: 8 por semana"));
p.alcances[id][0].cantidad = -1;
assert.equal(personalizacionSchema.safeParse(p).success, false);
assert.equal(puedeActualizarPropuesta(3, 3, null), true);
assert.equal(puedeActualizarPropuesta(4, 3, null), false);
assert.equal(puedeActualizarPropuesta(4, 3, 4), true);
assert.equal(puedeActualizarPropuesta(5, 3, 4), false);
assert.deepEqual(aPropuesta(sesionSchema.parse({ ...sesion, personalizacion: undefined }), "2026-11-03", () => "00000000-0000-4000-8000-000000000001").services.map(s => s.price), base.services.map(s => s.price));
console.log("PASS cantidades y frecuencias, exclusiones, guardar/recargar, totales, HTML, notas privadas y protección de revisiones");
