"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { CalendarClock, Pencil, Plus, Repeat2, Wallet } from "lucide-react";
import { amount, ownerNames, remaining, type Charge, type Debt, type FinanceData } from "@/lib/finanzas/model";
import styles from "./finance.module.css";
import debtStyles from "./debts.module.css";

const dateLabel = (date: string) => new Intl.DateTimeFormat("es-PE",{day:"numeric",month:"long",year:"numeric",timeZone:"UTC"}).format(new Date(date+"T12:00:00Z"));
export function DebtsPanel({data,currency,onSave,onPayment}:{data:FinanceData;currency:string;onSave:(p:Record<string,unknown>)=>Promise<void>;onPayment:(c:Charge)=>void}) {
  const [edit,setEdit] = useState<{debt?:Debt;frequency:"once"|"monthly"}|null>(null);
  const debts = (data.debts ?? []).filter((d)=>d.currency===currency);
  const total = debts.filter((d)=>d.total!==null).reduce((n,d)=>n+Math.max(0,d.total!-d.settled),0);
  return <section className={debtStyles.section} aria-label="Deudas personales">
    <div className={styles.sectionHead}>
      <div><h2><Wallet size={21}/> Deudas y pagos personales</h2><p>Registra abonos, fechas y notas. Los pagos recurrentes crean pendientes; tú confirmas cuándo se pagan.</p></div>
      <div className={debtStyles.actions}>
        <button onClick={()=>setEdit({frequency:"once"})}><Plus size={16}/> Agregar deuda</button>
        <button className={styles.primary} onClick={()=>setEdit({frequency:"monthly"})}><Repeat2 size={16}/> Pago recurrente</button>
      </div>
    </div>
    <div className={debtStyles.summary}><span>Saldo de deudas con total definido</span><strong>{amount(total,currency)}</strong><small>Los servicios mensuales sin total se muestran aparte. El crédito total no se suma otra vez como gasto mensual.</small></div>
    <div className={debtStyles.grid}>
      {debts.map((d)=>{
        const charges=(data.debtCharges ?? []).filter((c)=>c.debt_id===d.id && c.state!=="void");
        const pending=charges.filter((c)=>remaining(c)>0);
        const next=pending[0];
        const missing = !d.first_due || (d.frequency==="once" ? d.total===null : d.installment===null);
        return <article className={debtStyles.card} key={d.id}>
          <div className={debtStyles.cardHead}><span className={styles.badge}>{d.frequency==="once" ? "Pago único" : "Mensual"}{!d.active ? " · Pausado":""}</span><button aria-label={`Editar ${d.title}`} onClick={()=>setEdit({debt:d,frequency:d.frequency})}><Pencil size={16}/></button></div>
          <h3>{d.title}</h3><small>{ownerNames[d.owner]}</small>
          <div className={debtStyles.mainAmount}>
            <span>{d.frequency==="once" ? "Saldo por pagar" : "Cuota mensual"}{d.estimated ? " · aproximado":""}</span>
            <strong>{d.frequency==="once" ? d.total===null ? "Por completar" : amount(Math.max(0,d.total-d.settled),d.currency) : d.installment===null ? "Por completar" : amount(d.installment,d.currency)}</strong>
          </div>
          {d.frequency==="monthly" && d.total!==null && <p>Crédito total: <b>{amount(d.total,d.currency)}</b><br/>Saldo registrado: <b>{amount(Math.max(0,d.total-d.settled),d.currency)}</b></p>}
          <div className={debtStyles.due}><CalendarClock size={17}/><span>{next ? `Vence ${dateLabel(next.due)}` : !d.first_due ? "Fecha de pago por completar" : d.frequency==="monthly" ? `Cada ${Number(d.first_due.slice(8))} del mes · desde ${dateLabel(d.first_due)}` : `Vencimiento: ${dateLabel(d.first_due)}`}</span></div>
          {missing && <small className={debtStyles.pending}>Completa {d.first_due ? "el importe" : (d.frequency==="monthly" ? d.installment : d.total)===null ? "importe y fecha" : "la fecha"} para programar el pago.</small>}
          {d.note && <p className={debtStyles.note}>{d.note}</p>}
          <div className={debtStyles.actions}>
            {next ? <button className={styles.primary} onClick={()=>onPayment(next)}>Registrar pago / abono</button> : missing ? <button onClick={()=>setEdit({debt:d,frequency:d.frequency})}>Completar datos</button> : <span className={styles.badge}>{d.total!==null && d.settled>=d.total ? "Saldado" : "Sin cuotas pendientes"}</span>}
            <button onClick={()=>setEdit({debt:d,frequency:d.frequency})}>Editar y añadir nota</button>
          </div>
          {charges.length>0 && <details className={debtStyles.history}><summary>Vencimientos y abonos · {charges.length}</summary>{charges.map((c)=><div key={c.id} className={styles.listRow}><div><b>{dateLabel(c.due)}</b><small>Pagado: {amount(c.settled,d.currency)} · Pendiente: {amount(remaining(c),d.currency)}</small></div>{remaining(c)>0 ? <button onClick={()=>onPayment(c)}>Abonar</button>:<span className={styles.badge}>Pagado</span>}</div>)}</details>}
        </article>;
      })}
    </div>
    {!debts.length && <p>No hay deudas en esta moneda. Agrega una deuda o un pago recurrente.</p>}
    {edit && <DebtForm key={edit.debt?.id || edit.frequency} debt={edit.debt} frequency={edit.frequency} currency={currency} onSave={onSave} onClose={()=>setEdit(null)}/>}
  </section>;
}

function DebtForm({debt:d,frequency:initialFrequency,currency,onSave,onClose}:{debt?:Debt;frequency:"once"|"monthly";currency:string;onSave:(p:Record<string,unknown>)=>Promise<void>;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null),attempt=useRef<{hash:string;id:string}|null>(null);
  const [frequency,setFrequency]=useState(initialFrequency),[busy,setBusy]=useState(false),[error,setError]=useState("");
  useEffect(()=>{dialog.current?.showModal();},[]);
  async function submit(e:FormEvent<HTMLFormElement>) {
    e.preventDefault();if(busy)return;setBusy(true);setError("");
    const f=new FormData(e.currentTarget),str=(k:string)=>String(f.get(k)||""),cent=(k:string)=>str(k).trim()==="" ? null : Math.round(Number(str(k))*100);
    const p={action:"debt",...(d?{id:d.id,revision:d.revision}:{}),data:{title:str("title"),owner:str("owner"),currency:str("currency"),frequency,total:cent("total"),installment:frequency==="monthly"?cent("installment"):null,first_due:str("first_due")||null,estimated:f.has("estimated"),active:f.has("active"),note:str("note")}};
    const hash=JSON.stringify(p);if(attempt.current?.hash!==hash)attempt.current={hash,id:crypto.randomUUID()};
    try{await onSave({...p,requestId:attempt.current.id});onClose();}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <dialog ref={dialog} className={`${styles.dialog} ${debtStyles.dialog}`} aria-label={d?"Editar deuda":"Nueva deuda o pago recurrente"} onCancel={(e)=>{e.preventDefault();if(!busy)onClose();}}>
    <form onSubmit={submit}>
      <div className={styles.sectionHead}><h2>{d?"Editar deuda":"Nueva deuda o pago recurrente"}</h2><button type="button" aria-label="Cerrar deuda" disabled={busy} onClick={onClose}>✕</button></div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      <label className={styles.field}>Concepto / a quién pagas<input name="title" required maxLength={300} defaultValue={d?.title} placeholder="Ej.: Renato · carro"/></label>
      <div className={styles.formGrid}>
        <label className={styles.field}>De quién es<select name="owner" defaultValue={d?.owner||"pedro"}><option value="pedro">Pedro Reyes</option><option value="nayeli">Nayeli Sotelo</option></select></label>
        <label className={styles.field}>Moneda<select name="currency" defaultValue={d?.currency||currency}><option value="PEN">Soles</option><option value="USD">Dólares</option></select></label>
        <label className={styles.field}>Tipo de pago<select value={frequency} onChange={(e)=>setFrequency(e.target.value as "once"|"monthly")}><option value="once">Deuda de pago único</option><option value="monthly">Pago recurrente mensual</option></select></label>
        <label className={styles.field}>{frequency==="once" ? "Total de la deuda" : "Total del crédito (opcional)"}<input type="number" name="total" min="0.01" max="1000000" step="0.01" defaultValue={d?.total===null?"":d?.total===undefined?"":d.total/100} placeholder="Por completar"/></label>
        {frequency==="monthly" && <label className={styles.field}>Cuota mensual (opcional)<input type="number" name="installment" min="0.01" max="1000000" step="0.01" defaultValue={d?.installment==null?"":d.installment/100} placeholder="Completar cuando sepas el monto"/></label>}
        <label className={styles.field}>{frequency==="once" ? "Fecha límite de pago (opcional)" : "Primera fecha de pago (opcional)"}<input type="date" name="first_due" min="2000-01-01" max="2099-12-31" defaultValue={d?.first_due||""}/></label>
      </div>
      <div className={debtStyles.checks}><label><input type="checkbox" name="estimated" defaultChecked={d?.estimated??false}/> El importe es aproximado, por confirmar</label><label><input type="checkbox" name="active" defaultChecked={d?.active??true}/> Programación activa</label></div>
      <label className={styles.field}>Nota<textarea name="note" maxLength={2000} defaultValue={d?.note||""} placeholder="Acuerdo, número de cuota o algo que quieras recordar"/></label>
      <p>{frequency==="monthly" ? "Se repite el día de la primera fecha; si el mes no tiene ese día, vence el último día. Sin monto o fecha queda pendiente de completar. El total del crédito limita las cuotas registradas; no calcula intereses." : "Puedes guardar la deuda y luego registrar uno o varios abonos desde tu cuenta."} Los abonos se conservan. Pausar detiene nuevas cuotas, no elimina las existentes.</p>
      {d && <p>Al editar, las cuotas anteriores y las que tienen abonos conservan su historial. Los cambios de monto y día se aplican a las cuotas sin pagar de este mes y próximas.</p>}
      <div className={`${styles.dialogFooter} ${debtStyles.sticky}`}><button type="button" onClick={onClose} disabled={busy}>Cancelar</button><button className={styles.primary} disabled={busy}>{busy?"Guardando…":"Guardar deuda"}</button></div>
    </form>
  </dialog>;
}
