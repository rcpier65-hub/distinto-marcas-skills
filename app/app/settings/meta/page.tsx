import Link from 'next/link'
import { actor } from '@/lib/estrategia/access'
import { config, connection } from '@/lib/meta-mcp/server'
import { strategyDB } from '@/lib/estrategia/db'
import { MetaConnection } from '@/components/estrategia/meta-connection'
export const dynamic='force-dynamic'
export default async function Page({searchParams}:{searchParams:Promise<{meta?:string}>}){
  const a=await actor()
  if(!a.access.owner||a.client)return <main className="p-8">Solo el propietario puede configurar la conexión de Meta de la agencia.</main>
  let configured=true;try{config()}catch{configured=false}
  const [row,brands,query]=await Promise.all([configured?connection():Promise.resolve(null),strategyDB().query<{nombre:string;slug:string;ad_account_id:string|null;facebook_page_id:string|null;instagram_user_id:string|null}>('SELECT m.nombre,m.slug,b.ad_account_id,b.facebook_page_id,b.instagram_user_id FROM marcas m LEFT JOIN meta_brand_accounts b ON b.marca_id=m.id WHERE m.activa=true ORDER BY m.nombre'),searchParams])
  return <main className="mx-auto max-w-5xl p-6 md:p-10">
    <Link href="/settings" className="text-sm text-violet-600">← Configuración</Link>
    <h1 className="mt-5 text-3xl font-semibold">Meta · Conexión de la agencia</h1>
    <p className="mt-3 max-w-3xl text-slate-600">Conecta una sola vez tus cuentas publicitarias, páginas de Facebook e Instagram. Luego elige dentro de cada marca cuáles debe consultar. La conexión funciona desde el servidor de Distinto aunque cierres tu computadora.</p>
    <section className="mt-6 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Una autorización para todas las marcas</h2>
      {query.meta==='failed'&&<p role="alert" className="mt-3 text-red-700">No se completó la autorización. La conexión anterior y las selecciones de tus marcas se conservan.</p>}
      {query.meta==='authorized'&&<p role="status" className="mt-3 text-emerald-700">Autorización actualizada. Ya puedes seleccionar las cuentas dentro de cada marca.</p>}
      <MetaConnection configured={configured} authorized={!!row} scopes={row?.scopes||[]}/>
    </section>
    <section className="mt-6 rounded-2xl border bg-white p-6"><h2 className="text-xl font-semibold">Asignación por marca</h2><p className="mt-1 text-sm text-slate-500">Solo se muestran métricas de las cuentas guardadas en cada marca.</p><div className="mt-4 divide-y">{brands.rows.map(b=><Link key={b.slug} href={`/marca/${b.slug}/metricas`} className="flex flex-wrap items-center justify-between gap-3 py-4"><strong>{b.nombre}</strong><span className="text-sm text-slate-500">Ads {b.ad_account_id?'✓':'—'} · Facebook {b.facebook_page_id?'✓':'—'} · Instagram {b.instagram_user_id?'✓':'—'} <span className="ml-3 text-violet-600">Elegir cuentas →</span></span></Link>)}</div></section>
  </main>
}
