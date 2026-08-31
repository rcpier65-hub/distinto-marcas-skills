// app/app/cliente/_actions.ts
'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { getClienteActual, COOKIE_MARCA_CLIENTE } from '@/lib/cliente/get-cliente'
import { enviarPushAMiembros } from '@/lib/push/send'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Result = { ok: true; aprobadoAt: string } | { ok: false; error: string }
type Ok = { ok: true } | { ok: false; error: string }

/* Cambiar de marca activa (cliente multi-marca). SEGURIDAD: la marca destino
   DEBE estar vinculada a este login en marca_clientes; jamás puede activar una
   marca ajena. Guarda la elección en una cookie que lee getClienteActual.
   Pedro 17-ago-2026 (Praktico ↔ Retoz shop, mismo cliente). */
export async function cambiarMarcaCliente(marcaId: string): Promise<Ok> {
  const user = await requireUser()
  const service = createServiceClient() as Service
  const { data } = await service
    .from('marca_clientes')
    .select('marca_id')
    .eq('auth_user_id', user.id)
    .eq('marca_id', marcaId)
    .maybeSingle()
  if (!data) return { ok: false, error: 'Esa marca no está disponible para tu cuenta.' }
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_MARCA_CLIENTE, marcaId, {
    httpOnly: true, sameSite: 'lax', secure: true, path: '/', maxAge: 60 * 60 * 24 * 365,
  })
  revalidatePath('/cliente')
  return { ok: true }
}

/* El CLIENTE mueve una publicación a otra fecha desde su calendario (arrastrando
   o con el selector de fecha). Seguridad: solo publicaciones de SU marca y que
   NO estén publicadas (una ya publicada no se reprograma). Le avisa a Erick +
   Pedro para que el equipo se entere del cambio. Pedro 17-jul-2026. */
export async function cambiarFechaPublicacionCliente(pubId: string, nuevaFecha: string): Promise<Ok> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nuevaFecha)) return { ok: false, error: 'Fecha inválida' }

  const service = createServiceClient() as Service
  const { data: pub } = await service
    .from('publicaciones')
    .select('id, nombre, marca_id, fecha_publicacion, publicado_at, estado')
    .eq('id', pubId)
    .maybeSingle()
  if (!pub) return { ok: false, error: 'Publicación no encontrada' }
  if (pub.marca_id !== cliente.marcaId) return { ok: false, error: 'Esa publicación no es de tu marca' }
  if (pub.publicado_at || pub.estado === 'publicado') return { ok: false, error: 'Ya está publicada; no se puede cambiar la fecha' }
  if ((pub.fecha_publicacion ?? '') === nuevaFecha) return { ok: true } // sin cambios

  const { error } = await service.from('publicaciones').update({ fecha_publicacion: nuevaFecha }).eq('id', pubId)
  if (error) return { ok: false, error: error.message }

  const fechaBonita = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(`${nuevaFecha}T12:00:00`))
  await enviarPushAMiembros(['erick'], {
    title: `📅 ${cliente.marcaNombre} movió una publicación`,
    body: `${pub.nombre ?? ''} → ${fechaBonita}`,
    url: '/publicaciones/calendario',
    tag: `mover-${pubId}`,
  })

  revalidatePath('/cliente')
  revalidatePath('/publicaciones')
  return { ok: true }
}

/* El CLIENTE deja una OBSERVACIÓN/feedback al equipo desde su portal. Se guarda
   en su marca y le avisa por push a Erick (encargado) + Pedro. De una vía:
   cliente → equipo. Pedro 15-jul-2026. */
export async function enviarObservacionCliente(texto: string): Promise<Ok> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }
  const t = (texto ?? '').trim()
  if (!t) return { ok: false, error: 'Escribe una observación' }
  if (t.length > 2000) return { ok: false, error: 'La observación es demasiado larga' }
  const service = createServiceClient() as Service
  const { error } = await service.from('marca_observaciones').insert({
    marca_id: cliente.marcaId, autor_nombre: cliente.nombre, texto: t,
  })
  if (error) return { ok: false, error: error.message }
  await enviarPushAMiembros(['erick'], {
    title: `📝 ${cliente.marcaNombre} dejó una observación`,
    body: `${cliente.nombre ? cliente.nombre + ': ' : ''}${t.slice(0, 90)}`,
    url: '/admin/clientes',
    tag: `obs-cli-${cliente.marcaId}`,
  })
  revalidatePath('/cliente')
  revalidatePath('/admin/clientes')
  return { ok: true }
}

/* El CLIENTE borra una observación suya. Seguridad: solo puede borrar las de SU
   marca — verificamos la marca ANTES de borrar, si no cualquier cliente podría
   borrar las de otra marca mandando un id ajeno. Pedro 15-jul-2026. */
export async function eliminarObservacionCliente(id: string): Promise<Ok> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const service = createServiceClient() as Service
  const { data: obs } = await service
    .from('marca_observaciones')
    .select('id, marca_id')
    .eq('id', id)
    .maybeSingle()
  if (!obs) return { ok: false, error: 'Esa observación ya no existe' }
  if (obs.marca_id !== cliente.marcaId) return { ok: false, error: 'Esa observación no es de tu marca' }

  const { error } = await service.from('marca_observaciones').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/cliente')
  revalidatePath('/admin/clientes')
  return { ok: true }
}

/* El CLIENTE agenda su propia SESIÓN DE GRABACIÓN desde su portal (a veces el
   equipo no alcanza a agendarla). Se guarda como 'planeada' marcada como
   agendada_por_cliente y le avisa por push a Erick (encargado) + Pedro.
   Pedro 15-jul-2026. */
export async function agendarGrabacionCliente(input: { fecha: string; hora?: string; notas?: string }): Promise<Ok> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const fecha = (input.fecha ?? '').trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { ok: false, error: 'Elige una fecha válida' }
  // No dejamos agendar en el pasado (fecha de hoy en horario Lima).
  const hoyLima = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date())
  if (fecha < hoyLima) return { ok: false, error: 'Esa fecha ya pasó. Elige una fecha de hoy en adelante.' }

  const hora = (input.hora ?? '').trim()
  if (hora && !/^\d{2}:\d{2}$/.test(hora)) return { ok: false, error: 'Hora inválida' }
  const notas = (input.notas ?? '').trim()
  if (notas.length > 500) return { ok: false, error: 'La nota es demasiado larga' }

  const service = createServiceClient() as Service
  const { error } = await service.from('grabaciones').insert({
    marca_id: cliente.marcaId,
    fecha_planeada: fecha,
    hora_planeada: hora || null,
    estado: 'planeada',
    notas: notas || null,
    agendada_por_cliente: true,
  })
  if (error) return { ok: false, error: error.message }

  const fechaBonita = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', weekday: 'long', day: 'numeric', month: 'long',
  }).format(new Date(`${fecha}T12:00:00`))

  await enviarPushAMiembros(['erick'], {
    title: `🎥 ${cliente.marcaNombre} agendó una grabación`,
    body: `${fechaBonita}${hora ? ` · ${hora}` : ''}${notas ? ` — ${notas.slice(0, 60)}` : ''}`,
    url: '/grabaciones',
    tag: `grab-cli-${cliente.marcaId}-${fecha}`,
  })

  revalidatePath('/cliente')
  revalidatePath('/grabaciones')
  return { ok: true }
}

/* El CLIENTE agrega una FECHA IMPORTANTE de SU marca desde su portal (Pedro
   24-jul-2026). SEGURIDAD: la marca la FORZAMOS a la del cliente — nunca se
   confía en un marca_id que venga del input, así un cliente no puede crear
   fechas en la marca de otro. Avisa a Erick (+ Pedro por director) para que el
   equipo la vea en el módulo interno. */
export async function crearFechaImportanteCliente(input: {
  titulo: string; fecha: string; nota?: string; categoria?: string
}): Promise<Ok> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const titulo = (input.titulo ?? '').trim()
  if (!titulo) return { ok: false, error: 'Falta el título' }
  if (titulo.length > 200) return { ok: false, error: 'El título es demasiado largo' }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.fecha ?? '')) return { ok: false, error: 'Elige una fecha válida' }
  const nota = (input.nota ?? '').trim()
  if (nota.length > 500) return { ok: false, error: 'La nota es demasiado larga' }
  const categoria = ((input.categoria ?? '').trim()) || 'otro'

  const service = createServiceClient() as Service
  const { error } = await service.from('fechas_importantes').insert({
    marca_id: cliente.marcaId,           // ← forzado a la marca del cliente
    titulo,
    fecha: input.fecha,
    nota: nota || null,
    categoria,
    created_by: null,                    // el cliente no es team_member
  })
  if (error) return { ok: false, error: error.message }

  const fechaBonita = new Intl.DateTimeFormat('es-PE', {
    timeZone: 'America/Lima', day: 'numeric', month: 'long',
  }).format(new Date(`${input.fecha}T12:00:00`))
  await enviarPushAMiembros(['erick'], {
    title: `📌 ${cliente.marcaNombre} agregó una fecha importante`,
    body: `${titulo} · ${fechaBonita}`,
    url: '/fechas-importantes',
    tag: `fecha-cli-${cliente.marcaId}-${input.fecha}`,
  })

  revalidatePath('/cliente')
  revalidatePath('/fechas-importantes')
  return { ok: true }
}

/* El CLIENTE elimina una fecha importante de SU marca. SEGURIDAD: verificamos la
   marca ANTES de borrar; si el id no es de su marca, no se toca. */
export async function eliminarFechaImportanteCliente(id: string): Promise<Ok> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const service = createServiceClient() as Service
  const { data: f } = await service
    .from('fechas_importantes')
    .select('id, marca_id')
    .eq('id', id)
    .maybeSingle()
  if (!f) return { ok: false, error: 'Esa fecha ya no existe' }
  if (f.marca_id !== cliente.marcaId) return { ok: false, error: 'Esa fecha no es de tu marca' }

  const { error } = await service.from('fechas_importantes').delete().eq('id', id)
  if (error) return { ok: false, error: error.message }

  revalidatePath('/cliente')
  revalidatePath('/fechas-importantes')
  return { ok: true }
}

/* El CLIENTE aprueba un video de SU marca desde el portal. Marca
   aprobado_cliente_at y notifica por push SOLO a Erick, Lorena y Pedro
   (Pedro entra por ser director; Erick y Lorena por nombre). Aylin, Pieer,
   Nayeli, etc. NO reciben este aviso. Pedro 14-jul-2026. */
export async function aprobarVideoCliente(pubId: string): Promise<Result> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const service = createServiceClient() as Service
  const { data: pub } = await service
    .from('publicaciones')
    .select('id, nombre, marca_id, aprobado_cliente_at')
    .eq('id', pubId)
    .maybeSingle()
  if (!pub) return { ok: false, error: 'Publicación no encontrada' }
  // Seguridad: solo puede aprobar videos de SU marca.
  if (pub.marca_id !== cliente.marcaId) return { ok: false, error: 'Ese video no es de tu marca' }

  // Idempotente.
  if (pub.aprobado_cliente_at) return { ok: true, aprobadoAt: pub.aprobado_cliente_at as string }

  const aprobadoAt = new Date().toISOString()
  const { error } = await service.from('publicaciones').update({ aprobado_cliente_at: aprobadoAt }).eq('id', pubId)
  if (error) return { ok: false, error: error.message }

  /* Aviso a Erick y Lorena (y Pedro por ser director) — "el cliente aprobó".
     El link lleva DIRECTO a esa publicación (antes iba a la lista general).
     Pedro 15-jul-2026. */
  await enviarPushAMiembros(['lorena', 'erick'], {
    title: `👍 ${cliente.marcaNombre} aprobó un video`,
    body: `${cliente.nombre ? cliente.nombre + ' — ' : ''}${pub.nombre ?? ''} · Ya puedes subirlo`,
    url: `/publicaciones/${pubId}`,
    tag: `aprob-cliente-${pubId}`,
  })

  revalidatePath('/cliente')
  revalidatePath('/publicaciones')
  return { ok: true, aprobadoAt }
}

/* El CLIENTE manda CORRECCIONES de un video (en vez de aprobar): una lista de
   {segundo, texto} — el segundo del video donde hay que corregir y qué corregir.
   Se guarda como observación de la marca (con el título del video y los segundos
   formateados MM:SS) para que el equipo las vea, y se avisa por push a Erick +
   Lorena (+ Pedro por director). Idea de Pedro 5-ago-2026: "el cliente debe poder
   mandar correcciones marcando el segundo del cambio". */
export async function enviarCorreccionesCliente(
  pubId: string,
  correcciones: Array<{ segundo: number | null; texto: string }>,
): Promise<Ok> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const service = createServiceClient() as Service
  const { data: pub } = await service
    .from('publicaciones')
    .select('id, nombre, marca_id')
    .eq('id', pubId)
    .maybeSingle()
  if (!pub) return { ok: false, error: 'Publicación no encontrada' }
  // Seguridad: solo puede corregir videos de SU marca.
  if (pub.marca_id !== cliente.marcaId) return { ok: false, error: 'Ese video no es de tu marca' }

  // Limpiar: quedarnos solo con las que tienen texto; segundo puede ser null.
  const items = (correcciones ?? [])
    .map((c) => ({
      segundo: typeof c.segundo === 'number' && isFinite(c.segundo) && c.segundo >= 0 ? Math.floor(c.segundo) : null,
      texto: (c.texto ?? '').trim(),
    }))
    .filter((c) => c.texto)
    .slice(0, 30) // tope de seguridad
  if (items.length === 0) return { ok: false, error: 'Escribe al menos una corrección' }
  if (items.some((c) => c.texto.length > 500)) return { ok: false, error: 'Alguna corrección es demasiado larga' }

  const mmss = (s: number | null) => (s == null ? 'sin marcar' : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`)
  const lista = items.map((c) => `• ${mmss(c.segundo)} → ${c.texto}`).join('\n')
  const texto = `✍️ CORRECCIONES de "${pub.nombre ?? 'video'}" (${items.length}):\n${lista}`

  const { error } = await service.from('marca_observaciones').insert({
    marca_id: cliente.marcaId,
    autor_nombre: cliente.nombre,
    texto,
  })
  if (error) return { ok: false, error: error.message }

  await enviarPushAMiembros(['lorena', 'erick'], {
    title: `✍️ ${cliente.marcaNombre} pidió correcciones`,
    body: `${pub.nombre ?? 'Video'} · ${items.length} corrección${items.length === 1 ? '' : 'es'}`,
    url: `/publicaciones/${pubId}`,
    tag: `correcciones-${pubId}`,
  })

  revalidatePath('/cliente')
  revalidatePath('/admin/clientes')
  revalidatePath('/publicaciones')
  return { ok: true }
}

/* ==================== SOPORTE (portal del cliente) ====================
   Pedro 31-ago-2026: "quita observaciones y pon enviar un reporte a soporte,
   que salga lo mismo que tenemos ya en el sistema de soporte, que escriban
   puedan subir captura y más". Los reportes del cliente caen en la MISMA
   tabla soporte_reportes que usa el equipo (Erick los ve en /soporte), con
   marca_id para poder mostrarle al cliente solo los de su marca. */

const SOPORTE_TIPOS = new Set(['falla', 'pedido', 'consulta'])

export async function subirImagenSoporteCliente(formData: FormData): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'No se recibió la imagen.' }
  if (file.size > 6 * 1024 * 1024) return { ok: false, error: 'La imagen debe pesar menos de 6 MB.' }
  const TIPOS_IMG = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (!TIPOS_IMG.includes(file.type)) return { ok: false, error: 'Formato no soportado (usa JPG, PNG, WEBP o GIF).' }

  const service = createServiceClient() as Service
  const ext = file.type.split('/')[1] ?? 'png'
  const path = `cliente-${cliente.marcaSlug}/${crypto.randomUUID()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error: upErr } = await service.storage.from('soporte').upload(path, buf, { contentType: file.type, upsert: false })
  if (upErr) return { ok: false, error: upErr.message }
  const { data: urlData } = service.storage.from('soporte').getPublicUrl(path)
  return { ok: true, url: urlData.publicUrl }
}

export async function crearReporteSoporteCliente(tipo: string, descripcion: string, imagenes: string[] = []): Promise<Ok> {
  await requireUser()
  const cliente = await getClienteActual()
  if (!cliente) return { ok: false, error: 'No autorizado' }

  const t = SOPORTE_TIPOS.has(tipo) ? tipo : 'consulta'
  const texto = (descripcion ?? '').trim()
  if (!texto) return { ok: false, error: 'Escribe qué pasó o qué necesitas.' }
  if (texto.length > 2000) return { ok: false, error: 'Máximo 2000 caracteres.' }
  const imgs = (imagenes ?? []).filter((u) => typeof u === 'string' && u.includes('/storage/')).slice(0, 6)

  const service = createServiceClient() as Service
  /* team_member_id null = lo escribió un CLIENTE (no es del equipo). El nombre
     lleva la marca para que Erick sepa de quién es de un vistazo. */
  const fila = {
    team_member_id: null,
    autor_nombre: `${cliente.nombre ?? 'Cliente'} · ${cliente.marcaNombre}`,
    tipo: t,
    descripcion: texto,
    estado: 'pendiente',
    imagenes: imgs,
    marca_id: cliente.marcaId,
  }
  let ins = await service.from('soporte_reportes').insert(fila).select('id').single()
  if (ins.error && /marca_id|42703|PGRST204|schema cache/i.test(ins.error.message ?? '')) {
    // La columna marca_id se auto-crea y se reintenta (patrón self-healing).
    try {
      const { ensureSoporteClienteCols } = await import('@/lib/soporte/ensure-cliente-cols')
      await ensureSoporteClienteCols()
      ins = await service.from('soporte_reportes').insert(fila).select('id').single()
    } catch { /* probamos sin la columna */ }
    if (ins.error) {
      const { marca_id: _omit, ...sinCol } = fila
      void _omit
      ins = await service.from('soporte_reportes').insert(sinCol).select('id').single()
    }
  }
  if (ins.error) return { ok: false, error: ins.error.message }

  const EMOJI: Record<string, string> = { falla: '🐞', pedido: '💡', consulta: '❓' }
  try {
    await enviarPushAMiembros(['erick'], {
      title: `${EMOJI[t]} Reporte de CLIENTE · ${cliente.marcaNombre}`,
      body: `${cliente.nombre ?? 'Cliente'}: ${texto.slice(0, 100)}`,
      url: '/soporte',
      tag: `soporte-cli-${ins.data.id}`,
    })
  } catch { /* el reporte ya quedó guardado */ }

  revalidatePath('/cliente')
  revalidatePath('/soporte')
  return { ok: true }
}
