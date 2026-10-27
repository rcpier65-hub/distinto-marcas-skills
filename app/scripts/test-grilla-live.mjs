// Solo lectura y sesiones propias: no envía WhatsApp ni modifica publicaciones.
// TEST_BASE_URL=... TEST_OUTPUT_DIR=... node --env-file=.env.local scripts/test-grilla-live.mjs
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { load } from 'cheerio'

const base = process.env.TEST_BASE_URL || 'http://localhost:18122'
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const {data: member, error} = await svc.from('team_members').select('email,password_inicial').eq('email','lorena@agenciadistinto.com').single()
assert.ifError(error)
const jar = new Map()
const auth = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {getAll:()=>[...jar].map(([name,value])=>({name,value})),setAll:cs=>cs.forEach(c=>jar.set(c.name,c.value))},
})
const signed = await auth.auth.signInWithPassword({email:member.email,password:member.password_inicial})
assert.ifError(signed.error)
const headers = () => ({cookie:[...jar].map(([k,v])=>`${k}=${v}`).join('; ')})
const sha = b => createHash('sha256').update(b).digest('hex')
const images = []
try {
  for (const slug of ['lamparas-san-borja','distribuidora-fitness']) {
    const {data: brand,error:be} = await svc.from('marcas').select('id,nombre,envio_real_habilitado').eq('slug',slug).single()
    assert.ifError(be)
    const pubsQuery = () => svc.from('publicaciones').select('id,nombre,fecha_publicacion,plataformas,tipo_contenido')
      .eq('marca_id',brand.id).gte('fecha_publicacion','2026-10-26').lte('fecha_publicacion','2026-11-01').order('id')
    const before = await pubsQuery();assert.ifError(before.error)
    const params = new URLSearchParams({slug,inicio:'2026-10-26',fin:'2026-11-01',pubs:JSON.stringify(before.data.map(p=>({
      fecha:p.fecha_publicacion,titulo:p.nombre,plataformas:(p.plataformas||[]).join(' · '),tipo:(p.tipo_contenido||[]).join(' · '),
    })))})
    const htmlResponse = await fetch(`${base}/api/render-grilla-html?${params}`,{headers:headers(),redirect:'manual'})
    assert.equal(htmlResponse.status,200)
    assert.equal(htmlResponse.headers.get('x-distinto-grilla'),'1')
    const html = await htmlResponse.text(), $ = load(html)
    assert.equal($('.poster').length,1)
    assert.doesNotMatch(html,/https?:\/\/localhost:3000/)
    for(const pub of before.data)assert($('.card .title').toArray().some(e=>$(e).text()===pub.nombre))
    assert.match($('.agency-logo').attr('src'),/^data:image\/svg\+xml;base64,/)
    if(slug==='lamparas-san-borja') {
      assert.equal($('.brand-name .big').text(),brand.nombre)
      assert.doesNotMatch(html,/MANRIQUE|PSICOLÓGICO|Novalamps/)
      assert.equal($('.logo').length,0,'Sin logo configurado se usa nombre, no una imagen rota')
    } else {
      assert.equal($('.brand-name .big').text(),'DISTRIBUIDORA FITNESS')
      assert.match($('.logo').attr('src'),/^data:image\/svg\+xml;base64,/)
      assert.match(html,/gym|fiery-red-smoke/)
    }
    const pngResponse=await fetch(`${base}/api/render-grilla?${params}`,{headers:headers(),redirect:'manual'})
    assert.equal(pngResponse.status,200)
    assert.equal(pngResponse.headers.get('content-type'),'image/png')
    const png=Buffer.from(await pngResponse.arrayBuffer())
    assert.equal(png.subarray(0,8).toString('hex'),'89504e470d0a1a0a')
    assert.equal(png.readUInt32BE(16),1080);assert.equal(png.readUInt32BE(20),1620)
    assert(png.length>50000,'PNG con contenido')
    images.push(sha(png))
    if(process.env.TEST_OUTPUT_DIR) {
      await mkdir(process.env.TEST_OUTPUT_DIR,{recursive:true,mode:0o700})
      await writeFile(`${process.env.TEST_OUTPUT_DIR}/${slug}.png`,png)
    }
    assert.deepEqual((await pubsQuery()).data,before.data,'Publicaciones intactas')
    assert.equal((await svc.from('marcas').select('envio_real_habilitado').eq('id',brand.id).single()).data.envio_real_habilitado,brand.envio_real_habilitado)
    console.log(`PASS ${slug}: HTML con identidad propia, PNG 1080×1620 (${png.length} bytes), publicaciones y envío intactos`)
  }
  assert.notEqual(images[0],images[1])
  for(const route of ['/api/render-grilla-html','/api/render-grilla']) {
    assert.equal((await fetch(base+route+'?slug=lamparas-san-borja',{redirect:'manual'})).status,401)
  }
  console.log('PASS render anónimo bloqueado')
} finally {
  await auth.auth.signOut({scope:'local'})
  console.log('CLEAN sesión de prueba cerrada; no se enviaron mensajes ni se crearon registros')
}
