import assert from 'node:assert/strict'
import test from 'node:test'
import { commercialWarnings, emptyProposal, excessAdFee, priceSuggestion, proposalSchema, readyIssues, serviceFromTemplate, totals } from './model'
import { proposalHtml } from './document'

const uid = () => crypto.randomUUID()
test('mezcla mensual y pago único sin sumar opcionales ni inversión del cliente', () => {
  const data = emptyProposal()
  data.services = [serviceFromTemplate('sm-integration',uid()), serviceFromTemplate('add-catalogo',uid()), { ...serviceFromTemplate('web-presencia',uid()), optional:true }]
  data.externalCosts = 'Inversión del cliente: S/ 9000 en Meta'
  assert.equal(totals(data).monthly.total,1500)
  assert.equal(totals(data).once.total,350)
})
test('IGV sobre el neto después del descuento y cantidades en céntimos', () => {
  const data = emptyProposal()
  data.services = [{ ...serviceFromTemplate('add-diseno-suelto',uid()), price:10.15, quantity:3 }]
  data.onceDiscount = 0.45; data.tax = 'mas_igv'
  assert.deepEqual(totals(data).once,{subtotal:30.45,discount:0.45,net:30,tax:5.4,total:35.4,invalidDiscount:false,pending:false,count:1})
})
test('un plan con IGV incluido no vuelve a cobrar el impuesto sobre el precio bruto', () => {
  const data = emptyProposal(); data.tax='mas_igv';data.services=[serviceFromTemplate('web-premium',uid())]
  assert.equal(totals(data).once.total,5790)
})
test('precios pendientes bloquean exportación; cero explícito es incluido', () => {
  const data = emptyProposal(); data.client.name='Cliente'; data.payment='Al inicio';
  data.services=[{...serviceFromTemplate('solo-paid',uid()),scope:'Gestión acordada'}]
  assert.ok(readyIssues(data).some(x=>x.includes('precio')))
  data.services[0].price=0
  assert.equal(readyIssues(data).length,0)
  data.monthlyDiscount=1
  assert.ok(readyIssues(data).some(x=>x.includes('descuento')))
})
test('la estimación de pauta se distingue del catálogo y el excedente se calcula una sola vez', () => {
  assert.equal(priceSuggestion('solo-paid')?.price,600)
  assert.match(priceSuggestion('solo-trafficker')!.explanation,/estimación editable/)
  assert.equal(excessAdFee(3000),0);assert.equal(excessAdFee(5000),200)
  assert.equal(excessAdFee(1500),0)
  const data=emptyProposal();data.services=[serviceFromTemplate('sm-integration',uid()),serviceFromTemplate('solo-paid',uid())]
  assert.ok(commercialWarnings(data).some(x=>x.includes('dos veces')))
})
test('datos inválidos, importes no finitos y demasiados servicios no se guardan', () => {
  const data=emptyProposal();data.services=[{...serviceFromTemplate('sm-integration',uid()),price:Infinity}]
  assert.equal(proposalSchema.safeParse(data).success,false)
  data.services=Array.from({length:31},()=>serviceFromTemplate('add-catalogo',uid()))
  assert.equal(proposalSchema.safeParse(data).success,false)
})
test('documento escapa contenido del cliente y conserva exclusiones, cantidades y cobros', () => {
  const data=emptyProposal();data.client.name='<img src=x onerror=alert(1)>';data.services=[serviceFromTemplate('sm-integration',uid()),{...serviceFromTemplate('add-diseno-suelto',uid()),quantity:3}]
  const html=proposalHtml(data,'COT-2026-0001')
  assert.ok(!html.includes('<img src=x'))
  assert.ok(html.includes('&lt;img src=x'))
  assert.ok(html.includes('Cantidad: 3'))
  assert.ok(html.includes('Inversión mensual'))
  assert.ok(html.includes('Inversión de pago único'))
  assert.ok(html.includes('Inversión ads'))
})
