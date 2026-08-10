import type { Metadata } from 'next'
import { Inter_Tight, Geist_Mono } from 'next/font/google'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { SwRegister } from '@/components/pwa/sw-register'
import { AutoUpdate } from '@/components/pwa/auto-update'
import { getMarcasNav } from '@/lib/marcas/get-marcas-nav'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { getClienteActual } from '@/lib/cliente/get-cliente'
import { getNotificaciones, type Notificacion } from '@/lib/notificaciones/get-notificaciones'
import './globals.css'

/* Inter Tight — la fuente signature de Linear. Sustituye Geist Sans.
   Pesos 400/500/600 cubren todo (regular/medium/semibold).
   Mantenemos Geist Mono para code blocks y .mk-kbd shortcuts. */
const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  /* Title/description los toma también el manifest (vía app/manifest.ts).
     Aquí los duplicamos para SEO y para que SSR los inyecte en <head>. */
  title: 'Distinto',
  description: 'Sistema operativo de Agencia Distinto',
  applicationName: 'Distinto',
  /* PWA metadata para macOS/iOS Safari */
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Distinto',
  },
  /* Favicon + apple-touch-icon */
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  /* Format detection: evitamos que Safari/macOS subraye números como
     teléfonos en los KPIs y métricas. */
  formatDetection: {
    telephone: false,
  },
}

/* Viewport separado del metadata (Next 13+ lo prefiere así).
   themeColor acá controla la barra de status del browser cuando la PWA
   está instalada en standalone mode. */
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#ba41f7',
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Marcas desde la base (fuente única). Se inyectan al shell para que el
  // sidebar y el command palette muestren SIEMPRE las marcas reales — incluidas
  // las que se crean desde el Dashboard. Defensivo: el helper ya cae a la lista
  // fija si la base falla.
  /* Cargamos TODO lo del shell EN PARALELO. Antes las notificaciones y el email
     del usuario iban EN SERIE después de este Promise.all → sumaban tiempo en
     blanco al abrir la app. Ahora el layout tarda lo de la consulta más lenta,
     no la suma. Pedro 06-ago-2026 ("tarda demasiado en aparecer"). */
  const [marcas, permisos, cliente, notificaciones, user] = await Promise.all([
    getMarcasNav(),
    getCurrentMemberPermisos(),
    getClienteActual(),
    getNotificaciones().catch(() => [] as Notificacion[]),
    (async () => {
      try { const { getUser } = await import('@/lib/auth/get-user'); return await getUser() }
      catch { return null }
    })(),
  ])
  /* Email del usuario logueado — indicador de sesión activa en el sidebar. */
  const emailActivo: string | null = user?.email ?? null

  /* Reducimos los permisos a un objeto simple serializable para pasarlo
     al client component AppShell. Si no hay miembro asociado (admin/
     owner), pasamos null y el sidebar muestra todo. */
  const permisosSimple = permisos
    ? {
        modulos: permisos.permisos,
        marcasAcceso: permisos.marcasAcceso,
        nombre: permisos.member.nombre,
        rol: permisos.rol.nombre,
        /* rolBase de BD ('director' | 'editor' | etc.). Sidebar y
           CommandPalette lo usan para tratar 'director' como vista
           admin-equivalente (Pedro como CEO con team_member). */
        rolBase: permisos.member.rol_base,
        email: emailActivo ?? permisos.member.email,
        avatarUrl: permisos.member.avatar_url,
      }
    : null

  return (
    <html
      lang="es"
      /* La app ahora es light-first. Los tokens shadcn (--background,
         --foreground, etc.) ya están mapeados a tokens light en
         globals.css, así que el aesthetic aplica automáticamente sin
         class="dark" en el root. Si en el futuro queremos toggle
         dark/light, agregamos un ThemeProvider con class condicional. */
      className={`${interTight.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        {/* Los CLIENTES (portal de marca) NO ven el sistema interno del equipo:
            se renderizan en un shell limpio, sin sidebar. El equipo sí ve AppShell. */}
        {cliente ? (
          <div className="min-h-full">{children}</div>
        ) : (
          <AppShell marcas={marcas} permisos={permisosSimple} emailActivo={emailActivo} notificaciones={notificaciones}>{children}</AppShell>
        )}
        <Toaster />
        {/* SwRegister: instala /sw.js para hacer la app instalable
            como PWA en macOS/iOS/Android con icono full color. */}
        <SwRegister />
        {/* AutoUpdate: recarga la app sola cuando hay una versión nueva
            publicada, sin tener que cerrar/abrir. Aplica a equipo y clientes. */}
        <AutoUpdate />
      </body>
    </html>
  )
}
