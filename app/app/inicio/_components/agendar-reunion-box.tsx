'use client'

/* Asistente "Agendar reunión" — cuadro en el inicio (solo directores). El usuario
   escribe/dicta "agenda para Manrique mañana 10am", la IA lo interpreta, se
   muestra una tarjeta de confirmación y al confirmar se crea el evento en Google
   Calendar + Google manda la invitación por correo. Pedro 25-ago-2026. */

import { useState } from 'react'
import { toast } from 'sonner'
import { CalendarClock, Mic, MicOff, Send, Check, X, Video, Users, Loader2 } from 'lucide-react'
import { useDictado } from '@/lib/hooks/use-dictado'
import { interpretarAgenda, agendarReunion, type AgendaPreview } from '../_agenda-actions'

type PreviewOk = Extract<AgendaPreview, { ok: true }>

function fechaBonita(ymd: string): string {
  try {
    return new Date(`${ymd}T12:00:00-05:00`).toLocaleDateString('es-PE', {
      timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long',
    })
  } catch { return ymd }
}
function horaBonita(hm: string): string {
  try {
    return new Date(`2000-01-01T${hm}:00`).toLocaleTimeString('es-PE', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return hm }
}

export function AgendarReunionBox() {
  const [texto, setTexto] = useState('')
  const [interpretando, setInterpretando] = useState(false)
  const [preview, setPreview] = useState<PreviewOk | null>(null)
  const [agendando, setAgendando] = useState(false)
  // Para marcas SIN correo configurado: se escribe acá.
  const [correoManual, setCorreoManual] = useState('')
  const [guardarCorreo, setGuardarCorreo] = useState(true)

  const { soportado: vozOk, grabando, parcial, alternar } = useDictado({
    onFinal: (frag) => setTexto((cur) => (cur ? cur + ' ' : '') + frag),
    onError: (m) => toast.error(m),
  })

  async function interpretar() {
    const t = texto.trim()
    if (!t || interpretando) return
    setInterpretando(true)
    const r = await interpretarAgenda(t)
    setInterpretando(false)
    if (r.ok) { setPreview(r); setCorreoManual(''); }
    else toast.error(r.error)
  }

  async function confirmar() {
    if (!preview || agendando) return
    // Correos: los de la marca, o el que se escribió a mano.
    const correos = preview.correos.length > 0
      ? preview.correos
      : correoManual.split(/[,;\s]+/).map((c) => c.trim()).filter((c) => /@.+\./.test(c))
    setAgendando(true)
    const r = await agendarReunion({
      marcaId: preview.marcaId,
      marcaNombre: preview.marcaNombre,
      fecha: preview.fecha,
      hora: preview.hora,
      durationMin: preview.durationMin,
      titulo: preview.titulo,
      correos,
      guardarCorreos: preview.correos.length === 0 && guardarCorreo,
    })
    setAgendando(false)
    if (r.ok) {
      toast.success(r.invitados > 0
        ? `✅ Reunión agendada — invitación enviada a ${r.invitados} correo(s).`
        : '✅ Reunión agendada en el calendario (sin invitados por correo).')
      setPreview(null); setTexto('')
    } else {
      toast.error(r.error)
    }
  }

  const sinCorreo = !!preview && preview.correos.length === 0

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5" style={{ borderColor: 'rgba(113,112,255,0.25)' }}>
      <div className="flex items-center gap-2.5 mb-1">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl shrink-0" style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
          <CalendarClock className="w-5 h-5 text-white" />
        </span>
        <div>
          <h3 className="text-[15px] font-bold leading-tight">Agendar reunión</h3>
          <p className="text-[12px] text-muted-foreground">Dilo en una frase y yo agendo + mando la invitación.</p>
        </div>
      </div>

      {!preview ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-xl border bg-background px-2 py-1.5">
            <input
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); interpretar() } }}
              placeholder='Ej: "agenda para Manrique mañana 10am"'
              disabled={interpretando}
              className="flex-1 min-w-0 bg-transparent outline-none text-[14px] px-1.5"
            />
            {vozOk && (
              <button type="button" onClick={alternar} title={grabando ? 'Detener' : 'Dictar'}
                className="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0"
                style={grabando ? { background: '#ef4444', color: '#fff' } : { background: '#f3f4f6', color: '#6b7280' }}>
                {grabando ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button type="button" onClick={interpretar} disabled={!texto.trim() || interpretando} title="Interpretar"
              className="w-9 h-9 rounded-lg inline-flex items-center justify-center shrink-0 text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#7170ff,#ba41f7)' }}>
              {interpretando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
          {/* Estado del dictado: "Grabando…" / "Transcribiendo…" (modo Whisper)
              o el texto que va escuchando en vivo (Web Speech). */}
          {(grabando || parcial) && (
            <p className="mt-1.5 text-[12px] text-muted-foreground italic">{parcial || '🎙 Escuchando…'}</p>
          )}
        </>
      ) : (
        /* ===== Tarjeta de confirmación ===== */
        <div className="mt-3 rounded-xl border p-3.5" style={{ borderColor: '#c7d2fe', background: '#f5f3ff' }}>
          <div className="text-[15px] font-extrabold flex items-center gap-2">
            <span>{preview.marcaEmoji ?? '📌'}</span>
            <span className="truncate">{preview.titulo}</span>
          </div>
          <div className="mt-2 space-y-1.5 text-[13.5px]">
            <div className="flex items-center gap-2"><CalendarClock className="w-4 h-4 shrink-0 text-[#6d28d9]" /> <span className="capitalize">{fechaBonita(preview.fecha)}</span> · <b>{horaBonita(preview.hora)}</b> <span className="text-muted-foreground">({preview.durationMin} min)</span></div>
            <div className="flex items-center gap-2"><Video className="w-4 h-4 shrink-0 text-[#6d28d9]" /> Con link de Google Meet</div>
            {sinCorreo ? (
              <div className="pt-1">
                <div className="flex items-center gap-2 text-[13px] text-amber-700 font-semibold"><Users className="w-4 h-4 shrink-0" /> {preview.marcaNombre} no tiene correo — escríbelo:</div>
                <input value={correoManual} onChange={(e) => setCorreoManual(e.target.value)} placeholder="correo@cliente.com"
                  className="mt-1.5 w-full rounded-lg border bg-white px-3 py-2 text-[13.5px] outline-none focus:ring-2 focus:ring-[#7170ff]/40" />
                <label className="mt-1.5 flex items-center gap-1.5 text-[12px] text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={guardarCorreo} onChange={(e) => setGuardarCorreo(e.target.checked)} /> Guardar este correo para la próxima
                </label>
              </div>
            ) : (
              <div className="flex items-start gap-2"><Users className="w-4 h-4 shrink-0 text-[#6d28d9] mt-0.5" /> <span>Invitar a: <b>{preview.correos.join(', ')}</b> <span className="text-muted-foreground">(Google les manda el correo)</span></span></div>
            )}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button type="button" onClick={confirmar} disabled={agendando || (sinCorreo && !correoManual.trim())}
              className="inline-flex items-center gap-1.5 h-10 px-4 rounded-xl font-semibold text-white text-[14px] disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              {agendando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Confirmar y enviar
            </button>
            <button type="button" onClick={() => setPreview(null)} disabled={agendando}
              className="inline-flex items-center gap-1.5 h-10 px-3 rounded-xl font-semibold border text-[14px] hover:bg-muted">
              <X className="w-4 h-4" /> Cancelar
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
