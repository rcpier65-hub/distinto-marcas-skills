import { Inter_Tight } from 'next/font/google'
import './mockup.css'

const interTight = Inter_Tight({
  variable: '--font-inter-tight',
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
})

export const metadata = {
  title: 'Distinto · Mockup',
}

/* El root layout (app/layout.tsx) ya envuelve con <Header /> + sonner.
   Este layout NO crea html/body (no puede en nested layouts), pero importa
   la fuente Inter Tight como CSS variable y el CSS scoped del mockup.
   El wrapper de página (page.tsx) usa .mockup-fullscreen para hacer
   position:fixed inset:0 z-index:9999 → cubre el Header global por completo. */

export default function MockupLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={interTight.variable} style={{ fontFamily: 'var(--font-inter-tight), system-ui, sans-serif' }}>
      {children}
    </div>
  )
}
