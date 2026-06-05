// app/app/publicaciones/[id]/page.tsx
// Vista detalle de una publicación con TODAS las variables editables.
// Estilo Metricool: editor split-view + preview lateral.

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { PublicacionDetailForm } from './_components/publicacion-detail-form'
import type { PublicacionRow, EditorRow, EscenaRow } from '@/lib/types/database'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export default async function PublicacionDetailPage({ params }: PageProps) {
  await requireUser()
  const { id } = await params
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const [pubResult, editoresResult, escenasResult] = await Promise.all([
    service
      .from('publicaciones')
      .select(`
        *,
        marca:marcas(id, slug, nombre, emoji_marca, color_primario_hex)
      `)
      .eq('id', id)
      .maybeSingle(),
    service
      .from('editores')
      .select('id, nombre, activo, created_at')
      .eq('activo', true)
      .order('nombre'),
    service
      .from('escenas')
      .select('*')
      .eq('publicacion_id', id)
      .order('escena_num', { ascending: true }),
  ])

  /* Si no existe, mostrar empty state amigable (no 404 ciego).
     Casos comunes: ID viene de mock data o es un link viejo roto. */
  if (pubResult.error || !pubResult.data) {
    return <PubNotFound id={id} reason={pubResult.error?.message} />
  }
  const pub = pubResult.data
  const editores = (editoresResult.data ?? []) as EditorRow[]
  const escenas = (escenasResult.data ?? []) as EscenaRow[]

  const marca = Array.isArray(pub.marca) ? pub.marca[0] : pub.marca

  return (
    <main className="container mx-auto p-6 max-w-7xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/publicaciones" className="hover:text-foreground">
          Publicaciones
        </Link>
        <span>/</span>
        {marca && (
          <>
            <Link
              href={`/publicaciones?marca=${marca.slug}`}
              className="hover:text-foreground flex items-center gap-1"
            >
              <span>{marca.emoji_marca}</span>
              <span>{marca.nombre}</span>
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-foreground font-medium truncate max-w-[260px]">{pub.nombre}</span>
      </nav>

      <PublicacionDetailForm
        publicacion={pub as PublicacionRow}
        marca={marca}
        editores={editores}
      />

      {/* GUION TÉCNICO movido adentro del PublicacionDetailForm, debajo
          del toolbar de iconos. Pedro pidió tenerlo en línea con el copy
          y no en una sección separada al final. */}
    </main>
  )
}

/* ============================================================
   Empty state — publicación no encontrada
   ============================================================ */

function PubNotFound({ id, reason }: { id: string; reason?: string }) {
  const isMockId = /^p\d+$/.test(id)  /* p1, p2, etc. del mock data */
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 20px',
      }}
    >
      <div
        style={{
          maxWidth: 480, width: '100%',
          background: 'var(--mk-bg-elevated)',
          border: '1px solid var(--mk-border-subtle)',
          borderRadius: 'var(--mk-radius-xl)',
          padding: '32px 28px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: 56, height: 56,
            borderRadius: 'var(--mk-radius-lg)',
            background: 'var(--mk-bg-base)',
            border: '1px solid var(--mk-border-subtle)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
            color: 'var(--mk-text-quaternary)',
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 12L16 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <h1
          style={{
            fontSize: 'var(--mk-text-xl)', fontWeight: 600,
            letterSpacing: 'var(--mk-tracking-tight)',
            color: 'var(--mk-text-primary)', margin: 0, marginBottom: 8,
          }}
        >
          {isMockId ? 'Publicación de demo' : 'Publicación no encontrada'}
        </h1>
        <p style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)', margin: 0, marginBottom: 20, lineHeight: 1.5 }}>
          {isMockId
            ? `El ID "${id}" pertenece a los datos de ejemplo del nuevo diseño, todavía no hay una publicación real cargada con ese ID.`
            : <>No existe una publicación con ID <code style={{ fontFamily: 'var(--font-geist-mono, monospace)', fontSize: 12, padding: '1px 5px', background: 'var(--mk-bg-base)', borderRadius: 3 }}>{id}</code>. Puede haber sido eliminada o el link está roto.</>
          }
        </p>
        {reason && !isMockId && (
          <details style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-quaternary)', marginBottom: 20 }}>
            <summary style={{ cursor: 'pointer' }}>Detalle técnico</summary>
            <pre style={{ marginTop: 8, padding: 10, background: 'var(--mk-bg-base)', borderRadius: 6, textAlign: 'left', fontSize: 11, overflow: 'auto' }}>{reason}</pre>
          </details>
        )}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link
            href="/publicaciones"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
              background: 'var(--mk-accent)', color: 'white',
              borderRadius: 'var(--mk-radius-md)', textDecoration: 'none',
              boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
            }}
          >
            ← Volver a publicaciones
          </Link>
          <Link
            href="/cockpit"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
              background: 'transparent', color: 'var(--mk-text-secondary)',
              border: '1px solid var(--mk-border-default)',
              borderRadius: 'var(--mk-radius-md)', textDecoration: 'none',
            }}
          >
            Cockpit
          </Link>
        </div>
      </div>
    </div>
  )
}
