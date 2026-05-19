// app/app/dashboard/_components/realtime-watcher.tsx
'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Componente invisible que escucha cambios en grillas_pendientes
 * y hace router.refresh() cuando hay updates.
 */
export function RealtimeWatcher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('grillas_pendientes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',  // INSERT | UPDATE | DELETE
          schema: 'public',
          table: 'grillas_pendientes',
        },
        () => {
          // Refresca el server component → re-fetch data
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  return null
}
