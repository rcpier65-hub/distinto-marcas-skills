// app/app/settings/_components/metricool-config.tsx
//
// Card de config Metricool con userId + token input + botón "Probar conexión".
// Token NUNCA se trae al cliente (security) — solo flag has_token.
'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateMetricoolConfig, probarMetricool } from '../_actions'

type Props = {
  initial: {
    metricool_user_id: string
    metricool_has_token: boolean
    metricool_user_id_set: boolean
    updated_at: string | null
  }
}

export function MetricoolConfig({ initial }: Props) {
  const [userId, setUserId] = useState(initial.metricool_user_id)
  const [token, setToken] = useState('')  // vacío al inicio — Pedro escribe sólo si cambia
  const [showToken, setShowToken] = useState(false)
  const [hasToken, setHasToken] = useState(initial.metricool_has_token)
  const [isSaving, startSaving] = useTransition()
  const [isProbing, startProbing] = useTransition()

  function handleSave() {
    // Si token está vacío y ya tenía uno, NO enviamos el campo (preserva existente).
    // Si Pedro escribió algo nuevo, lo enviamos.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload: any = { metricool_user_id: userId }
    if (token.length > 0) payload.metricool_user_token = token

    startSaving(async () => {
      const r = await updateMetricoolConfig(payload)
      if (r.ok) {
        toast.success('Config Metricool actualizada')
        if (token.length > 0) {
          setHasToken(true)
          setToken('')  // clear input para no dejar el secret en memoria del browser
          setShowToken(false)
        }
      } else {
        toast.error(`Error: ${r.error}`)
      }
    })
  }

  function handleClearToken() {
    if (!confirm('¿Borrar el token Metricool actual?\n\nLa app no podrá responder comentarios hasta que pongas uno nuevo.')) return
    startSaving(async () => {
      const r = await updateMetricoolConfig({ metricool_user_token: '' })
      if (r.ok) {
        toast.success('Token borrado')
        setHasToken(false)
      } else {
        toast.error(`Error: ${r.error}`)
      }
    })
  }

  function handleTestConnection() {
    startProbing(async () => {
      toast.loading('Probando conexión a Metricool…', { id: 'mc-test' })
      const r = await probarMetricool()
      if (r.ok) {
        toast.success(
          `✅ Conexión OK — ${r.brandsCount} marcas detectadas (ej. "${r.sampleBrand}")`,
          { id: 'mc-test', duration: 5000 },
        )
      } else {
        toast.error(`❌ ${r.error}`, { id: 'mc-test', duration: 8000 })
      }
    })
  }

  const canSave = userId.trim().length > 0 && (token.length > 0 || hasToken)

  return (
    <div className="space-y-4">
      <div className="text-xs text-muted-foreground bg-muted/40 p-3 rounded-md">
        <strong className="block mb-1">💡 Cómo obtener tus credenciales Metricool:</strong>
        <ol className="list-decimal ml-4 space-y-0.5">
          <li>Abrí <a href="https://app.metricool.com" target="_blank" className="text-blue-600 underline">https://app.metricool.com</a> en tu browser</li>
          <li>F12 → tab Network → recargá la página</li>
          <li>Encontrá cualquier request a <code>/api/v2/...</code></li>
          <li>En los headers de esa request:
            <ul className="list-disc ml-4 mt-1">
              <li><strong>X-Mc-Auth</strong>: tu token</li>
              <li>Query param <strong>userId</strong>: tu userId</li>
            </ul>
          </li>
        </ol>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* User ID */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1">
            User ID
          </label>
          <input
            type="text"
            value={userId}
            onChange={(e) => setUserId(e.target.value.trim())}
            placeholder="4466493"
            inputMode="numeric"
            className="w-full h-10 px-3 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
          />
          {initial.metricool_user_id_set && userId === initial.metricool_user_id && (
            <p className="text-[10px] text-emerald-600 mt-1">✓ Configurado</p>
          )}
        </div>

        {/* Token */}
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground block mb-1 flex items-center justify-between">
            <span>X-Mc-Auth Token</span>
            {hasToken && token.length === 0 && (
              <button
                type="button"
                onClick={handleClearToken}
                className="text-[10px] text-rose-600 hover:underline"
              >
                Borrar
              </button>
            )}
          </label>
          <div className="relative">
            <input
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder={hasToken ? '••••••••••••• (dejá vacío para mantener actual)' : 'Pegá tu X-Mc-Auth aquí'}
              className="w-full h-10 px-3 pr-16 rounded-md border bg-background text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary"
              autoComplete="off"
            />
            {token.length > 0 && (
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground hover:text-foreground"
              >
                {showToken ? '🙈 ocultar' : '👁 ver'}
              </button>
            )}
          </div>
          {hasToken && token.length === 0 && (
            <p className="text-[10px] text-emerald-600 mt-1">✓ Token guardado (no se muestra por seguridad)</p>
          )}
          {!hasToken && token.length === 0 && (
            <p className="text-[10px] text-amber-600 mt-1">⚠ Sin token configurado</p>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={handleSave}
          disabled={isSaving || !canSave}
          className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
        >
          {isSaving ? 'Guardando…' : 'Guardar config'}
        </button>
        <button
          onClick={handleTestConnection}
          disabled={isProbing || !hasToken}
          className="h-9 px-4 rounded-md border text-sm font-medium hover:bg-muted disabled:opacity-50"
          title={!hasToken ? 'Configurá token primero' : 'Hace un GET /api/v2/brands para validar credenciales'}
        >
          {isProbing ? '⏳ Probando…' : '🔌 Probar conexión'}
        </button>
        {initial.updated_at && (
          <span className="text-[10px] text-muted-foreground ml-auto">
            Actualizado: {new Date(initial.updated_at).toLocaleString('es-PE')}
          </span>
        )}
      </div>
    </div>
  )
}
