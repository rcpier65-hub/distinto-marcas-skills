import assert from 'node:assert/strict';
import { registerHooks } from 'node:module';
// Node executes TypeScript directly; Next resolves extensionless imports itself.
registerHooks({resolve(specifier, context, next) {
  if (specifier === './model' && context.parentURL?.endsWith('/finanzas/dashboard.ts'))
    return next('./model.ts', context);
  return next(specifier, context);
}});
const {financeDashboard, withoutRecordedTax} = await import('../lib/finanzas/dashboard.ts');
const {remaining} = await import('../lib/finanzas/model.ts');
let id = 0;
const charge = (c) => ({id: String(++id), rule_id: null, title: 'Prueba', kind: 'income', scope: 'agency', owner: 'agency', currency: 'PEN', base: 10000, tax: 0, prior_credit: 0, settled: 0, due: '2026-11-06', state: 'confirmed', note: '', member_id: null, brand_id: null, ...c});
const move = (m) => ({id: String(++id), title: 'Prueba', kind: 'income', scope: 'agency', owner: 'agency', currency: 'PEN', amount: 10000, credit: 0, credit_kind: 'none', account_id: 'bank', destination_id: null, charge_id: null, date: '2026-11-02', void_reason: null, created_at: '', ...m});
const empty = () => ({ownerTarget: null, ownerWeeklyTarget: 150000, today: '2026-11-02', month: '2026-11', charges: [], rules: [], accounts: [], movements: [], receipts: [], notes: [], members: [], brands: []});
{
  const data = empty();
  data.charges = [charge({base: 280000,tax:50400}),charge({base:180000,prior_credit:72000,due:'2026-11-15'}),charge({base:75000,due:'2026-11-15'}),charge({base:100000,due:'2026-10-18'}),charge({base:240000,state:'review'}),charge({state:'void'}),charge({settled:10000}),charge({currency:'USD'}),charge({scope:'personal'}),charge({due:'2026-12-06'})];
  const d = financeDashboard(data,'agency','PEN','2026-11');
  assert.equal(d.confirmedTotal,513400); assert.equal(d.olderTotal,100000); assert.equal(d.reviewTotal,240000);
  assert.equal(d.confirmed.length,3); assert.equal(d.review.length,1); assert.equal(d.older.length,1);
  assert.equal(d.expectedReceipts,703000); // 2,800 + 1,080 + 750 + 2,400; no IGV.
  assert.equal(d.withdrawalLow,600000); assert.equal(d.withdrawalHigh,750000);
  assert.equal(financeDashboard(data,'agency','PEN','2027-02').withdrawalHigh,600000);
  assert.equal(financeDashboard(data,'agency','USD','2026-11').withdrawalHigh,0);
  assert.equal(financeDashboard(data,'personal','PEN','2026-11').withdrawalHigh,0);
}
{
  const data=empty(), c=charge({base:10000,tax:1800,settled:5900}), cost=charge({kind:'expense',base:10000,settled:2500});
  data.charges=[c,cost];
  data.movements=[move({amount:5900,charge_id:c.id}),move({kind:'expense',amount:2500,charge_id:cost.id}),move({kind:'expense',amount:800,date:'2026-10-31'}),move({kind:'expense',amount:500,void_reason:'anulado'}),move({kind:'expense',amount:300,currency:'USD'}),move({kind:'expense',amount:200,scope:'personal'})];
  const d=financeDashboard(data,'agency','PEN','2026-11');
  assert.equal(d.expectedReceipts,10000); assert.equal(d.paid,2500); assert.equal(d.pendingCostsTotal,7500); assert.equal(d.expectedCosts,10000);
  assert.equal(withoutRecordedTax(5900,c),5000); assert.equal(withoutRecordedTax(5000),5000);
  assert.equal(d.movements.length,2);
  c.prior_credit=1000; assert.equal(d.confirmedTotal,5900); // Snapshot is not mutated by later data changes.
  assert.equal(remaining(c),4900);
}
{
  const data=empty();
  data.accounts=[{id:'bank',name:'Agencia',usage:'agency',owner:'nayeli',currency:'PEN',opening:0,opening_date:'2026-10-30',movements:92500},{id:'personal',name:'Personal',usage:'personal',owner:'nayeli',currency:'PEN',opening:100,opening_date:'2026-10-30',movements:9500},{id:'savings',name:'Ahorro',usage:'personal',owner:'pedro',currency:'PEN',opening:1000,opening_date:'2026-10-30',movements:500},{id:'unknown',usage:'agency',currency:'PEN',opening:null,opening_date:null,movements:0}];
  data.movements=[move({kind:'transfer',amount:10000,destination_id:'personal'}),move({kind:'transfer',account_id:'personal',destination_id:'savings',scope:'personal',amount:500}),move({kind:'expense',scope:'personal',account_id:'personal',amount:100}),move({kind:'income',scope:'personal',account_id:'personal',amount:200})];
  const a=financeDashboard(data,'agency','PEN','2026-11'),p=financeDashboard(data,'personal','PEN','2026-11');
  assert.equal(a.balances.total,92500); assert.equal(a.balances.pending,1); assert.equal(a.movements.length,1); assert.equal(a.paid,0); assert.equal(a.expectedCosts,0);
  assert.equal(p.balances.total,11100); assert.equal(p.movements.length,4); assert.equal(p.entriesTotal,10200); assert.equal(p.paid,100); assert.equal(p.transfersIn.length,1); assert.equal(p.received,200);
  assert.equal(a.withdrawalHigh,750000); // Transfer is not deducted a second time.
}
{
  const data=empty();
  data.monthlyCosts=[{id:'capcut',title:'CapCut',scope:'agency',currency:'PEN',amount:5990,starts_month:'2026-11'},{id:'chatgpt',title:'ChatGPT',scope:'agency',currency:'PEN',amount:39490,starts_month:'2026-11'},{id:'workspace',title:'Workspace',scope:'agency',currency:'USD',amount:1680,starts_month:'2026-11'}];
  const d=financeDashboard(data,'agency','PEN','2026-11');
  assert.equal(d.undatedCostsTotal,45480); assert.equal(d.expectedCosts,45480); assert.equal(d.paid,0); assert.equal(d.pendingCostsTotal,0);
  assert.equal(financeDashboard(data,'agency','USD','2026-11').undatedCostsTotal,1680);
  assert.equal(financeDashboard(data,'personal','PEN','2026-11').undatedCostsTotal,0);
  assert.equal(financeDashboard(data,'agency','PEN','2026-10').undatedCostsTotal,0);
}
console.log('PASS periodos, abonos, IGV registrado, monedas, gastos, transferencias, saldos, costos sin fecha y retiros semanales');
