// app/app/publicaciones/nueva/page.tsx
// Form mínimo para crear una nueva publicación.
// 3 campos: marca (obligatorio), nombre (obligatorio), fecha (default hoy).
// Después de crear redirige a /publicaciones/[id] para completar lo demás.

import Link from 'next/link'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { Card, CardContent } from '@/components/ui/card'
import { createPublicacionFromForm } from '../_actions'

export const dynamic = 'force-dynamic'

type SearchParams = {
  marca?: string  // pre-seleccionar marca via ?marca=manrique
  fecha?: string  // pre-llenar fecha via ?fecha=2026-05-22
}

export default async function NuevaPublicacionPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireUser()
  const sp = await searchParams
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any

  const { data: marcas } = await service
    .from('marcas')
    .select('id, slug, nombre, emoji_marca')
    .eq('activa', true)
    .order('nombre')

  // Default fecha = hoy (YYYY-MM-DD)
  const hoy = new Date()
  const fechaDefault = sp.fecha ?? `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`

  // Pre-seleccionar marca por slug si viene en query param
  const marcaPreselect = sp.marca
    ? marcas?.find((m: { slug: string }) => m.slug === sp.marca)
    : null

  return (
    <main className="container mx-auto p-6 max-w-2xl">
      <nav className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Link href="/publicaciones" className="hover:text-foreground">
          Publicaciones
        </Link>
        <span>/</span>
        <span className="text-foreground font-medium">Nueva</span>
      </nav>

      <h1 className="text-3xl font-bold mb-1">Nueva publicación</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Solo lo mínimo. Después de crear vas al detalle completo para llenar copy, guión, plataformas, etc.
      </p>

      <Card>
        <CardContent className="p-6">
          <form action={createPublicacionFromForm} className="space-y-5">
            {/* Marca */}
            <div>
              <label htmlFor="marca_id" className="block text-sm font-medium mb-1.5">
                Marca <span className="text-destructive">*</span>
              </label>
              <select
                id="marca_id"
                name="marca_id"
                required
                defaultValue={marcaPreselect?.id ?? ''}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="" disabled>
                  Elegí una marca…
                </option>
                {marcas?.map((m: { id: string; slug: string; nombre: string; emoji_marca: string | null }) => (
                  <option key={m.id} value={m.id}>
                    {m.emoji_marca} {m.nombre}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground mt-1">
                Obligatorio. La marca determina filtros, calendario y permisos.
              </p>
            </div>

            {/* Nombre */}
            <div>
              <label htmlFor="nombre" className="block text-sm font-medium mb-1.5">
                Nombre / Título <span className="text-destructive">*</span>
              </label>
              <input
                id="nombre"
                name="nombre"
                type="text"
                required
                autoFocus
                placeholder='Ej: "15. PREGUNTA 9" o "POST DÍA DEL PADRE"'
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            {/* Fecha */}
            <div>
              <label htmlFor="fecha_publicacion" className="block text-sm font-medium mb-1.5">
                Fecha de publicación
              </label>
              <input
                id="fecha_publicacion"
                name="fecha_publicacion"
                type="date"
                defaultValue={fechaDefault}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Opcional. Podés cambiarla después.
              </p>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                className="h-10 px-5 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
              >
                Crear y continuar →
              </button>
              <Link
                href="/publicaciones"
                className="h-10 px-4 rounded-md border text-sm font-medium hover:bg-muted flex items-center"
              >
                Cancelar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground mt-4">
        💡 Tip: después de crear, vas a poder agregar plataformas, tipo de contenido, copy, guión, enlaces y checklist en la página de detalle.
      </p>
    </main>
  )
}
