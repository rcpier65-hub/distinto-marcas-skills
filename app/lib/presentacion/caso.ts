import "server-only";
/* Caso real para las presentaciones (Pedro 21-oct-2026): última versión
   guardada del reporte de redes de una marca y su mapa de marca. No consulta
   Meta. Solo cifras agregadas: nada de tokens, comentarios ni personas. */
type Canal = { network: string; followers?: number | null; current?: Record<string, number | null>; previous?: Record<string, number | null> }

export async function casoMarca(db: unknown, slug: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const any = db as any
  /* Para la lista basta saber qué marcas tienen reporte; el contenido se lee solo de la marca elegida. */
  const { data: filas, error } = await any.from('social_report_snapshots').select('brand_id,kind').eq('kind', 'report').limit(1000)
  if (error) throw error
  const ids = [...new Set((filas ?? []).map((f: { brand_id: string }) => f.brand_id))]
  const { data: marcas, error: em } = await any.from('marcas').select('id,slug,nombre').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])
  if (em) throw em
  const lista = (marcas ?? []).filter((m: { id: string }) => (filas ?? []).some((f: { brand_id: string; kind: string }) => f.brand_id === m.id && f.kind === 'report'))
  if (!slug) return { marcas: lista.map((m: { slug: string; nombre: string }) => ({ slug: m.slug, nombre: m.nombre })) }

  const marca = lista.find((m: { slug: string }) => m.slug === slug)
  if (!marca) return { error: 'Esa marca no tiene reporte guardado.' }
  const ultimo = async (kind: string) => (await any.from('social_report_snapshots').select('month,payload,fetched_at').eq('brand_id', marca.id).eq('kind', kind).order('fetched_at', { ascending: false }).limit(1).maybeSingle()).data
  const [reporte, posts] = await Promise.all([ultimo('report'), ultimo('posts')])
  const p = reporte?.payload ?? {}
  const canales = ((p.channels ?? []) as Canal[]).map((c) => ({
    red: c.network, seguidores: c.followers ?? null,
    alcance: c.current?.reach ?? null, alcanceAntes: c.previous?.reach ?? null,
    interacciones: c.current?.interactions ?? null, interaccionesAntes: c.previous?.interactions ?? null,
    seguidoresNuevos: c.current?.follows ?? null, guardados: c.current?.saves ?? null, compartidos: c.current?.shares ?? null,
  }))
  const ads = p.ads?.current ? {
    moneda: p.ads.currency ?? 'USD', gasto: p.ads.current.spend ?? null, conversaciones: p.ads.current.conversations ?? null,
    costo: p.ads.current.costPerConversation ?? null, costoAntes: p.ads.previous?.costPerConversation ?? null,
  } : null
  /* Las publicaciones más vistas: solo texto y cifras (las imágenes de las plataformas caducan). */
  type Pub = { caption?: string; title?: string; views?: number; likes?: number; network?: string }
  const grupos: { network?: string; posts?: Pub[] }[] = posts?.payload?.groups ?? []
  const top = grupos.flatMap((g) => (g.posts ?? []).map((x) => ({ texto: String(x.caption ?? x.title ?? '').split('\n')[0].slice(0, 120), vistas: Number(x.views ?? 0) || null, red: x.network ?? g.network ?? null })))
    .filter((x) => x.texto).sort((a, b) => (b.vistas ?? 0) - (a.vistas ?? 0)).slice(0, 3)
  const { data: mapa } = await any.from('marca_mapas').select('data').eq('marca_id', marca.id).maybeSingle()
  const m = mapa?.data ?? null
  return {
    marca: { nombre: marca.nombre },
    periodo: { mes: reporte?.month ?? '', dias: p.period?.current?.days ?? null, parcial: !!p.period?.partial, inicio: p.period?.current?.start ?? null, fin: p.period?.current?.end ?? null },
    actualizado: reporte?.fetched_at ?? null,
    canales, ads, top,
    mapa: m ? { frase: String(m.frase ?? '').slice(0, 160), idea: String(m.ideaCentral ?? '').slice(0, 300), posicionamiento: String(m.ramas?.posicionamiento?.resumen ?? '').slice(0, 400), puntos: (m.ramas?.posicionamiento?.puntos ?? []).slice(0, 3).map((x: string) => String(x).slice(0, 200)) } : null,
  }
}
