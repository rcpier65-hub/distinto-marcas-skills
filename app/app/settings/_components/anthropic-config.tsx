// app/app/settings/_components/anthropic-config.tsx
//
// Card de config de Anthropic (Claude): input de API key + guardar + probar + borrar.
// La key NUNCA se trae al cliente (security) — solo el flag anthropic_has_key.
// Se usa para generar copys de publicaciones (botón "Generar copy con IA").
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateAnthropicKey, probarAnthropic } from '../_actions'

type Props = {
  initial: { anthropic_has_key: boolean }
}

export function AnthropicConfig({ initial }: Props) {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [hasKey, setHasKey] = useState(initial.anthropic_has_key)
  const [isSaving, startSaving] = useTransition()
  const [isProbing, startProbing] = useTransition()

  function handleSave() {
    if (key.trim().length === 0) {
      toast.error('Pega tu API key primero')
      return
    }
    startSaving(async () => {
      const r = await updateAnthropicKey(key)
      if (r.ok) {
        toast.success('✅ API key de Claude guardada — ya puedes generar copys con IA')
        setHasKey(true)
        setKey('')
        setShowKey(false)
      } else {
        toast.error(`Error: ${r.error}`, { duration: 9000 })
      }
    })
  }

  function handleClear() {
    if (!confirm('¿Borrar la API key de Claude?\n\nLa app dejará de generar copys con IA hasta que pongas otra.')) return
    startSaving(async () => {
      const r = await updateAnthropicKey('')
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
      toast.loading('Probando tu API key con Claude…', { id: 'ant-test' })
      const r = await probarAnthropic()
      if (r.ok) {
        toast.success(`✅ Key válida y con saldo (modelo ${r.modelo})`, { id: 'ant-test', duration: 6000 })
      } else {
        toast.error(`❌ ${r.error}`, { id: 'ant-test', duration: 9000 })
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-md">
        <strong className="block mb-1">💡 Cómo obtener tu API key de Claude:</strong>
        <ol className="list-decimal ml-4 space-y-0.5">
          <li>Entra a <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener" className="text-blue-600 underline">console.anthropic.com/settings/keys</a></li>
          <li>En <strong>Billing</strong>, carga crédito (mínimo $5)</li>
          <li><strong>Create Key</strong> → cópiala (empieza con <code>sk-ant-</code>) y pégala aquí</li>
        </ol>
        <p className="mt-2">Se usa para generar copys desde el guion + la voz de cada marca (modelo Claude Opus 4.8), igual que lo hacías en Notion.</p>
      </div>

      <div>
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center justify-between">
          <span>Anthropic API Key</span>
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
            placeholder={hasKey ? '•••••••••••• (deja vacío para mantener la actual)' : 'sk-ant-...'}
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
          <p className="text-[10px] text-amber-600 mt-1">⚠ Sin key configurada — el botón "Generar copy con IA" no funcionará</p>
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
          title={!hasKey ? 'Guarda una key primero' : 'Hace una llamada mínima a Claude para validar la key'}
        >
          {isProbing ? '⏳ Probando…' : '🔌 Probar key'}
        </button>
      </div>
    </div>
  )
}
