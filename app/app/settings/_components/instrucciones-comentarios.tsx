// app/app/settings/_components/instrucciones-comentarios.tsx
//
// Editor de instrucciones de respuesta a comentarios POR MARCA. Se guardan en
// marcas.tono_voz.instrucciones y la IA les da máxima prioridad. Incluye botón
// para copiar un prompt listo para pegar en ChatGPT.
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { updateMarcaInstrucciones } from '../_actions'

export type MarcaInstr = {
  slug: string
  nombre: string
  emoji: string | null
  instrucciones: string
}

export function InstruccionesComentarios({ marcas }: { marcas: MarcaInstr[] }) {
  const router = useRouter()
  const [slug, setSlug] = useState(marcas[0]?.slug ?? '')
  const actual = marcas.find((m) => m.slug === slug)
  const [texto, setTexto] = useState(actual?.instrucciones ?? '')
  const [saving, setSaving] = useState(false)

  function cambiarMarca(s: string) {
    setSlug(s)
    setTexto(marcas.find((m) => m.slug === s)?.instrucciones ?? '')
  }

  async function guardar() {
    setSaving(true)
    const r = await updateMarcaInstrucciones(slug, texto)
    setSaving(false)
    if (r.ok) {
      toast.success('✅ Instrucciones guardadas — la IA ya las usará para esta marca')
      router.refresh()
    } else {
      toast.error(`Error: ${r.error}`, { duration: 8000 })
    }
  }

  async function copiarChatGPT() {
    const m = marcas.find((x) => x.slug === slug)
    const prompt =
      `Eres community manager de la marca "${m?.nombre}" respondiendo comentarios públicos en redes sociales (Instagram / Facebook / TikTok). Español peruano, tuteo (nunca voseo).\n\n` +
      `${texto.trim() || '(sin instrucciones específicas — responde corto, cálido y humano)'}\n\n` +
      `Te paso el texto del post y un comentario. Devuélveme SOLO la respuesta sugerida (un texto corto, un emoji, o vacío si no se debe responder).`
    try {
      await navigator.clipboard.writeText(prompt)
      toast.success('📋 Prompt copiado — pégalo en ChatGPT')
    } catch {
      toast.error('No se pudo copiar (permisos del navegador)')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={slug}
          onChange={(e) => cambiarMarca(e.target.value)}
          className="h-9 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40"
        >
          {marcas.map((m) => (
            <option key={m.slug} value={m.slug}>
              {m.emoji ? `${m.emoji} ` : ''}{m.nombre}
            </option>
          ))}
        </select>
        {actual?.instrucciones
          ? <span className="text-[11px] text-emerald-600">✓ con instrucciones</span>
          : <span className="text-[11px] text-amber-600">⚠ sin instrucciones (usa reglas genéricas)</span>}
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={12}
        placeholder={'Ej:\nNo respondas a todos los comentarios.\nSi el comentario es solo emojis → responde con un emoji.\nSi es una risa (jajaja) → responde con 😂.\nPreguntas por precio → invita a DM, no inventes datos.'}
        className="w-full px-3 py-2 rounded-md border bg-background text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40 resize-y"
      />

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={guardar}
          disabled={saving}
          className="h-9 px-4 rounded-md text-white text-sm font-medium disabled:opacity-50"
          style={{ background: '#ba41f7' }}
        >
          {saving ? 'Guardando…' : 'Guardar instrucciones'}
        </button>
        <button
          onClick={copiarChatGPT}
          className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted"
          title="Copia un prompt completo (rol + estas instrucciones) listo para pegar en ChatGPT"
        >
          📋 Copiar para ChatGPT
        </button>
        <span className="text-[11px] text-muted-foreground ml-auto">{texto.length} caracteres</span>
      </div>

      <p className="text-[11px] text-muted-foreground">
        La IA usa estas instrucciones con <strong>máxima prioridad</strong> al generar borradores de esta marca.
        El botón <strong>Copiar para ChatGPT</strong> arma un prompt completo para que pruebes/uses lo mismo en ChatGPT.
      </p>
    </div>
  )
}
