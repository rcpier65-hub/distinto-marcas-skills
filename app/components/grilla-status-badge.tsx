// app/components/grilla-status-badge.tsx
import { Badge } from '@/components/ui/badge'
import type { EstadoGrilla } from '@/lib/types/database'

const STATUS_CONFIG: Record<EstadoGrilla | 'sin_pedido', {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  emoji: string
}> = {
  sin_pedido: { label: 'Sin pedido', variant: 'outline', emoji: '⚪' },
  pendiente: { label: 'Pendiente', variant: 'secondary', emoji: '🟡' },
  procesando: { label: 'Procesando', variant: 'secondary', emoji: '⏳' },
  esperando_aprobacion: { label: 'Esperando aprobación', variant: 'default', emoji: '🔵' },
  aprobada: { label: 'Aprobada', variant: 'default', emoji: '🟢' },
  enviada: { label: 'Enviada', variant: 'default', emoji: '✅' },
  cancelada: { label: 'Cancelada', variant: 'destructive', emoji: '❌' },
  regenerar: { label: 'Regenerando', variant: 'secondary', emoji: '🔄' },
}

export function GrillaStatusBadge({
  estado,
}: {
  estado: EstadoGrilla | null | undefined
}) {
  const key = estado ?? 'sin_pedido'
  const config = STATUS_CONFIG[key]
  return (
    <Badge variant={config.variant} className="text-xs">
      {config.emoji} {config.label}
    </Badge>
  )
}
