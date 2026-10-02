// app/lib/integrations/shopify.ts
//
// Shopify Admin API (solo lectura) para el reporte mensual de TypHouse /
// Little Joe (tienda TyPHouse Store · typhouse.pe). Pedro 02-oct-2026.
// Credenciales en variables de entorno (NUNCA en código):
//   SHOPIFY_TYPHOUSE_SHOP            fnejd1-1p.myshopify.com
//   SHOPIFY_TYPHOUSE_CLIENT_ID       id de la app
//   SHOPIFY_TYPHOUSE_CLIENT_SECRET   secreto de la app
// El token se pide con el grant "client_credentials" (dura ~24 h) y se cachea.

import 'server-only'

const API = '2025-07'
let cache: { token: string; vence: number; shop: string } | null = null

function config() {
  const shop = process.env.SHOPIFY_TYPHOUSE_SHOP
  const id = process.env.SHOPIFY_TYPHOUSE_CLIENT_ID
  const secret = process.env.SHOPIFY_TYPHOUSE_CLIENT_SECRET
  if (!shop || !id || !secret) return null
  return { shop, id, secret }
}

export function shopifyConfigurado(): boolean {
  return !!config()
}

async function token(): Promise<{ token: string; shop: string }> {
  const c = config()
  if (!c) throw new Error('Shopify no está configurado')
  if (cache && cache.shop === c.shop && cache.vence > Date.now() + 60_000) return cache
  const r = await fetch(`https://${c.shop}/admin/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: c.id, client_secret: c.secret }),
    signal: AbortSignal.timeout(15000),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || !j.access_token) throw new Error(`Shopify rechazó las credenciales (${r.status})`)
  cache = { token: j.access_token, shop: c.shop, vence: Date.now() + (Number(j.expires_in) || 3600) * 1000 }
  return cache
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gql(query: string): Promise<any> {
  const t = await token()
  const r = await fetch(`https://${t.shop}/admin/api/${API}/graphql.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Shopify-Access-Token': t.token },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30000),
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || j.errors) throw new Error(`Shopify: ${JSON.stringify(j.errors ?? r.status).slice(0, 200)}`)
  return j.data
}

export type ResumenShopify = {
  pedidos: number          // pagados, no cancelados, no de prueba
  ingreso: number          // S/ cobrado de esos pedidos
  nuevos: number           // primera compra del cliente
  recurrentes: number      // el cliente ya había comprado antes
  topProductos: { nombre: string; unidades: number; soles: number }[]
}

/** Resumen de un mes ('YYYY-MM', horario Lima). */
export async function resumenMesShopify(mes: string): Promise<ResumenShopify> {
  const [y, m] = mes.split('-').map(Number)
  const ini = `${mes}-01T00:00:00-05:00`
  const sig = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
  const fin = `${sig}-01T00:00:00-05:00`
  let cursor: string | null = null
  const out: ResumenShopify = { pedidos: 0, ingreso: 0, nuevos: 0, recurrentes: 0, topProductos: [] }
  const productos = new Map<string, { unidades: number; soles: number }>()
  for (let pagina = 0; pagina < 40; pagina++) {
    const d = await gql(`{ orders(first: 100, ${cursor ? `after: "${cursor}",` : ''} query: "created_at:>=${ini} created_at:<${fin}") {
      pageInfo { hasNextPage endCursor }
      nodes { cancelledAt test displayFinancialStatus
        currentTotalPriceSet { shopMoney { amount } }
        customerJourneySummary { customerOrderIndex }
        lineItems(first: 50) { nodes { name quantity product { title } originalTotalSet { shopMoney { amount } } } } } } }`)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const o of d.orders.nodes as any[]) {
      if (o.cancelledAt || o.test) continue
      if (!['PAID', 'PARTIALLY_REFUNDED'].includes(o.displayFinancialStatus)) continue
      out.pedidos++
      out.ingreso += Number(o.currentTotalPriceSet?.shopMoney?.amount ?? 0)
      const idx = o.customerJourneySummary?.customerOrderIndex
      if (idx != null && Number(idx) > 1) out.recurrentes++
      else out.nuevos++
      for (const li of o.lineItems?.nodes ?? []) {
        const nombre = (li.product?.title ?? li.name ?? 'Producto').trim()
        const p = productos.get(nombre) ?? { unidades: 0, soles: 0 }
        p.unidades += Number(li.quantity ?? 0)
        p.soles += Number(li.originalTotalSet?.shopMoney?.amount ?? 0)
        productos.set(nombre, p)
      }
    }
    if (!d.orders.pageInfo.hasNextPage) break
    cursor = d.orders.pageInfo.endCursor
  }
  out.ingreso = Math.round(out.ingreso * 100) / 100
  out.topProductos = [...productos.entries()]
    .map(([nombre, v]) => ({ nombre, unidades: v.unidades, soles: Math.round(v.soles * 100) / 100 }))
    .sort((a, b) => b.unidades - a.unidades).slice(0, 5)
  return out
}
