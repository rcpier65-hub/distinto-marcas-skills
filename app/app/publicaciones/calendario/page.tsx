// app/app/publicaciones/calendario/page.tsx
// Redirect a /publicaciones (que ahora es la vista calendario por default).
// Conservamos esta URL para backward compat — links viejos al calendario siguen funcionando.

import { redirect } from 'next/navigation'

type SearchParams = { mes?: string; marca?: string }

export default async function CalendarioRedirectPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const sp = await searchParams
  const qs: string[] = []
  if (sp.mes) qs.push(`mes=${encodeURIComponent(sp.mes)}`)
  if (sp.marca) qs.push(`marca=${encodeURIComponent(sp.marca)}`)
  const target = qs.length > 0 ? `/publicaciones?${qs.join('&')}` : '/publicaciones'
  redirect(target)
}
