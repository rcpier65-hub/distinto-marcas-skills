import test from 'node:test'
import assert from 'node:assert/strict'
import { writingField, writingSchema, validateRewrite } from './writing'
import { whatsappPhone, deliveryLinks, deliveryBody, documentKey, defaultDelivery } from './delivery'
import { emptyProposal, proposalSchema } from './model'

test('IA conserva cifras y referencias, rechaza importes cambiados y texto fuera de límite', () => {
  assert.equal(validateRewrite('10 videos por S/ 1,500.00, 2 rondas', 'Producción de 10 videos por S/ 1,500.00, con 2 rondas de ajustes.', 'Qué incluye / alcance').includes('1,500.00'), true)
  assert.throws(() => validateRewrite('10 videos y 50% de adelanto', '20 videos y 50% de adelanto', 'Forma de pago'))
  assert.throws(() => validateRewrite('Visitar https://example.com', 'Visitar https://other.test', 'Resumen del servicio'))
  assert.throws(() => validateRewrite('Contenido', 'x'.repeat(201), 'Rubro'))
  assert.throws(() => validateRewrite('Contenido', '', 'Rubro'))
})
test('IA aplica solo a textos comerciales y valida solicitudes vacías o campos falsos', () => {
  assert.equal(writingField('Título de la propuesta *'), 'Título de la propuesta')
  for (const label of ['Correo', 'RUC / documento', 'Teléfono', 'Persona de contacto', 'Empresa / nombre del cliente *']) assert.equal(writingField(label), undefined)
  assert.equal(writingSchema.safeParse({field:'Rubro',text:'  '}).success, false)
  assert.equal(writingSchema.safeParse({field:'price',text:'Cobrar 500'}).success, false)
})
test('WhatsApp normaliza Perú y códigos internacionales sin inventar el país extranjero', () => {
  assert.equal(whatsappPhone('987 654 321'), '51987654321')
  assert.equal(whatsappPhone('+51 (987) 654-321'), '51987654321')
  assert.equal(whatsappPhone('00 34 612 345 678'), '34612345678')
  for (const value of ['', '123', 'abc987654321', '987654321?text=hack', '+00000', '+1234567890123456']) assert.equal(whatsappPhone(value), null)
})
test('mensaje, destinatario y asunto quedan codificados sin inyectar otros destinatarios', () => {
  const text=deliveryBody('Hola, María & José\nPrecio S/ 1,500', 'https://example.com/propuesta?token=x&download=1')
  const links=deliveryLinks('987654321','cliente@example.com','Propuesta & revisión',text)
  const wa=new URL(links.whatsapp!)
  assert.equal(wa.pathname,'/51987654321'); assert.equal(wa.searchParams.get('text'),text)
  const mail=new URL(links.email!)
  assert.equal(mail.searchParams.get('subject'),'Propuesta & revisión'); assert.equal(mail.searchParams.get('body'),text)
  assert.equal(deliveryLinks('123','a@example.com?bcc=otro@example.com','asunto',text).email,null)
  assert.equal(deliveryLinks('123','a@example.com\r\nBcc:other@example.com','asunto',text).email,null)
})
test('cambiar un mensaje no invalida el PDF, cambiar alcance o precio sí', () => {
  const data=emptyProposal(); const key=documentKey(data)
  data.delivery.message='Hola';data.status='lista'
  assert.equal(documentKey(data),key)
  data.objective='Nuevo alcance'
  assert.notEqual(documentKey(data),key)
})
test('propuestas anteriores son compatibles y el mensaje inicial usa el contacto sin número ficticio', () => {
  const data=emptyProposal();data.client.name='Marca de ejemplo';data.client.contact='Ana'
  const defaults=defaultDelivery({numero:0,data})
  assert.match(defaults.message,/Hola, Ana/);assert.doesNotMatch(defaults.subject,/0000/)
  const { delivery: _delivery, ...old }=data;void _delivery
  assert.deepEqual(proposalSchema.parse(old).delivery,{subject:'',message:''})
})
