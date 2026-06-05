// app/app/settings/_components/openai-config.tsx
//
// Card de config de OpenAI: input de API key + guardar + probar + borrar.
// La key NUNCA se trae al cliente (security) — solo el flag openai_has_key.
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateOpenAIKey, probarOpenAI } from '../_actions'

type Props = {
  initial: { openai_has_key: boolean }
}

export function OpenaiConfig({ initial }: Props) {
  const [key, setKey] = useState('')        // vacío al inicio — solo se escribe si se cambia
  const [showKey, setShowKey] = useState(false)
  const [hasKey, setHasKey] = useState(initial.openai_has_key)
  const [isSaving, startSaving] = useTransition()
  const [isProbing, startProbing] = useTransition()

  function handleSave() {
    if (key.trim().length === 0) {
      toast.error('Pega tu API key primero')
      return
    }
    startSaving(async () => {
      const r = await updateOpenAIKey(key)
      if (r.ok) {
        toast.success('✅ API key de OpenAI guardada — ya puedes generar borradores')
        setHasKey(true)
        setKey('')          // limpiar el input para no dejar el secreto en memoria del browser
        setShowKey(false)
      } else {
        toast.error(`Error: ${r.error}`, { duration: 9000 })
      }
    })
  }

  function handleClear() {
    if (!confirm('¿Borrar la API key de OpenAI?\n\nLa app dejará de generar borradores de comentarios hasta que pongas otra.')) return
    startSaving(async () => {
      const r = await updateOpenAIKey('')
      if (r.ok) {
        toast.success('Key borrada')
        setHasKey(false)
      } else {
        toast.error(`Error: ${r.error}`)
      }
    })
  }

  function handleTest() {
    startProbing(async () => {
      toast.loading('Probando tu API key con OpenAI…', { id: 'oai-test' })
      const r = await probarOpenAI()
      if (r.ok) {
        toast.success(`✅ Key válida y con saldo (modelo ${r.modelo})`, { id: 'oai-test', duration: 6000 })
      } else {
        toast.error(`❌ ${r.error}`, { id: 'oai-test', duration: 9000 })
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-md">
        <strong className="block mb-1">💡 Cómo obtener tu API key de OpenAI:</strong>
        <ol className="list-decimal ml-4 space-y-0.5">
          <li>Entra a <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-blue-600 underline">platform.openai.com/api-keys</a></li>
          <li>En <strong>Billing</strong>, carga crédito (mínimo $5 — te dura más de un año con tu volumen)</li>
          <li><strong>Create new secret key</strong> → cópiala (empieza con <code>sk-</code>) y pégala aquí</li>
        </ol>
        <p className="mt-2">Se usa para generar las respuestas sugeridas a comentarios (modelo gpt-4o-mini, ~S/ 1/mes).</p>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
          <span>OpenAI API Key</span>
          {hasKey && key.length === 0 && (
            <button type="button" onClick={handleClear} className="text-[10px] text-rose-600 hover:underline">
              Borrar
            </button>
          )}
        </label>
        <div className="relative">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder={hasKey ? '•••••••••••• (dejá vacío para mantener la actual)' : 'sk-...'}
            className="w-full h-10 px-3 pr-16 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#ba41f7]/40"
            autoComplete="off"
          />
          {key.length > 0 && (
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
            >
              {showKey ? '🙈 ocultar' : '👁 ver'}
            </button>
          )}
        </div>
        {hasKey && key.length === 0 && (
          <p className="text-[10px] text-emerald-600 mt-1">✓ Key guardada (no se muestra por seguridad)</p>
        )}
        {!hasKey && key.length === 0 && (
          <p className="text-[10px] text-amber-600 mt-1">⚠ Sin key configurada — los borradores de comentarios no se generan</p>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={isSaving || key.trim().length === 0}
          className="h-9 px-4 rounded-md text-white text-sm font-medium disabled:opacity-50"
          style={{ background: '#ba41f7' }}
        >
          {isSaving ? 'Guardando…' : 'Guardar key'}
        </button>
        <button
          onClick={handleTest}
          disabled={isProbing || !hasKey}
          className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted disabled:opacity-50"
          title={!hasKey ? 'Guardá una key primero' : 'Hace una llamada mínima a OpenAI para validar la key'}
        >
          {isProbing ? '⏳ Probando…' : '🔌 Probar key'}
        </button>
      </div>
    </div>
  )
}
