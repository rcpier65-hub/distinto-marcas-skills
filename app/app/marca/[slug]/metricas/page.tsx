import Link from 'next/link'
import { actor, brandAccess } from '@/lib/estrategia/access'
import { connection, brandBinding } from '@/lib/meta-mcp/server'
import { MetaAdsPanel } from '@/components/estrategia/meta-ads-panel'
import { MetaAssetSelector } from '@/components/estrategia/meta-asset-selector'
import { SocialCard } from '@/components/estrategia/social-card'
export const dynamic='force-dynamic'
export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params,a=await actor(),brand=await brandAccess(a,slug)
  if(!a.manager||a.client)return <main className="p-8">Solo administración puede consultar las métricas y configurar las cuentas de Meta.</main>
  const [row,binding]=await Promise.all([connection(),brandBinding(brand.id)])
  const bindingKey=`${slug}:${binding?.updated_at||''}`
  return <main className="mx-auto max-w-6xl p-6 md:p-10">
    <Link className="text-sm text-violet-600" href={`/marca/${slug}/estrategia`}>← Volver a {brand.nombre}</Link>
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-semibold">Métricas de {brand.nombre}</h1>{a.access.owner&&<Link href="/settings/meta" className="rounded-xl border bg-white px-4 py-2 text-sm text-violet-700">Conexión de la agencia →</Link>}</div>
    <p className="mt-3 text-slate-600">{row?'Usa la conexión compartida de Meta. Las cuentas seleccionadas aquí pertenecen al panel de esta marca.':'Primero conecta Meta una sola vez desde la configuración de la agencia.'}</p>
    {row&&a.access.owner&&<MetaAssetSelector key={`accounts:${bindingKey}`} slug={slug} binding={binding}/>}
    {row&&<MetaAdsPanel key={`ads:${bindingKey}`} slug={slug} accountId={binding?.ad_account_id||null}/>}
    <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="mb-4 text-xl font-semibold">Facebook e Instagram · orgánico</h2><SocialCard key={bindingKey} slug={slug} manager={false}/></section>
  </main>
}
