import Link from 'next/link'
import { actor, brandAccess } from '@/lib/estrategia/access'
import { config, connection } from '@/lib/meta-mcp/server'
import { MetaConnection } from '@/components/estrategia/meta-connection'
export const dynamic='force-dynamic'
export default async function Page({params,searchParams}:{params:Promise<{slug:string}>,searchParams:Promise<{meta?:string}>}){
  const {slug}=await params,a=await actor(),brand=await brandAccess(a,slug)
  if(!a.manager||a.client)return <div className="p-8">Solo administración puede configurar las cuentas de Meta.</div>
  let configured=true;try{config()}catch{configured=false}
  const row=configured?await connection(brand.id):null
  const result=(await searchParams).meta
  return <main className="mx-auto max-w-3xl p-6 md:p-10">
    <Link className="text-violet-600" href={`/marca/${slug}/estrategia`}>← Volver a {brand.nombre}</Link>
    <h1 className="mt-5 text-3xl font-semibold">Conectar las métricas de {brand.nombre}</h1>
    <p className="mt-3 text-slate-600">Autoriza la conexión de Meta Ads. Distinto guardará la autorización en el servidor para consultar los resultados aunque cierres tu computadora.</p>
    <section className="mt-6 rounded-2xl border border-violet-100 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Meta Ads</h2>
      <p className="mt-2 text-slate-600">Conexión directa con el MCP oficial de Meta. Esta integración se está preparando para consultar resultados publicitarios.</p>
      {result==='failed'&&<p className="mt-4 text-red-700" role="alert">No se completó la autorización de Meta. Reintenta desde este botón con tu cuenta administradora.</p>}
      <MetaConnection slug={slug} configured={configured} authorized={!!row} />
    </section>
    <section className="mt-5 rounded-2xl border p-6">
      <h2 className="text-xl font-semibold">Facebook e Instagram</h2>
      <p className="mt-2 text-slate-600">Los seguidores y el rendimiento orgánico requieren su propia autorización de lectura. Conectar Ads no activa automáticamente estas métricas.</p>
    </section>
  </main>
}
