// app/app/creacion-de-ideas/page.tsx
// Módulo "Creación de Ideas" — estudio de contenido para creadores (SPA HTML
// autónoma en vanilla JS). Se sirve como asset estático en
// /modulos/creacion-de-ideas/index.html y se embebe acá a pantalla completa
// dentro del layout de la app (iframe). NO toca auth/permisos/layout global.
import { requireUser } from '@/lib/auth/get-user'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Creación de Ideas' }

export default async function CreacionDeIdeasPage() {
  await requireUser()
  return (
    <div style={{ height: '100dvh', width: '100%', overflow: 'hidden' }}>
      <iframe
        src="/modulos/creacion-de-ideas/index.html"
        title="Creación de Ideas"
        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
      />
    </div>
  )
}
