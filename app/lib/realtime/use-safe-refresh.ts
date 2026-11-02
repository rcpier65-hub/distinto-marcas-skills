'use client'

import { useCallback, useEffect, useRef, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'

// Un solo refresco de datos por pestaña, compartido por polling y realtime.
let owner: symbol | null = null
let lastStart = 0
let navigationPending = false
export function canLoadInBackground() {
  return !navigationPending && typeof document !== 'undefined' && document.visibilityState === 'visible' && navigator.onLine
}
export function useSafeRefresh() {
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => { navigationPending = false }, [pathname])
  useEffect(() => {
    function onNavigate(event: MouseEvent) {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const link = event.target instanceof Element ? event.target.closest('a[href]') as HTMLAnchorElement | null : null
      if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return
      const url = new URL(link.href, window.location.href)
      if (url.origin === window.location.origin) navigationPending = url.pathname !== window.location.pathname
    }
    document.addEventListener('click', onNavigate, true)
    return () => document.removeEventListener('click', onNavigate, true)
  }, [])
  const token = useRef(Symbol('refresh'))
  const [isPending, startTransition] = useTransition()
  useEffect(() => {
    if (!isPending && owner === token.current) owner = null
  }, [isPending])
  useEffect(() => {
    const current = token.current
    return () => { if (owner === current) owner = null }
  }, [])
  return useCallback(() => {
    const el = document.activeElement as HTMLElement | null
    if (navigationPending || owner || Date.now() - lastStart < 3000 || document.visibilityState !== 'visible' || !navigator.onLine) return false
    if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return false
    owner = token.current
    lastStart = Date.now()
    startTransition(() => router.refresh())
    return true
  }, [router])
}
