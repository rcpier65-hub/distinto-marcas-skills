import type { Metadata } from 'next'
import { Inter_Tight, Geist_Mono } from 'next/font/google'
import { AppShell } from '@/components/layout/AppShell'
import { Toaster } from '@/components/ui/sonner'
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="es"
      /* class "dark" fuerza dark mode en componentes shadcn que usen .dark.
         Los tokens shadcn (--background, --foreground, etc.) ya están
         mapeados a Linear en globals.css, así que dark global aplica
         automáticamente a toda la app. */
      className={`${interTight.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
        <Toaster />
      </body>
    </html>
  )
}
