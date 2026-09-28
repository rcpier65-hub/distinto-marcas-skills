'use server'

/* Notas y reuniones "estilo Granola" — Pedro 24-sep-2026.
   - abrirNotaDeReunion: una reunión del calendario → su nota (la crea una vez).
   - actualizarContextoNota: marca / modalidad / plantilla de la nota.
   - mejorarNotas: al terminar, la IA combina TUS notas + la transcripción en
     notas ordenadas (resumen, decisiones, próximos pasos) y propone tareas con
     responsable y fecha.
   - crearTareasDesdeNota: las tareas aprobadas pasan a Tareas, asignadas a su
     responsable y a SU marca (cada tarea puede ser de una marca distinta).
   - preguntarAReuniones: preguntas sobre TODAS las reuniones (o las de una marca).
   - reunionesParaAviso: reuniones de las próximas horas para el aviso
     "¿Transcribimos?". */

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { createServiceClient } from '@/lib/supabase/service'
import { listCalendarEvents } from '@/lib/integrations/google-calendar'
import { completarIA, leerJSON } from '@/lib/notas-reuniones/ia'
import { resolverPlazo } from '@/lib/notas-reuniones/plazo'
import { esSuperAdmin, puedeVerNota } from '@/lib/notas-reuniones/acceso'
import { NOTA_SELECT, PLANTILLAS, parseAcciones, rowToNota, type AccionNota, type NotaReunion, type Plantilla } from '@/lib/notas-reuniones/types'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any
type Err = { ok: false; error: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TZ = 'America/Lima'

async function yo(service: Service) {
  const user = await requireUser()
  const { data } = await service.from('team_members').select('id, nombre, rol_base').eq('auth_user_id', user.id).maybeSingle()
  return {
    id: (data?.id ?? null) as string | null,
    nombre: (data?.nombre ?? '') as string,
    esCEO: !data || data.rol_base === 'director' || data.rol_base === 'admin',
    superAdmin: esSuperAdmin(user.email),
  }
}

/* Lee la nota si el usuario puede verla (del equipo, o privada y suya). */
async function notaVisible(service: Service, id: string) {
  if (!UUID.test(id)) return null
  const me = await yo(service)
  const { data } = await service.from('notas_reuniones').select(NOTA_SELECT).eq('id', id).maybeSingle()
  if (!data || !puedeVerNota(data, me.id)) return null
  return { me, row: data }
}

/* Marca una nota como privada (solo la ve su autor) o del equipo. Solo el
   super admin, y solo en sus propias notas. */
export async function cambiarPrivacidadNota(id: string, privada: boolean): Promise<{ ok: true } | Err> {
  const service = createServiceClient() as Service
  const v = await notaVisible(service, id)
  if (!v) return { ok: false, error: 'Nota no encontrada.' }
  if (!v.me.superAdmin || v.row.team_member_id !== v.me.id) return { ok: false, error: 'Solo el super admin puede hacer privadas sus notas.' }
  const { error } = await service.from('notas_reuniones').update({ privada }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath('/notas-reuniones')
  revalidatePath(`/notas-reuniones/${id}`)
  return { ok: true }
}

function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}

/* Tabla de los próximos 21 días con su día de la semana: los modelos se
   equivocan calculando "el viernes" o "el lunes" por su cuenta. */
function tablaDias(): string {
  const [y, m, d] = hoyLima().split('-').map(Number)
  const dias = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']
  return Array.from({ length: 21 }, (_, i) => {
    const dt = new Date(Date.UTC(y, m - 1, d + i, 12))
    return `${dias[dt.getUTCDay()]} ${dt.toISOString().slice(0, 10)}${i === 0 ? ' (hoy)' : i === 1 ? ' (mañana)' : ''}`
  }).join('; ')
}

/* ====================== Reunión → nota ====================== */

export async function abrirNotaDeReunion(input: {
  titulo: string
  marcaReunionId?: string | null
  googleEventId?: string | null
  inicio?: string | null
  meetLink?: string | null
  marcaId?: string | null
}): Promise<{ ok: true; id: string } | Err> {
  const service = createServiceClient() as Service
  const me = await yo(service)

  // ¿Ya hay nota para esta reunión? → abrir esa.
  let q = service.from('notas_reuniones').select('id').limit(1)
    .or(me.id ? `privada.eq.false,team_member_id.eq.${me.id}` : 'privada.eq.false')
  if (input.marcaReunionId && UUID.test(input.marcaReunionId)) q = q.eq('marca_reunion_id', input.marcaReunionId)
  else if (input.googleEventId) q = q.eq('google_event_id', input.googleEventId)
  else q = null
  if (q) {
    const { data } = await q
    if (data?.[0]?.id) return { ok: true, id: data[0].id as string }
  }

  // Marca: la de la reunión de la app, o adivinada por el título.
  let marcaId = input.marcaId && UUID.test(input.marcaId) ? input.marcaId : null
  if (!marcaId && input.marcaReunionId && UUID.test(input.marcaReunionId)) {
    const { data } = await service.from('marca_reuniones').select('marca_id').eq('id', input.marcaReunionId).maybeSingle()
    marcaId = data?.marca_id ?? null
  }
  if (!marcaId) marcaId = await marcaPorTitulo(service, input.titulo)

  const meet = input.meetLink && /^https?:\/\//.test(input.meetLink) ? input.meetLink : null
  const { data, error } = await service.from('notas_reuniones').insert({
    team_member_id: me.id,
    titulo: (input.titulo || 'Reunión').trim().slice(0, 200),
    cuerpo: '', transcript: '', chat: [], estado: 'borrador',
    marca_id: marcaId,
    marca_reunion_id: input.marcaReunionId && UUID.test(input.marcaReunionId) ? input.marcaReunionId : null,
    google_event_id: input.googleEventId ?? null,
    reunion_inicio: input.inicio ?? null,
    meet_link: meet,
    modalidad: meet ? 'virtual' : null,
    plantilla: marcaId ? 'cliente' : 'general',
  }).select('id').single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/notas-reuniones')
  return { ok: true, id: data.id as string }
}

async function marcaPorTitulo(service: Service, titulo: string): Promise<string | null> {
  const { data } = await service.from('marcas').select('id, slug, nombre')
  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')
  const t = norm(titulo)
  let mejor: string | null = null
  let score = 0
  for (const m of (data ?? []) as { id: string; slug: string; nombre: string }[]) {
    const palabras = [...norm(m.nombre).split(/\s+/), ...m.slug.split('-')].filter((w) => w.length > 3)
    const s = new Set(palabras.filter((w) => t.includes(w))).size
    if (s > score) { score = s; mejor = m.id }
  }
  return mejor
}

export async function actualizarContextoNota(id: string, patch: {
  marcaId?: string | null
  modalidad?: 'presencial' | 'virtual' | null
  plantilla?: Plantilla
}): Promise<{ ok: true } | Err> {
  const service = createServiceClient() as Service
  const v = await notaVisible(service, id)
  if (!v) return { ok: false, error: 'Nota no encontrada.' }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const upd: any = {}
  if (patch.marcaId !== undefined) upd.marca_id = patch.marcaId && UUID.test(patch.marcaId) ? patch.marcaId : null
  if (patch.modalidad !== undefined) upd.modalidad = patch.modalidad
  if (patch.plantilla && PLANTILLAS.some((p) => p.id === patch.plantilla)) upd.plantilla = patch.plantilla
  const { error } = await service.from('notas_reuniones').update(upd).eq('id', id)
  if (error) return { ok: false, error: error.message }
  revalidatePath(`/notas-reuniones/${id}`)
  return { ok: true }
}

/* ====================== Mejorar notas (IA) ====================== */

const GUIA_PLANTILLA: Record<Plantilla, string> = {
  general: '## Resumen\n## Decisiones\n## Próximos pasos\n## Preguntas abiertas',
  cliente: '## Resumen\n## Lo que necesita el cliente\n## Feedback del cliente\n## Acuerdos\n## Próximos pasos\n## Pendientes del cliente',
  grabacion: '## Resumen\n## Ideas y contenidos a grabar\n## Locación, fecha y logística\n## Guiones / tomas\n## Próximos pasos',
  interna: '## Resumen\n## Estado por persona\n## Bloqueos\n## Prioridades\n## Próximos pasos',
}

export async function mejorarNotas(id: string, plantilla?: Plantilla): Promise<{ ok: true; nota: NotaReunion } | Err> {
  const service = createServiceClient() as Service
  const v = await notaVisible(service, id)
  if (!v) return { ok: false, error: 'Nota no encontrada.' }
  const row = v.row
  const tpl: Plantilla = plantilla && GUIA_PLANTILLA[plantilla] ? plantilla : (row.plantilla as Plantilla) || 'general'

  const cuerpo = String(row.cuerpo ?? '').trim()
  const transcript = String(row.transcript ?? '').trim()
  if (!cuerpo && transcript.length < 40) return { ok: false, error: 'Todavía no hay suficiente contenido (notas o transcripción) para mejorar.' }

  const [{ data: equipo }, { data: marcasRows }, autorRes] = await Promise.all([
    service.from('team_members').select('id, nombre').eq('activo', true),
    service.from('marcas').select('id, nombre, slug'),
    row.team_member_id ? service.from('team_members').select('id, nombre').eq('id', row.team_member_id).maybeSingle() : Promise.resolve({ data: null }),
  ])
  const miembros = (equipo ?? []) as { id: string; nombre: string }[]
  const marcasTodas = (marcasRows ?? []) as { id: string; nombre: string; slug: string }[]
  const marcaNota = marcasTodas.find((m) => m.id === row.marca_id) ?? null
  const marcaNombre: string | null = marcaNota?.nombre ?? null
  const autor = autorRes.data as { id: string; nombre: string } | null

  // Transcripción larga: principio + final (lo del medio se resume menos).
  const tr = transcript.length > 60000 ? `${transcript.slice(0, 25000)}\n[…]\n${transcript.slice(-35000)}` : transcript

  const sistema = `Eres el asistente de notas de reuniones de Agencia Distinto (agencia de marketing en Lima). Escribes en español peruano, claro y profesional.
Tu trabajo es "mejorar" las notas de una reunión como Granola: combina las NOTAS ESCRITAS por el usuario (son lo más importante: respeta su énfasis y cubre cada punto que anotó) con la TRANSCRIPCIÓN para completar el contexto.
HOY es ${hoyLima()} (zona America/Lima). Calendario para resolver fechas (usa SIEMPRE esta tabla, no calcules): ${tablaDias()}. "El viernes" = el PRÓXIMO viernes de la tabla.
Equipo de Distinto (posibles responsables): ${miembros.map((m) => m.nombre).join(', ')}.
Marcas / clientes de la agencia: ${marcasTodas.map((m) => m.nombre).join(', ')}.
Reglas:
- Usa SOLO lo que aparece en las notas o la transcripción. No inventes datos, cifras, nombres ni fechas.
- La transcripción puede tener errores de reconocimiento de voz: corrige el sentido obvio sin cambiar el significado. "Yo:" es quien tomó la nota${autor ? ` (${autor.nombre}): si "Yo" se compromete a algo ("yo les mando…"), el responsable es ${autor.nombre}` : ''}; "Ellos:" son los demás participantes.
- Estructura el resumen en markdown simple (títulos "## " y viñetas "- "), con estas secciones (omite las que queden vacías):
${GUIA_PLANTILLA[tpl]}
- "acciones": tareas concretas que alguien del equipo de Distinto se comprometió a hacer o que quedaron pendientes. Redáctalas como tarea accionable, cortas. "responsable": el nombre EXACTO de la lista del equipo si se menciona o se deduce con claridad; si no, null. "marca": el nombre EXACTO de la marca/cliente de la lista a la que corresponde esa tarea (puede ser distinta a la de la reunión, ej. "revisar la app de Manrique" → la marca de Manrique); si es la marca de la reunión o no se sabe, null. "plazo": las PALABRAS EXACTAS del plazo tal como se dijeron ("para el viernes", "mañana", "el 10 de octubre", "fin de mes"); si no se dijo, null. "fecha": tu mejor cálculo YYYY-MM-DD con la tabla, o null. No incluyas tareas que le tocan al cliente (van en la sección de pendientes del cliente del resumen).
Devuelve SOLO JSON: {"titulo": "título corto y claro de la reunión", "resumen": "markdown", "acciones": [{"texto": "...", "responsable": "Nombre o null", "marca": "Marca o null", "plazo": "palabras exactas o null", "fecha": "YYYY-MM-DD o null"}]}`

  const usuario = [
    `Título actual: ${row.titulo || 'Reunión'}`,
    marcaNombre ? `Marca / cliente: ${marcaNombre}` : '',
    `Tipo de reunión: ${PLANTILLAS.find((p) => p.id === tpl)?.nombre}`,
    `NOTAS ESCRITAS:\n${cuerpo || '(sin notas escritas)'}`,
    `TRANSCRIPCIÓN:\n${tr || '(sin transcripción)'}`,
  ].filter(Boolean).join('\n\n')

  const r = await completarIA({ sistema, usuario, json: true, maxTokens: 2200 })
  if (!r.ok) return r
  const out = leerJSON<{ titulo?: string; resumen?: string; acciones?: { texto?: string; responsable?: string | null; marca?: string | null; plazo?: string | null; fecha?: string | null }[] }>(r.texto)
  if (!out?.resumen) return { ok: false, error: 'La IA no devolvió un resumen válido. Intenta de nuevo.' }

  const porNombre = (n?: string | null) => {
    if (!n) return null
    const k = n.trim().toLowerCase()
    return miembros.find((m) => m.nombre.trim().toLowerCase() === k)
      ?? miembros.find((m) => m.nombre.toLowerCase().split(/\s+/)[0] === k.split(/\s+/)[0])
      ?? null
  }
  const norm = (x: string) => x.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '').trim()
  const marcaPorNombre = (n?: string | null) => {
    if (!n) return null
    const k = norm(n)
    return marcasTodas.find((m) => norm(m.nombre) === k)
      ?? marcasTodas.find((m) => norm(m.nombre).includes(k) || k.includes(norm(m.nombre)))
      ?? null
  }
  /* Responsable por defecto: quien llevó la reunión (dueño de la nota).
     Marca por defecto: la de la reunión. */
  const acciones: AccionNota[] = (out.acciones ?? [])
    .filter((a) => a?.texto && String(a.texto).trim())
    .slice(0, 25)
    .map((a) => {
      const m = porNombre(a.responsable) ?? autor
      return {
        id: crypto.randomUUID(),
        texto: String(a.texto).trim().slice(0, 300),
        responsableId: m?.id ?? null,
        responsableNombre: m?.nombre ?? null,
        marcaId: marcaPorNombre(a.marca)?.id ?? marcaNota?.id ?? null,
        // La fecha la calcula el código a partir de las palabras del plazo; la de la IA es respaldo.
        fecha: resolverPlazo(a.plazo, hoyLima()) ?? (a.fecha && /^\d{4}-\d{2}-\d{2}$/.test(a.fecha) ? a.fecha : null),
        tareaId: null,
      }
    })
  // Las tareas ya creadas antes se conservan.
  const yaCreadas = parseAcciones(row.acciones).filter((a) => a.tareaId)

  const tituloNuevo = !row.titulo || /^(nueva nota|reuni[oó]n)$/i.test(String(row.titulo).trim())
    ? String(out.titulo ?? row.titulo ?? 'Reunión').slice(0, 200)
    : row.titulo

  const { data, error } = await service.from('notas_reuniones').update({
    titulo: tituloNuevo,
    resumen: String(out.resumen).slice(0, 30000),
    acciones: [...yaCreadas, ...acciones],
    plantilla: tpl,
    enhanced_at: new Date().toISOString(),
  }).eq('id', id).select(NOTA_SELECT).single()
  if (error) return { ok: false, error: error.message }
  revalidatePath('/notas-reuniones')
  revalidatePath(`/notas-reuniones/${id}`)
  return { ok: true, nota: rowToNota(data) }
}

export async function guardarAcciones(id: string, acciones: AccionNota[]): Promise<{ ok: true } | Err> {
  const service = createServiceClient() as Service
  const v = await notaVisible(service, id)
  if (!v) return { ok: false, error: 'Nota no encontrada.' }
  const { error } = await service.from('notas_reuniones').update({ acciones: parseAcciones(acciones).slice(0, 40) }).eq('id', id)
  if (error) return { ok: false, error: error.message }
  return { ok: true }
}

/* ====================== Tareas desde la nota ====================== */

export async function crearTareasDesdeNota(id: string, accionIds: string[]): Promise<{ ok: true; creadas: number; acciones: AccionNota[] } | Err> {
  const service = createServiceClient() as Service
  const v = await notaVisible(service, id)
  if (!v) return { ok: false, error: 'Nota no encontrada.' }
  const { me, row } = v
  const acciones = parseAcciones(row.acciones)
  const elegidas = acciones.filter((a) => accionIds.includes(a.id) && !a.tareaId)
  if (elegidas.length === 0) return { ok: false, error: 'No hay tareas nuevas para crear.' }

  /* Cada tarea va a SU marca (categoría = nombre de la marca + marca_slug),
     igual que las tareas normales: así sale en el trabajo de esa marca.
     Pedro 24-sep-2026: "no lo pongas en un apartado de Reuniones". */
  const { data: marcasRows } = await service.from('marcas').select('id, nombre, slug')
  const marcas = (marcasRows ?? []) as { id: string; nombre: string; slug: string }[]
  const colorCache = new Map<string, string>()
  async function colorDe(categoria: string): Promise<string> {
    if (colorCache.has(categoria)) return colorCache.get(categoria)!
    const { data } = await service.from('tareas').select('color').eq('categoria', categoria).limit(1)
    const c = (data?.[0]?.color as string | undefined) ?? '#7170ff'
    colorCache.set(categoria, c)
    return c
  }

  const { data: activos } = await service.from('team_members').select('id').eq('activo', true)
  const validos = new Set(((activos ?? []) as { id: string }[]).map((m) => m.id))
  const { enviarPushAMiembroId } = await import('@/lib/push/send')

  const fechaCorta = (ymd: string) => new Date(ymd + 'T12:00:00-05:00').toLocaleDateString('es-PE', { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
  let creadas = 0
  for (const a of elegidas) {
    const owner = a.responsableId && validos.has(a.responsableId) ? a.responsableId : (row.team_member_id ?? me.id)
    const texto = `${a.texto}${a.fecha ? ` · para el ${fechaCorta(a.fecha)}` : ''}`.slice(0, 600)
    const marca = marcas.find((m) => m.id === (a.marcaId ?? row.marca_id)) ?? null
    const categoria = marca?.nombre ?? 'General'
    const color = await colorDe(categoria)
    const { data: t, error } = await service.from('tareas').insert({
      team_member_id: owner,
      created_by: me.id,
      texto,
      categoria,
      color,
      completada: false,
      focus_lane: null,
      marca_slug: marca?.slug ?? null,
    }).select('id').single()
    if (error) continue
    a.tareaId = t.id as string
    creadas++
    if (owner && owner !== me.id) {
      await enviarPushAMiembroId(owner, {
        title: '📋 Nueva tarea de reunión',
        body: `${texto.slice(0, 110)} — de "${String(row.titulo ?? 'reunión').slice(0, 40)}"`,
        url: '/tareas',
      })
    }
  }

  await service.from('notas_reuniones').update({ acciones }).eq('id', id)
  revalidatePath('/tareas')
  revalidatePath(`/notas-reuniones/${id}`)
  return { ok: true, creadas, acciones }
}

/* ====================== Preguntar a todas las reuniones ====================== */

export async function preguntarAReuniones(pregunta: string, marcaId?: string | null): Promise<{ ok: true; respuesta: string; fuentes: { id: string; titulo: string }[] } | Err> {
  const q = pregunta.trim()
  if (!q) return { ok: false, error: 'Escribe una pregunta.' }
  const service = createServiceClient() as Service
  const me = await yo(service)

  let sel = service.from('notas_reuniones')
    .select('id, titulo, cuerpo, transcript, resumen, created_at, reunion_inicio, marca_id, team_member_id')
    .order('created_at', { ascending: false })
    .limit(40)
  sel = sel.or(me.id ? `privada.eq.false,team_member_id.eq.${me.id}` : 'privada.eq.false')
  if (marcaId && UUID.test(marcaId)) sel = sel.eq('marca_id', marcaId)
  const { data } = await sel
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const notas = ((data ?? []) as any[]).filter((n) => (n.resumen || n.cuerpo || n.transcript))
  if (notas.length === 0) return { ok: false, error: 'Todavía no hay reuniones con notas para consultar.' }

  // Contexto: resumen si existe (compacto); si no, notas + trozo de transcripción.
  let presupuesto = 60000
  const bloques: string[] = []
  const fuentes: { id: string; titulo: string }[] = []
  for (const n of notas) {
    const fecha = new Date(n.reunion_inicio ?? n.created_at).toLocaleDateString('es-PE', { timeZone: TZ, day: 'numeric', month: 'short', year: 'numeric' })
    const cuerpo = n.resumen
      ? String(n.resumen)
      : [n.cuerpo ? `Notas: ${String(n.cuerpo).slice(0, 3000)}` : '', n.transcript ? `Transcripción: ${String(n.transcript).slice(0, 5000)}` : ''].filter(Boolean).join('\n')
    const bloque = `### [${fuentes.length + 1}] ${n.titulo ?? 'Reunión'} (${fecha})\n${cuerpo}`
    if (bloque.length > presupuesto) break
    presupuesto -= bloque.length
    bloques.push(bloque)
    fuentes.push({ id: n.id, titulo: n.titulo ?? 'Reunión' })
  }

  const r = await completarIA({
    sistema: `Respondes preguntas sobre las reuniones de Agencia Distinto usando SOLO las notas dadas. Español peruano, directo. Cita las reuniones con [n] (el número de cada bloque). Si la respuesta no está en las notas, dilo. HOY es ${hoyLima()}. Calendario: ${tablaDias()}.`,
    usuario: `${bloques.join('\n\n')}\n\nPREGUNTA: ${q}`,
    maxTokens: 900,
  })
  if (!r.ok) return r
  return { ok: true, respuesta: r.texto, fuentes }
}

/* ====================== Aviso de reunión por empezar ====================== */

export type ReunionAviso = {
  clave: string
  titulo: string
  inicio: string          // ISO
  meetLink: string | null
  marcaReunionId: string | null
  googleEventId: string | null
  marcaId: string | null
  notaId: string | null
}

/* Reuniones de las próximas 12 h (app + Google) para avisar "¿Transcribimos?".
   Para TODO el equipo (Pedro 24-sep-2026: "las reuniones de la agencia deben
   salirle a todos"). */
export async function reunionesParaAviso(): Promise<ReunionAviso[]> {
  const service = createServiceClient() as Service
  const me = await yo(service)
  if (!me.id) return []

  const ahora = Date.now()
  const hasta = ahora + 12 * 3600_000
  const hoy = hoyLima()
  const out: ReunionAviso[] = []

  try {
    const { data } = await service.from('marca_reuniones')
      .select('id, titulo, fecha_hora, lugar_enlace, estado, marca_id, google_event_id')
      .gte('fecha_hora', new Date(ahora - 3600_000).toISOString())
      .lte('fecha_hora', new Date(hasta).toISOString())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (data ?? []) as any[]) {
      if (r.estado === 'cancelada') continue
      out.push({
        clave: `mr:${r.id}`, titulo: r.titulo ?? 'Reunión', inicio: new Date(r.fecha_hora).toISOString(),
        meetLink: /^https?:\/\//.test(r.lugar_enlace ?? '') ? r.lugar_enlace : null,
        marcaReunionId: r.id, googleEventId: r.google_event_id ?? null, marcaId: r.marca_id ?? null, notaId: null,
      })
    }
  } catch { /* sin tabla */ }

  try {
    const manana = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(hasta))
    const evs = await listCalendarEvents(hoy, manana)
    const ya = new Set(out.map((o) => o.googleEventId).filter(Boolean))
    for (const ev of evs) {
      if (!ev.hora || ev.allDay || ya.has(ev.id)) continue
      // Solo reuniones: con Meet o que se llamen "reunión"/"call"/"revisión". Las grabaciones no.
      if (/^(⭐|📣|🎬)/u.test(ev.summary) || /grabaci|grabar/i.test(ev.summary)) continue
      if (!ev.meetLink && !/reuni|call|revisi|llamada|meet/i.test(ev.summary)) continue
      const inicio = new Date(`${ev.fecha}T${ev.hora}:00-05:00`).getTime()
      if (inicio < ahora - 3600_000 || inicio > hasta) continue
      out.push({
        clave: `gc:${ev.id}`, titulo: ev.summary.replace(/^📌\s*/u, ''), inicio: new Date(inicio).toISOString(),
        meetLink: ev.meetLink, marcaReunionId: null, googleEventId: ev.id, marcaId: null, notaId: null,
      })
    }
  } catch { /* Google opcional */ }

  // ¿Ya tienen nota? (para abrirla directo)
  const mrIds = out.map((o) => o.marcaReunionId).filter(Boolean)
  const gIds = out.map((o) => o.googleEventId).filter(Boolean)
  if (mrIds.length || gIds.length) {
    const { data } = await service.from('notas_reuniones').select('id, marca_reunion_id, google_event_id')
      .or(`privada.eq.false,team_member_id.eq.${me.id}`)
      .or([mrIds.length ? `marca_reunion_id.in.(${mrIds.join(',')})` : '', gIds.length ? `google_event_id.in.(${gIds.map((g) => `"${g}"`).join(',')})` : ''].filter(Boolean).join(','))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const n of (data ?? []) as any[]) {
      const o = out.find((x) => (n.marca_reunion_id && x.marcaReunionId === n.marca_reunion_id) || (n.google_event_id && x.googleEventId === n.google_event_id))
      if (o) o.notaId = n.id
    }
  }

  return out.sort((a, b) => a.inicio.localeCompare(b.inicio))
}
