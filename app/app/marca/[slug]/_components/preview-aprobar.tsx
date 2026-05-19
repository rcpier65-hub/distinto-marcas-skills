// app/app/marca/[slug]/_components/preview-aprobar.tsx
'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GrillaStatusBadge } from '@/components/grilla-status-badge'
import { aprobarYEnviar, cancelarGrilla, regenerarPng } from '../_actions'
import { toast } from 'sonner'
import type { EstadoGrilla } from '@/lib/types/database'

type Props = {
  grilla: {
    id: string
    estado: EstadoGrilla
    semana_inicio: string
    semana_fin: string
    png_url: string | null
    caption: string
    enviada_at: string | null
  }
  marcaSlug: string
  grupoConfigurado: boolean
}

export function PreviewYAprobar({ grilla, marcaSlug, grupoConfigurado }: Props) {
  const [caption, setCaption] = useState(grilla.caption)
  const [isPending, startTransition] = useTransition()

  const yaEnviada = grilla.estado === 'enviada'
  const canApprove = grilla.estado === 'esperando_aprobacion' && grupoConfigurado

  function handleAprobar() {
    if (!canApprove) return
    startTransition(async () => {
      toast.loading('Enviando al grupo del cliente...', { id: 'aprobar' })
      const result = await aprobarYEnviar(grilla.id, caption)
      if (!result.ok) {
        toast.error(result.error, { id: 'aprobar' })
      } else {
        toast.success(`✅ Enviado al grupo "${result.grupo}"`, { id: 'aprobar' })
      }
    })
  }

  function handleCancelar() {
    if (!confirm('¿Cancelar esta grilla? No vas a poder revertirla, vas a tener que generar una nueva.')) {
      return
    }
    startTransition(async () => {
      await cancelarGrilla(grilla.id, marcaSlug)
      toast.info('Grilla cancelada')
    })
  }

  function handleRegenerar() {
    startTransition(async () => {
      toast.loading('Regenerando PNG...', { id: 'regen' })
      await regenerarPng(grilla.id, marcaSlug)
      toast.success('PNG regenerado', { id: 'regen' })
    })
  }

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {yaEnviada ? '📤 Ya enviada' : '👀 Preview — revisa antes de enviar'}
              <GrillaStatusBadge estado={grilla.estado} />
            </CardTitle>
            <CardDescription>
              Semana {grilla.semana_inicio} → {grilla.semana_fin}
              {grilla.enviada_at && (
                <> · Enviada {new Date(grilla.enviada_at).toLocaleString('es-PE')}</>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PNG Preview */}
        {grilla.png_url ? (
          <div className="rounded-lg overflow-hidden border border-border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={grilla.png_url}
              alt="Preview de la grilla"
              className="w-full max-w-md mx-auto block"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
            ❌ El PNG no se generó. Click en &quot;Regenerar PNG&quot; abajo para volver a intentar.
          </div>
        )}

        {/* Caption editable */}
        <div>
          <label htmlFor="caption" className="text-sm font-medium block mb-2">
            Caption WhatsApp (editable antes de enviar)
          </label>
          <textarea
            id="caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            disabled={yaEnviada || isPending}
            rows={6}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono whitespace-pre-wrap focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Se enviará este texto al grupo del cliente cuando apruebes.
          </p>
        </div>

        {/* Acciones */}
        {!yaEnviada && (
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={handleAprobar}
              disabled={!canApprove || isPending}
              className="flex-1"
              size="lg"
            >
              {isPending ? 'Enviando...' : '✅ Aprobar y enviar al grupo'}
            </Button>
            <Button
              onClick={handleRegenerar}
              disabled={isPending}
              variant="outline"
            >
              🔄 Regenerar PNG
            </Button>
            <Button
              onClick={handleCancelar}
              disabled={isPending}
              variant="ghost"
            >
              ❌ Cancelar
            </Button>
          </div>
        )}

        {!grupoConfigurado && !yaEnviada && (
          <div className="rounded-md bg-yellow-50 dark:bg-yellow-900/20 p-3 text-xs text-yellow-900 dark:text-yellow-200">
            <Badge variant="outline" className="mb-1">⚠️</Badge>{' '}
            Aprobar está deshabilitado: esta marca no tiene grupo WhatsApp configurado.
            Configurá <code>grupo_whatsapp_nombre</code> en Settings antes.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
