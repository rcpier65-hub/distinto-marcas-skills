// Local UI fixture only. Never deployed and never writes bookings or sends invitations.
import { createServer } from 'node:http'
import { bookingHtml } from '../lib/reservas/widget.ts'
import { generateSlots, limaDate } from '../lib/reservas/slots.ts'
const config={enabled:true,duration_min:60,notice_hours:24,horizon_days:45,start_hour:9,end_hour:18,weekdays:[1,2,3,4,5],calendar_id:'primary'}
createServer(async(req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1:3023')
 if(url.pathname==='/api/reservas/disponibilidad'){
  const from=url.searchParams.get('desde')||limaDate()
  const days=Array.from({length:31},(_,i)=>{const date=new Date(Date.parse(from+'T12:00:00Z')+i*86400000).toISOString().slice(0,10);return {date,slots:generateSlots(date,config,[]).map(start=>({start,token:'fixture'}))}})
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({enabled:true,duration:60,horizon:45,days}));return
 }
 if(req.method==='POST'){
  let text='';for await(const c of req)text+=c;const b=JSON.parse(text)
  res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true,id:'DEMO — no se creó una reserva',start:b.start,end:new Date(Date.parse(b.start)+3600000).toISOString()}));return
 }
 res.setHeader('Content-Type','text/html');res.end(bookingHtml.replace('<body>','<body><div style="text-align:center;background:#fff2cf;padding:8px;font:12px Arial">DEMO LOCAL · Horarios de prueba · No envía invitaciones</div>'))
}).listen(3023,'127.0.0.1',()=>console.log('UI fixture http://127.0.0.1:3023'))
