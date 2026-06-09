// app/lib/realtime/realtime-bridge.tsx
//
// Componente client que se monta en AppShell para activar el hook
// useRealtimeRefresh. Es un wrapper trivial — toda la lógica está en
// el hook. Sirve para que AppShell (server) pueda incluirlo sin
// convertirse en client component.

'use client'

import { useRealtimeRefresh } from './use-realtime-refresh'

export function RealtimeBridge() {
  useRealtimeRefresh()
  return null
}
