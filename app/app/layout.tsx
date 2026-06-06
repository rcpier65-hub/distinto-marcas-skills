import type { Metadata } from 'next'
import { Inter_Tight, Geist_Mono } from 'next/font/google'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
import { getMarcasNav } from '@/lib/marcas/get-marcas-nav'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
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
  title: 'Distinto',
  description: 'Sistema operativo de Agencia Distinto',
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
  const [marcas, permisos] = await Promise.all([
    getMarcasNav(),
    getCurrentMemberPermisos(),
  ])

  /* Reducimos los permisos a un objeto simple serializable para pasarlo
     al client component AppShell. Si no hay miembro asociado (admin/
     owner), pasamos null y el sidebar muestra todo. */
  const permisosSimple = permisos
    ? {
        modulos: permisos.permisos,
        marcasAcceso: permisos.marcasAcceso,
        nombre: permisos.member.nombre,
        rol: permisos.rol.nombre,
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
        <AppShell marcas={marcas} permisos={permisosSimple}>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  )
}
