"use client";

import { useEffect, useRef } from "react";
import { money, serviceFromTemplate, totals, type ProposalData, type ProposalService } from "@/lib/propuestas/model";
import { ENTREGAS_RAPIDAS, PERIODOS_ENTREGA, type EntregaPersonalizada, type Personalizacion } from "@/lib/presentacion/personalizacion";

type Props = {
  valor: Personalizacion;
  documento: ProposalData;
  html: string;
  guardado: "ok" | "pendiente" | "error";
  cambiar: (f: (p: Personalizacion) => Personalizacion) => void;
  cerrar: () => void;
};

function Texto({ label, value, cambiar, largo = false, max = 6000 }: { label: string; value: string; cambiar: (v: string) => void; largo?: boolean; max?: number }) {
  return <label className="pr-personal-campo"><span>{label}</span>{largo
    ? <textarea value={value} maxLength={max} rows={3} onChange={e => cambiar(e.target.value)} />
    : <input value={value} maxLength={max} onChange={e => cambiar(e.target.value)} />}</label>;
}

export function PersonalizarPropuesta({ valor, documento, html, guardado, cambiar, cerrar }: Props) {
  const dialogo = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = dialogo.current;
    d?.showModal();
    return () => { d?.close(); };
  }, []);
  const editarDocumento = (patch: Partial<ProposalData>) => cambiar(p => ({ ...p, documento: { ...p.documento, ...patch } }));
  const editarServicio = (id: string, patch: Partial<ProposalService>) => cambiar(p => ({ ...p, documento: { ...p.documento, services: p.documento.services.map(s => s.id === id ? { ...s, ...patch } : s) } }));
  const editarEntrega = (servicio: string, id: string, patch: Partial<EntregaPersonalizada>) => cambiar(p => ({ ...p, alcances: { ...p.alcances, [servicio]: (p.alcances[servicio] ?? []).map(e => e.id === id ? { ...e, ...patch } : e) } }));
  const agregarEntrega = (servicio: string, preset?: number) => {
    const base = preset === undefined ? undefined : ENTREGAS_RAPIDAS[preset];
    const item: EntregaPersonalizada = { id: crypto.randomUUID(), texto: base?.texto ?? "", cantidad: base ? 1 : null, periodo: base?.periodo ?? "sin_periodo", incluido: true };
    cambiar(p => ({ ...p, alcances: { ...p.alcances, [servicio]: [item, ...(p.alcances[servicio] ?? [])] } }));
  };
  const total = totals(documento);

  return <dialog ref={dialogo} className="pr-personal-dialog" aria-labelledby="pr-personal-titulo" onCancel={cerrar}>
    <header className="pr-personal-cabecera">
      <div><h2 id="pr-personal-titulo">Personalizar propuesta</h2><p>Agrega, ajusta o quita lo que acordaste con este cliente.</p></div>
      <button type="button" className="pr-btn pr-btn-ghost" onClick={cerrar} aria-label="Cerrar personalización">×</button>
    </header>
    <div className="pr-personal-cuerpo">
      <div className="pr-personal-formulario">
        <p className="pr-personal-ayuda">Los cambios se guardan en esta reunión. El catálogo de planes se conserva. Las cantidades describen el alcance; ajusta el precio del servicio cuando corresponda.</p>
        {valor.documento.services.map((s, indice) => <details className="pr-personal-servicio" key={s.id} open>
          <summary>{s.name || `Servicio ${indice + 1}`}</summary>
          <div className="pr-personal-contenido">
            <Texto label="Nombre del servicio" value={s.name} max={160} cambiar={name => editarServicio(s.id, { name })} />
            <Texto label="Descripción" value={s.summary} max={2000} largo cambiar={summary => editarServicio(s.id, { summary })} />
            <div className="pr-personal-fila">
              <label className="pr-personal-campo"><span>Precio por unidad ({documento.currency === "PEN" ? "S/" : "US$"}, sin IGV)</span><input type="number" min={0} max={10000000} step="0.01" inputMode="decimal" placeholder="Por definir" value={s.price ?? ""} onChange={e => editarServicio(s.id, { price: e.target.value === "" ? null : Math.min(10000000, Math.max(0, Number(e.target.value))) })} /></label>
              <label className="pr-personal-campo"><span>Forma de cobro</span><select value={s.frequency} onChange={e => editarServicio(s.id, { frequency: e.target.value as ProposalService["frequency"] })}><option value="mensual">Mensual</option><option value="unico">Pago único</option></select></label>
            </div>
            <div className="pr-personal-fila">
              <label className="pr-personal-campo"><span>Unidades del servicio</span><input type="number" min={1} max={10000} step={1} value={s.quantity} onChange={e => editarServicio(s.id, { quantity: Math.min(10000, Math.max(1, Math.floor(Number(e.target.value)))) })} /><small>Normalmente 1 paquete. Multiplica el precio.</small></label>
              <label className="pr-personal-check"><input type="checkbox" checked={s.optional} onChange={e => editarServicio(s.id, { optional: e.target.checked })} />Servicio opcional (fuera del total)</label>
            </div>
            <h3>Qué incluye / alcance</h3>
            {(valor.alcances[s.id]?.length ?? 0) < 100 && <div className="pr-personal-agregar">
              <label className="pr-personal-campo"><span>Añadir contenido o reunión</span><select value="" onChange={e => { if (e.target.value !== "") agregarEntrega(s.id, Number(e.target.value)); }}><option value="">Selecciona qué añadir…</option>{ENTREGAS_RAPIDAS.map((p, i) => <option value={i} key={p.texto}>{p.texto}</option>)}</select></label>
              <button type="button" className="pr-btn pr-btn-ghost" onClick={() => agregarEntrega(s.id)}>+ Otro entregable</button>
            </div>}
            <div className="pr-personal-entregas">
              {(valor.alcances[s.id] ?? []).map((e, i) => <fieldset key={e.id} className={`pr-personal-entrega ${e.incluido ? "" : "pr-personal-excluida"}`}>
                <legend>Entrega {i + 1}</legend>
                <div className="pr-personal-entrega-top">
                  <label className="pr-personal-check"><input type="checkbox" checked={e.incluido} onChange={event => editarEntrega(s.id, e.id, { incluido: event.target.checked })} />Incluir</label>
                  <button type="button" className="pr-personal-quitar" aria-label={`Quitar entrega ${i + 1}`} onClick={() => cambiar(p => ({ ...p, alcances: { ...p.alcances, [s.id]: p.alcances[s.id].filter(x => x.id !== e.id) } }))}>Quitar</button>
                </div>
                <Texto label={`Concepto de entrega ${i + 1}`} value={e.texto} cambiar={texto => editarEntrega(s.id, e.id, { texto })} />
                <div className="pr-personal-fila">
                  <label className="pr-personal-campo"><span>Cantidad</span><input type="number" min={1} max={10000} step={1} inputMode="numeric" placeholder="Sin cantidad" aria-label={`Cantidad de entrega ${i + 1}`} value={e.cantidad ?? ""} onChange={event => editarEntrega(s.id, e.id, { cantidad: event.target.value === "" ? null : Math.min(10000, Math.max(1, Math.floor(Number(event.target.value)))) })} /></label>
                  <label className="pr-personal-campo"><span>Frecuencia</span><select aria-label={`Frecuencia de entrega ${i + 1}`} value={e.periodo} onChange={event => editarEntrega(s.id, e.id, { periodo: event.target.value as EntregaPersonalizada["periodo"] })}>{PERIODOS_ENTREGA.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}</select></label>
                </div>
              </fieldset>)}
            </div>
            <details className="pr-personal-detalles"><summary>Entregables adicionales y exclusiones</summary>
              <Texto label="Entregables adicionales · uno por línea" value={s.deliverables} largo cambiar={deliverables => editarServicio(s.id, { deliverables })} />
              <Texto label="No incluye · uno por línea" value={s.exclusions} largo cambiar={exclusions => editarServicio(s.id, { exclusions })} />
              <Texto label="Categoría" value={s.category} max={60} cambiar={category => editarServicio(s.id, { category })} />
            </details>
            <button type="button" className="pr-personal-quitar" onClick={() => cambiar(p => { const alcances = { ...p.alcances }; delete alcances[s.id]; return { ...p, alcances, documento: { ...p.documento, services: p.documento.services.filter(x => x.id !== s.id) } }; })}>Quitar este servicio</button>
          </div>
        </details>)}
        {valor.documento.services.length < 30 && <button type="button" className="pr-btn pr-btn-ghost" onClick={() => { const servicio = serviceFromTemplate("personalizado", crypto.randomUUID()); cambiar(p => ({ ...p, documento: { ...p.documento, services: [...p.documento.services, servicio] }, alcances: { ...p.alcances, [servicio.id]: [] } })); }}>+ Añadir servicio</button>}

        <details className="pr-personal-servicio"><summary>Documento, cliente y condiciones</summary><div className="pr-personal-contenido">
          <Texto label="Título de la propuesta" value={documento.title} max={160} cambiar={title => editarDocumento({ title })} />
          <Texto label="Objetivo" value={documento.objective} max={4000} largo cambiar={objective => editarDocumento({ objective })} />
          <div className="pr-personal-fila">
            <label className="pr-personal-campo"><span>Fecha de propuesta</span><input type="date" value={documento.date} onChange={e => { if (e.target.value) editarDocumento({ date: e.target.value }); }} /></label>
            <label className="pr-personal-campo"><span>Vigencia (días)</span><input type="number" min={1} max={365} value={documento.validityDays} onChange={e => editarDocumento({ validityDays: Math.min(365, Math.max(1, Math.floor(Number(e.target.value)))) })} /></label>
          </div>
          <details className="pr-personal-detalles"><summary>Datos del cliente</summary>
            {([
              ["name", "Cliente / empresa", 200], ["contact", "Persona de contacto", 160], ["document", "RUC / documento", 40],
              ["email", "Correo", 180], ["phone", "Teléfono", 50], ["industry", "Rubro", 200], ["address", "Dirección", 300], ["coverage", "Cobertura", 200],
            ] as const).map(([clave, label, max]) => <Texto key={clave} label={label} value={documento.client[clave]} max={max} cambiar={v => cambiar(p => ({ ...p, documento: { ...p.documento, client: { ...p.documento.client, [clave]: v } } }))} />)}
          </details>
          <div className="pr-personal-fila">
            <label className="pr-personal-campo"><span>Moneda</span><select value={documento.currency} onChange={e => editarDocumento({ currency: e.target.value as ProposalData["currency"] })}><option value="PEN">Soles · PEN</option><option value="USD">Dólares · USD</option></select><small>Cambiar moneda no convierte los importes.</small></label>
            <label className="pr-personal-campo"><span>IGV</span><select value={documento.tax} onChange={e => editarDocumento({ tax: e.target.value as ProposalData["tax"] })}><option value="sin_igv">Sin sumar IGV</option><option value="mas_igv">Agregar 18% de IGV</option></select></label>
          </div>
          <div className="pr-personal-fila">
            {([ ["monthlyDiscount", "Descuento mensual"], ["onceDiscount", "Descuento de pago único"] ] as const).map(([clave, label]) => <label className="pr-personal-campo" key={clave}><span>{label}</span><input type="number" min={0} max={10000000} step="0.01" value={documento[clave]} onChange={e => editarDocumento({ [clave]: Math.min(10000000, Math.max(0, Number(e.target.value))) })} /></label>)}
          </div>
          <Texto label="Permanencia / duración" value={documento.minimum} max={160} cambiar={minimum => editarDocumento({ minimum })} />
          <Texto label="Forma y fechas de pago" value={documento.payment} max={4000} largo cambiar={payment => editarDocumento({ payment })} />
          <Texto label="Condiciones" value={documento.terms} max={8000} largo cambiar={terms => editarDocumento({ terms })} />
          <Texto label="Costos externos" value={documento.externalCosts} max={4000} largo cambiar={externalCosts => editarDocumento({ externalCosts })} />
          <Texto label="Equipo asignado" value={documento.team} max={3000} largo cambiar={team => editarDocumento({ team })} />
        </div></details>
      </div>
      <div className="pr-personal-preview"><span>Vista previa · así aparecerá en el PDF</span><iframe title="Vista previa personalizada" srcDoc={html} sandbox="" /></div>
    </div>
    <footer className="pr-personal-pie">
      <div><strong>{money(total.monthly.total, documento.currency)} / mes{total.once.count > 0 ? ` · ${money(total.once.total, documento.currency)} pago único` : ""}</strong>
        <small role="status">{guardado === "ok" ? "Guardado en esta reunión" : guardado === "pendiente" ? "Guardando cambios…" : "No se pudo guardar. Conservamos tus cambios en pantalla."}{total.monthly.pending || total.once.pending ? " · Hay precios por definir" : ""}</small>
      </div>
      <button type="button" className="pr-btn pr-btn-main" onClick={cerrar}>Listo, volver a la propuesta</button>
    </footer>
  </dialog>;
}
