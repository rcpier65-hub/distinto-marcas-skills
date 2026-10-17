import assert from 'node:assert/strict'
import {metricNumber,normalizeReport} from '../lib/meta-mcp/report-model.ts'
const account={id:'1206507377876940',name:'TEAM LITTLE JOE',businessId:'1722931125774246',businessName:'Little Joe',currency:'USD',enabled:true,queryable:true,reason:null}
// Real Meta response shapes: currency objects, decimal comma percentages,
// numeric strings and a JSON-encoded account array.
const raw=JSON.stringify([{id:account.id,name:account.name,timezone_name:'America/Lima',amount_spent:{value:'899.62',unit:'USD'},impressions:'324668',reach:'148271',clicks:'11523',ctr:'3,55%',cpc:{value:'0.08',unit:'USD'},omni_purchase:'34',omni_purchase_values:{value:'792.84',unit:'USD'},website_purchase_roas:'0.881305'}])
const report=normalizeReport(raw,account,'this_month')
assert.equal(report.metrics.amount_spent,899.62);assert.equal(report.metrics.ctr,3.55);assert.equal(report.metrics.omni_purchase,34);assert.equal(report.metrics.cpm,null)
for(const v of [null,undefined,'','—','N/A',Infinity,'1,234.56',{},'NaN'])assert.equal(metricNumber(v),null)
assert.equal(metricNumber('0'),0);assert.equal(metricNumber({value:'0',unit:'USD'}),0)
assert.throws(()=>normalizeReport('[{"id":"other"}]',account,'this_month'))
assert.throws(()=>normalizeReport('[]',account,'this_month'))
assert.throws(()=>normalizeReport(JSON.stringify([{id:account.id,amount_spent:{value:'12',unit:'PEN'}}]),account,'this_month'))
assert.throws(()=>normalizeReport(JSON.stringify([{id:account.id},{id:'another'}]),account,'this_month'))
console.log('PASS real Meta shapes, missing values, percent conversion, account isolation and currency consistency')
