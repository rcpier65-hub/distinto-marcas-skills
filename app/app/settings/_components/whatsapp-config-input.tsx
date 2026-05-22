// app/app/settings/_components/whatsapp-config-input.tsx
//
// Form de configuración WhatsApp por marca. Patrón:
//  - Cada campo auto-save onBlur (mismo patrón LogoUrlInput).
//  - El dropdown de grupo se llena via prop `gruposDisponibles` (live fetch
//    en el server component padre, no per-componente).
//  - Toggle envio_real_habilitado tiene confirmación nativa (window.confirm)
//    porque activarlo permite enviar a clientes reales.
//  - Botón "Probar mención" usa el chatId + mention actual sin guardar nada
//    nuevo — sirve para verificar antes de habilitar el flag real.

'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateMarcaWhatsappConfig, probarMencionMarca } from '../_actions'
import type { WhatsAppGroup } from '@/lib/integrations/rubi'

type Props = {
  slug: string
  marcaNombre: string
  emojiMarca: string | null
  initial: {
    grupo_whatsapp_chatid: string | null
    grupo_whatsapp_nombre: string | null
    mention_number: string | null
    decisor_tratamiento: string | null
    decisor_nombre: string | null
    envio_real_habilitado: boolean
  }
  gruposDisponibles: WhatsAppGroup[]
}

export function WhatsappConfigInput({
  slug,
  marcaNombre,
  emojiMarca,
  initial,
  gruposDisponibles,
}: Props) {
  const [chatId, setChatId] = useState(initial.grupo_whatsapp_chatid ?? '')
  const [mention, setMention] = useState(initial.mention_number ?? '')
  const [tratamiento, setTratamiento] = useState(initial.decisor_tratamiento ?? '')
  const [nombre, setNombre] = useState(initial.decisor_nombre ?? '')
  const [envioReal, setEnvioReal] = useState(initial.envio_real_habilitado)

  const [savedFields, setSavedFields] = useState({
    chatId: initial.grupo_whatsapp_chatid ?? '',
    mention: initial.mention_number ?? '',
    tratamiento: initial.decisor_tratamiento ?? '',
    nombre: initial.decisor_nombre ?? '',
  })
  const [isPending, startTransition] = useTransition()
  const [isProbing, startProbing] = useTransition()

  // Si el chatId seleccionado coincide con uno de la lista, lo mostramos
  // con nombre legible. Si no, mostramos el chatId raw.
  const grupoSeleccionado = gruposDisponibles.find((g) => g.chatId === chatId)

  function saveField<K extends keyof typeof savedFields>(
    key: K,
    newValue: string,
    serverKey: 'grupo_whatsapp_chatid' | 'mention_number' | 'decisor_tratamiento' | 'decisor_nombre',
  ) {
    if (savedFields[key] === newValue) return
    startTransition(async () => {
      // Cuando guardamos chatId, también persistimos el nombre del grupo
      // (para que el caption/dashboard sepan a qué grupo nos referimos sin
      // tener que hacer round-trip a Rubi).
      const payload: Record<string, string | null> = { [serverKey]: newValue }
      if (serverKey === 'grupo_whatsapp_chatid') {
        const g = gruposDisponibles.find((x) => x.chatId === newValue)
        payload.grupo_whatsapp_nombre = g?.nombre ?? null
      }
      const result = await updateMarcaWhatsappConfig(slug, payload)
      if (result.ok) {
        setSavedFields((prev) => ({ ...prev, [key]: newValue }))
        toast.success(`${marcaNombre} — campo guardado`)
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  function handleToggleEnvioReal() {
    const nextValue = !envioReal
    const confirmMsg = nextValue
      ? `¿Habilitar envío REAL al grupo del cliente "${marcaNombre}"?\n\nUna vez activado, el botón "📤 Enviar al grupo WhatsApp" mandará el PNG al grupo configurado. Asegurate de haber probado primero con el botón 🧪.`
      : `¿Deshabilitar envío real para "${marcaNombre}"?\n\nEl botón "Enviar al grupo WhatsApp" dejará de funcionar. Sólo "🧪 Probar" seguirá disponible.`
    if (!confirm(confirmMsg)) return

    startTransition(async () => {
      const result = await updateMarcaWhatsappConfig(slug, { envio_real_habilitado: nextValue })
      if (result.ok) {
        setEnvioReal(nextValue)
        toast.success(
          nextValue
            ? `✅ Envío real HABILITADO para ${marcaNombre}`
            : `🔒 Envío real deshabilitado para ${marcaNombre}`,
        )
      } else {
        toast.error(`Error: ${result.error}`)
      }
    })
  }

  function handleProbar() {
    if (!chatId) {
      toast.error('Seleccioná primero un grupo')
      return
    }
    startProbing(async () => {
      toast.loading(`Enviando prueba a ${grupoSeleccionado?.nombre ?? 'grupo'}…`, { id: 'probe' })
      const result = await probarMencionMarca(slug)
      if (result.ok) {
        toast.success(`🧪 Prueba enviada a "${result.grupo}". Revisá WhatsApp.`, { id: 'probe' })
      } else {
        toast.error(`Error: ${result.error}`, { id: 'probe' })
      }
    })
  }

  return (
    <div className="py-4 border-b border-border last:border-0 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-2xl">{emojiMarca ?? '📊'}</span>
        <div className="flex-1">
          <div className="font-medium text-sm">{marcaNombre}</div>
          <code className="font-mono text-[10px] text-muted-foreground">{slug}</code>
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={envioReal}
            onChange={handleToggleEnvioReal}
            disabled={isPending}
            className="w-4 h-4"
          />
          <span className={`text-xs font-medium ${envioReal ? 'text-green-600' : 'text-muted-foreground'}`}>
            {envioReal ? '✅ Envío real ON' : '🔒 Envío real OFF'}
          </span>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-9">
        {/* Grupo destino */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground block mb-1">
            Grupo destino
          </label>
          <select
            value={chatId}
            onChange={(e) => {
              setChatId(e.target.value)
              saveField('chatId', e.target.value, 'grupo_whatsapp_chatid')
            }}
            className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">— Sin configurar —</option>
            {gruposDisponibles.map((g) => (
              <option key={g.chatId} value={g.chatId}>
                {g.nombre} {g.alias ? `[${g.alias}]` : ''} · {g.miembros ?? '?'} miembros
              </option>
            ))}
            {chatId && !grupoSeleccionado && (
              // Si el chatId guardado no está en la lista (grupo borrado o nuevo),
              // mostrar como opción "stale" para que Pedro vea qué tiene set.
              <option value={chatId}>⚠ {chatId} (no encontrado en Rubi)</option>
            )}
          </select>
        </div>

        {/* Número a mencionar */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground block mb-1">
            Número a mencionar (@)
          </label>
          <input
            type="text"
            value={mention}
            onChange={(e) => setMention(e.target.value)}
            onBlur={() => saveField('mention', mention, 'mention_number')}
            placeholder="51902414745"
            inputMode="tel"
            className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Tratamiento */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground block mb-1">
            Tratamiento (Dr., Sra., Lic.)
          </label>
          <input
            type="text"
            value={tratamiento}
            onChange={(e) => setTratamiento(e.target.value)}
            onBlur={() => saveField('tratamiento', tratamiento, 'decisor_tratamiento')}
            placeholder="Dr. — vacío si no aplica"
            className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {/* Nombre del decisor */}
        <div>
          <label className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground block mb-1">
            Nombre del decisor
          </label>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={() => saveField('nombre', nombre, 'decisor_nombre')}
            placeholder="Gustavo, Cynthia, etc."
            className="w-full h-9 px-2 rounded-md border border-input bg-background text-xs focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Preview del saludo */}
      <div className="pl-9 flex items-center gap-3 flex-wrap text-[11px]">
        <span className="text-muted-foreground">Saludo final:</span>
        <code className="px-2 py-1 rounded bg-muted/50 font-mono">
          {mention ? `@${mention} ` : ''}
          Hola {tratamiento ? `${tratamiento} ` : ''}
          {nombre || '<sin nombre>'} 👋
        </code>
        {isPending && <span className="text-[10px] text-muted-foreground">guardando…</span>}
      </div>

      <div className="pl-9 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={handleProbar}
          disabled={isProbing || !chatId}
          className="h-8 px-3 rounded-md text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50"
          title={!chatId ? 'Seleccioná primero un grupo' : 'Envía un mensaje de prueba al grupo con la mención configurada'}
        >
          {isProbing ? '⏳ Probando…' : '🧪 Probar mención (envía 1 mensaje de prueba)'}
        </button>
        {grupoSeleccionado && (
          <span className="text-[10px] text-muted-foreground">
            → llegará al grupo <strong>{grupoSeleccionado.nombre}</strong>
          </span>
        )}
      </div>
    </div>
  )
}
