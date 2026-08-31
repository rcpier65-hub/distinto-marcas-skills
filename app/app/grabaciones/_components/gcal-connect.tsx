// app/app/grabaciones/_components/gcal-connect.tsx
//
// Botón/badge de conexión con Google Calendar. Muestra:
//   - "Conectar Google Calendar" si no está conectado
//   - "✓ Sincronizado con {email}" si ya está
//
// También lee el query param ?gcal=... que el callback OAuth setea para
// mostrar un toast de resultado.
'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { CalendarCheck, CalendarX } from 'lucide-react'

export function GoogleCalendarConnect({ connected, email }: { connected: boolean; email: string | null }) {
  const router = useRouter()
  const pathname = usePathname()
  const sp = useSearchParams()
  /* El flujo OAuth vuelve a la vista desde donde se inició (calendario o
     por-marca) — se pasa como ?from= y start/callback lo respetan. */
  const startHref = `/api/auth/google/start?from=${encodeURIComponent(pathname || '/grabaciones')}`

  // Mostrar toast del resultado del OAuth + limpiar el query param
  useEffect(() => {
    const gcal = sp.get('gcal')
    if (!gcal) return
    const messages: Record<string, { type: 'success' | 'error'; msg: string }> = {
      connected: { type: 'success', msg: '✅ Google Calendar conectado — las grabaciones se sincronizan' },
      denied:    { type: 'error',   msg: 'Conexión cancelada' },
      nocode:    { type: 'error',   msg: 'Google no devolvió código de autorización' },
      badstate:  { type: 'error',   msg: 'Error de seguridad (state inválido), reintentá' },
      error:     { type: 'error',   msg: `Error al conectar: ${sp.get('msg') ?? 'desconocido'}` },
    }
    const m = messages[gcal]
    if (m) (m.type === 'success' ? toast.success : toast.error)(m.msg, { duration: 6000 })
    // Limpiar el query param para no repetir el toast en refresh — quedándonos
    // en la MISMA vista (antes mandaba siempre a /grabaciones).
    const params = new URLSearchParams(sp)
    params.delete('gcal'); params.delete('msg')
    router.replace(`${pathname || '/grabaciones'}${params.toString() ? '?' + params.toString() : ''}`)
  }, [sp, router, pathname])

  if (connected) {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-xs font-medium">
          <CalendarCheck className="w-4 h-4" />
          {email ? `Sincronizado · ${email}` : 'Google Calendar conectado'}
        </span>
        <a
          href={startHref}
          className="text-[11px] text-muted-foreground hover:text-foreground underline"
          title="Reconectar (si cambiaste de cuenta o el permiso expiró)"
        >
          Reconectar
        </a>
      </div>
    )
  }

  return (
    <a
      href={startHref}
      className="inline-flex items-center gap-2 h-9 px-4 rounded-md bg-[#ba41f7] text-white text-sm font-medium hover:bg-[#9f37db] transition-colors shadow-sm"
    >
      <CalendarX className="w-4 h-4" />
      Conectar Google Calendar
    </a>
  )
}
