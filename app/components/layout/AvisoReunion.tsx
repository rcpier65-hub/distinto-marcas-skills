'use client'

/* AvisoReunion — como Granola: cuando empieza una reunión del calendario,
   avisa "¿Transcribimos?" (aviso en la app + notificación del sistema +
   sonido). "Transcribir" abre la nota de esa reunión lista para grabar.
   Pedro 24-sep-2026.

   Funciona mientras la app esté abierta (aunque minimizada). Revisa la agenda
   cada 5 min y programa el aviso 1 min antes de cada reunión; si se abre la
   app con una reunión ya empezada (hasta 10 min), avisa en ese momento.
   Cada reunión se avisa una sola vez por dispositivo. Solo directores (el
   server devuelve lista vacía para el resto). */

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { abrirNotaDeReunion, reunionesParaAviso, type ReunionAviso } from '@/app/notas-reuniones/_granola-actions'
import { sonarAviso } from '@/lib/sonido/sonidos'

const ANTES_MS = 60_000
const TARDE_MS = 10 * 60_000
const REVISAR_MS = 5 * 60_000

function yaAvisada(clave: string): boolean {
  try { return localStorage.getItem(`reunion-avisada:${clave}`) === '1' } catch { return false }
}
function marcarAvisada(clave: string) {
  try { localStorage.setItem(`reunion-avisada:${clave}`, '1') } catch { /* sin storage */ }
}

export function AvisoReunion() {
  const router = useRouter()
  const pathname = usePathname()
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const pathRef = useRef(pathname)
  useEffect(() => { pathRef.current = pathname }, [pathname])

  useEffect(() => {
    let cancelado = false
    const programados = timers.current

    async function abrir(r: ReunionAviso) {
      if (r.notaId) { router.push(`/notas-reuniones/${r.notaId}`); return }
      const res = await abrirNotaDeReunion({
        titulo: r.titulo, marcaReunionId: r.marcaReunionId, googleEventId: r.googleEventId,
        inicio: r.inicio, meetLink: r.meetLink, marcaId: r.marcaId,
      })
      if (!res.ok) { toast.error(res.error); return }
      router.push(`/notas-reuniones/${res.id}`)
    }

    function avisar(r: ReunionAviso) {
      if (yaAvisada(r.clave)) return
      marcarAvisada(r.clave)
      // Si ya está dentro de esa nota, no hace falta avisar.
      if (r.notaId && pathRef.current === `/notas-reuniones/${r.notaId}`) return
      sonarAviso()
      const hora = new Intl.DateTimeFormat('es-PE', { timeZone: 'America/Lima', hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date(r.inicio))
      toast(`Empieza «${r.titulo}» (${hora})`, {
        description: '¿Transcribimos la reunión? Al terminar te dejo las notas ordenadas y las tareas.',
        duration: 5 * 60_000,
        action: { label: 'Transcribir', onClick: () => void abrir(r) },
        cancel: { label: 'Ahora no', onClick: () => {} },
      })
      // Notificación del sistema (por si la app está minimizada).
      try {
        if ('Notification' in window && Notification.permission === 'granted') {
          const opts = { body: '¿Transcribimos la reunión? Toca para abrir Notas y reuniones.', icon: '/icons/icon-192.png', tag: `reunion-${r.clave}`, data: { url: r.notaId ? `/notas-reuniones/${r.notaId}` : '/notas-reuniones' } } as NotificationOptions
          void navigator.serviceWorker?.getRegistration().then((reg) => {
            if (reg) void reg.showNotification(`🎙 Empieza: ${r.titulo}`, opts)
            else new Notification(`🎙 Empieza: ${r.titulo}`, opts)
          })
        }
      } catch { /* sin notificación */ }
    }

    async function revisar() {
      let lista: ReunionAviso[] = []
      try { lista = await reunionesParaAviso() } catch { return }
      if (cancelado) return
      const ahora = Date.now()
      for (const r of lista) {
        if (yaAvisada(r.clave) || programados.has(r.clave)) continue
        const inicio = new Date(r.inicio).getTime()
        const cuando = inicio - ANTES_MS
        if (ahora >= cuando && ahora <= inicio + TARDE_MS) avisar(r)
        else if (cuando > ahora && cuando - ahora < REVISAR_MS * 3) {
          programados.set(r.clave, setTimeout(() => { programados.delete(r.clave); avisar(r) }, cuando - ahora))
        }
      }
    }

    void revisar()
    const id = setInterval(() => { void revisar() }, REVISAR_MS)
    return () => {
      cancelado = true
      clearInterval(id)
      programados.forEach((t) => clearTimeout(t))
      programados.clear()
    }
  }, [router])

  return null
}
