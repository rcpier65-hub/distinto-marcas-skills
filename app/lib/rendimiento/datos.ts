import 'server-only'

/* RENDIMIENTO DEL EQUIPO — Pedro 30-sep-2026 (solo él lo ve).
   Arma, para un período (día / semana / mes, horario Lima):
   - Horas registradas por persona, marca y día/hora:
       · cronómetro de tareas (tareas_tiempos) — tiempo real;
       · ediciones de video (inicio → fin de edición), con tope de 6 h por
         video para que una edición que quedó abierta de noche no infle.
   - Entregables: videos editados, diseños terminados, tareas hechas, y si
     se entregaron a tiempo (fecha Lima vs fecha comprometida).
   - Correcciones y flujo desde el registro de actividad (cambios de estado).
   Todo lo que es "duración típica" usa la MEDIANA, no el promedio. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Service = any

export type Periodo = 'dia' | 'semana' | 'mes'
const TOPE_EDICION_S = 6 * 3600
const TZ = 'America/Lima'

/* ===================== Fechas (Lima) ===================== */
export function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
}
function ymdLima(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date(iso))
}
function horaLima(iso: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date(iso))) % 24
}
function sumar(ymd: string, n: number): string {
  const d = new Date(ymd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10)
}
function diaSemana(ymd: string): number { // 1 = lunes … 7 = domingo
  const d = new Date(ymd + 'T12:00:00Z').getUTCDay(); return d === 0 ? 7 : d
}
function inicioIso(ymd: string) { return `${ymd}T00:00:00-05:00` }
function finIso(ymd: string) { return `${ymd}T23:59:59.999-05:00` }

export type Rango = { periodo: Periodo; ref: string; desde: string; hasta: string; dias: string[]; label: string; anterior: string; siguiente: string }

export function calcularRango(periodo: Periodo, ref: string): Rango {
  let desde = ref, hasta = ref
  if (periodo === 'semana') { desde = sumar(ref, 1 - diaSemana(ref)); hasta = sumar(desde, 6) }
  if (periodo === 'mes') {
    desde = ref.slice(0, 8) + '01'
    const [y, m] = ref.split('-').map(Number)
    hasta = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10)
  }
  const dias: string[] = []
  for (let d = desde; d <= hasta; d = sumar(d, 1)) dias.push(d)
  const f = (ymd: string, o: Intl.DateTimeFormatOptions) => new Date(ymd + 'T12:00:00Z').toLocaleDateString('es-PE', { timeZone: 'UTC', ...o })
  const label = periodo === 'dia'
    ? (ref === hoyLima() ? 'Hoy, ' : '') + f(ref, { weekday: 'long', day: 'numeric', month: 'long' })
    : periodo === 'semana'
      ? `${f(desde, { day: 'numeric', month: 'short' })} – ${f(hasta, { day: 'numeric', month: 'short', year: 'numeric' })}`
      : f(ref, { month: 'long', year: 'numeric' })
  const anterior = periodo === 'dia' ? sumar(ref, -1) : periodo === 'semana' ? sumar(desde, -7) : sumar(desde, -1)
  const siguiente = periodo === 'dia' ? sumar(ref, 1) : periodo === 'semana' ? sumar(desde, 7) : sumar(hasta, 1)
  return { periodo, ref, desde, hasta, dias, label, anterior, siguiente }
}

/* ===================== Tipos de salida ===================== */
export type Miembro = { id: string; nombre: string; rol: string | null; horasDia: number; diasLaborales: number[]; costoHora: number | null }
export type MarcaInfo = { slug: string; nombre: string; color: string; fee: number | null }

export type Registro = { miembroId: string; marca: string; dia: string; hora: number; seg: number; tipo: 'tarea' | 'edicion' }
export type Hecho = { miembroId: string | null; marca: string; dia: string; tipo: 'video' | 'diseno' | 'tarea'; aTiempo: boolean | null; minutos: number | null; titulo: string }

export type DatosRendimiento = {
  rango: Rango
  miembros: Miembro[]
  marcas: Record<string, MarcaInfo>   // por nombre
  registros: Registro[]                // del período
  registrosPrevios: Registro[]         // 4 períodos anteriores (tendencia)
  hechos: Hecho[]
  pendientes: Record<string, { tareas: number; vencidas: number; ediciones: number }>
  correcciones: { porMarca: Record<string, { pubs: number; rondas: number }>; total: { pubs: number; rondas: number } }
  aprobacionCliente: { porMarca: Record<string, number[]>; horas: number[] }
  flujo: { etapas: { estado: string; label: string; medianaHoras: number | null; muestras: number; enCola: number; masViejas: { id: string; nombre: string; marca: string; dias: number }[] }[] }
}

const ETAPAS: { estado: string; label: string }[] = [
  { estado: 'idear', label: 'Idea / guion' },
  { estado: 'editar', label: 'Por editar' },
  { estado: 'editando', label: 'Editando' },
  { estado: 'disenar', label: 'Por diseñar' },
  { estado: 'disenando', label: 'Diseñando' },
  { estado: 'aprobar', label: 'En aprobación' },
  { estado: 'programar', label: 'Por programar' },
]

function primerNombre(x: string | null | undefined) { return (x ?? '').trim().split(/\s+/)[0]?.toLowerCase() ?? '' }
export function mediana(xs: number[]): number | null {
  if (!xs.length) return null
  const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

/* La base entrega máx. 1.000 filas por consulta: leemos por páginas. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function todas(armar: () => any, maxPaginas = 30): Promise<{ data: any[] }> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const out: any[] = []
  for (let i = 0; i < maxPaginas; i++) {
    const { data, error } = await armar().range(i * 1000, i * 1000 + 999)
    if (error || !data) break
    out.push(...data)
    if (data.length < 1000) break
  }
  return { data: out }
}

/* ===================== Carga ===================== */
export async function cargarRendimiento(service: Service, rango: Rango): Promise<DatosRendimiento> {
  const largo = rango.dias.length
  const desdePrev = rango.periodo === 'mes' ? sumar(rango.desde, -4 * 30) : sumar(rango.desde, -4 * largo)
  const hoy = hoyLima()

  const [mRes, maRes, edRes, tiemposRes, edicionesRes, disenosRes, tareasRes, pendTRes, pendERes, actRes, aprobRes, wipRes] = await Promise.all([
    service.from('team_members').select('id, nombre, rol_base, editor_legacy_id, horas_dia, dias_laborales, costo_hora').eq('activo', true),
    service.from('marcas').select('id, slug, nombre, color_primario_hex, fee_mensual'),
    service.from('editores').select('id, nombre'),
    todas(() => service.from('tareas_tiempos').select('team_member_id, marca_slug, categoria, inicio, segundos')
      .gte('inicio', inicioIso(desdePrev)).lte('inicio', finIso(rango.hasta)).order('inicio')),
    todas(() => service.from('publicaciones').select('id, nombre, marca_id, editor_id, editor_nombre, iniciado_edicion_at, editado_at, fecha_edicion, fecha_publicacion')
      .not('editado_at', 'is', null).gte('editado_at', inicioIso(desdePrev)).lte('editado_at', finIso(rango.hasta)).order('editado_at')),
    service.from('publicaciones').select('id, nombre, marca_id, disenador_id, disenador_nombre, started_at, diseno_terminado_at, fecha_entrega')
      .eq('es_tarea_diseno', true).not('diseno_terminado_at', 'is', null)
      .gte('diseno_terminado_at', inicioIso(rango.desde)).lte('diseno_terminado_at', finIso(rango.hasta)).limit(1000),
    service.from('tareas').select('texto, team_member_id, marca_slug, categoria, completada_at, fecha_entrega')
      .eq('completada', true).gte('completada_at', inicioIso(rango.desde)).lte('completada_at', finIso(rango.hasta)).limit(3000),
    todas(() => service.from('tareas').select('team_member_id, fecha_entrega').eq('completada', false).order('id')),
    service.from('publicaciones').select('editor_id, editor_nombre').is('editado_at', null).is('archived_at', null).in('estado', ['editar', 'editando']).limit(2000),
    todas(() => service.from('actividad').select('entidad_id, accion, marca_slug, created_at').eq('entidad_tipo', 'publicacion')
      .gte('created_at', inicioIso(sumar(rango.desde, -60))).lte('created_at', finIso(rango.hasta))
      .order('created_at', { ascending: true })),
    service.from('publicaciones').select('id, marca_id, aprobado_cliente_at').not('aprobado_cliente_at', 'is', null)
      .gte('aprobado_cliente_at', inicioIso(rango.desde)).lte('aprobado_cliente_at', finIso(rango.hasta)).limit(1000),
    /* Cola actual: solo lo vigente (con fecha en los últimos 30 días o creado
       hace menos de 60), no el backlog viejo que quedó sin cerrar. */
    todas(() => service.from('publicaciones').select('id, nombre, estado, marca_id, updated_at').is('archived_at', null)
      .in('estado', ETAPAS.map((e) => e.estado))
      .or(`fecha_publicacion.gte.${sumar(hoy, -30)},and(fecha_publicacion.is.null,created_at.gte.${inicioIso(sumar(hoy, -60))})`)
      .order('id')),
  ])

  /* --- Equipo y marcas --- */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filasM = (mRes.data ?? []) as any[]
  const miembros: Miembro[] = filasM.map((m) => ({
    id: m.id, nombre: m.nombre, rol: m.rol_base ?? null,
    horasDia: Number(m.horas_dia ?? 8) || 8,
    diasLaborales: Array.isArray(m.dias_laborales) && m.dias_laborales.length ? m.dias_laborales.map(Number) : [1, 2, 3, 4, 5],
    costoHora: m.costo_hora != null ? Number(m.costo_hora) : null,
  }))
  const porNombre = (n: string | null | undefined) => {
    const k = primerNombre(n); return k ? miembros.find((m) => primerNombre(m.nombre) === k)?.id ?? null : null
  }
  const porLegacy = new Map<string, string>(filasM.filter((m) => m.editor_legacy_id).map((m) => [m.editor_legacy_id, m.id]))
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nombreEditor = new Map<string, string>(((edRes.data ?? []) as any[]).map((e) => [e.id, e.nombre]))
  const editorDe = (id: string | null, nombre: string | null) =>
    (id ? porLegacy.get(id) ?? porNombre(nombreEditor.get(id)) : null) ?? porNombre(nombre)
  const disenadores = miembros.filter((m) => m.rol === 'disenador')
  const disenadorDe = (id: string | null, nombre: string | null) =>
    porNombre(nombre) ?? (id && miembros.some((m) => m.id === id) ? id : null) ?? (disenadores.length === 1 ? disenadores[0].id : null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filasMa = (maRes.data ?? []) as any[]
  const marcaPorId = new Map<string, MarcaInfo>()
  const marcaPorSlug = new Map<string, MarcaInfo>()
  const marcas: Record<string, MarcaInfo> = {}
  for (const m of filasMa) {
    const info: MarcaInfo = { slug: m.slug, nombre: m.slug === 'interno' ? 'Interno' : m.nombre, color: m.color_primario_hex || '#94a3b8', fee: m.fee_mensual != null ? Number(m.fee_mensual) : null }
    marcaPorId.set(m.id, info); marcaPorSlug.set(m.slug, info); marcas[info.nombre] = info
  }
  const marcaNombre = (slug?: string | null, categoria?: string | null, marcaId?: string | null) => {
    if (marcaId && marcaPorId.get(marcaId)) return marcaPorId.get(marcaId)!.nombre
    if (slug && marcaPorSlug.get(slug)) return marcaPorSlug.get(slug)!.nombre
    const c = (categoria ?? '').trim()
    const porNombreMarca = filasMa.find((m) => m.nombre.trim().toLowerCase() === c.toLowerCase())
    if (porNombreMarca) return porNombreMarca.slug === 'interno' ? 'Interno' : porNombreMarca.nombre
    return 'Gestión / interno'
  }
  if (!marcas['Gestión / interno']) marcas['Gestión / interno'] = { slug: 'gestion', nombre: 'Gestión / interno', color: '#94a3b8', fee: null }

  /* --- Horas registradas --- */
  const todos: Registro[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of (tiemposRes.data ?? []) as any[]) {
    if (!t.team_member_id || !t.segundos) continue
    todos.push({ miembroId: t.team_member_id, marca: marcaNombre(t.marca_slug, t.categoria), dia: ymdLima(t.inicio), hora: horaLima(t.inicio), seg: Number(t.segundos), tipo: 'tarea' })
  }
  const hechos: Hecho[] = []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (edicionesRes.data ?? []) as any[]) {
    const quien = editorDe(p.editor_id, p.editor_nombre)
    const dia = ymdLima(p.editado_at)
    const marca = marcaNombre(null, null, p.marca_id)
    let minutos: number | null = null
    if (p.iniciado_edicion_at) {
      const seg = Math.max(0, (new Date(p.editado_at).getTime() - new Date(p.iniciado_edicion_at).getTime()) / 1000)
      minutos = Math.round(seg / 60)
      if (quien && seg > 0) todos.push({ miembroId: quien, marca, dia: ymdLima(p.iniciado_edicion_at), hora: horaLima(p.iniciado_edicion_at), seg: Math.min(seg, TOPE_EDICION_S), tipo: 'edicion' })
    }
    if (dia >= rango.desde && dia <= rango.hasta) {
      const compromiso = (p.fecha_edicion ?? p.fecha_publicacion ?? '').slice(0, 10)
      hechos.push({ miembroId: quien, marca, dia, tipo: 'video', aTiempo: compromiso ? dia <= compromiso : null, minutos, titulo: p.nombre ?? '' })
    }
  }
  const enRango = (r: Registro) => r.dia >= rango.desde && r.dia <= rango.hasta
  const registros = todos.filter(enRango)
  const registrosPrevios = todos.filter((r) => r.dia < rango.desde)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const d of (disenosRes.data ?? []) as any[]) {
    const dia = ymdLima(d.diseno_terminado_at)
    const minutos = d.started_at ? Math.round((new Date(d.diseno_terminado_at).getTime() - new Date(d.started_at).getTime()) / 60000) : null
    hechos.push({ miembroId: disenadorDe(d.disenador_id, d.disenador_nombre), marca: marcaNombre(null, null, d.marca_id), dia, tipo: 'diseno',
      aTiempo: d.fecha_entrega ? dia <= String(d.fecha_entrega).slice(0, 10) : null, minutos, titulo: d.nombre ?? '' })
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of (tareasRes.data ?? []) as any[]) {
    const dia = ymdLima(t.completada_at)
    hechos.push({ miembroId: t.team_member_id ?? null, marca: marcaNombre(t.marca_slug, t.categoria), dia, tipo: 'tarea',
      aTiempo: t.fecha_entrega ? dia <= String(t.fecha_entrega).slice(0, 10) : null, minutos: null, titulo: t.texto ?? '' })
  }

  /* --- Pendientes por persona --- */
  const pendientes: DatosRendimiento['pendientes'] = {}
  const pend = (id: string) => (pendientes[id] ??= { tareas: 0, vencidas: 0, ediciones: 0 })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const t of (pendTRes.data ?? []) as any[]) {
    if (!t.team_member_id) continue
    const p = pend(t.team_member_id); p.tareas++
    if (t.fecha_entrega && String(t.fecha_entrega).slice(0, 10) < hoy) p.vencidas++
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const e of (pendERes.data ?? []) as any[]) {
    const q = editorDe(e.editor_id, e.editor_nombre); if (q) pend(q).ediciones++
  }

  /* --- Actividad: correcciones, aprobación y flujo --- */
  type Ev = { estado: string | null; aprobar: boolean; t: number; marca: string | null }
  const evPorPub = new Map<string, Ev[]>()
  /* El registro de actividad casi nunca trae la marca: la sacamos de la publicación. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const idsAct = [...new Set(((actRes.data ?? []) as any[]).map((a) => a.entidad_id).filter(Boolean))] as string[]
  const marcaDePub = new Map<string, string>()
  for (let i = 0; i < idsAct.length; i += 300) {
    const { data } = await service.from('publicaciones').select('id, marca_id').in('id', idsAct.slice(i, i + 300))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const r of (data ?? []) as any[]) marcaDePub.set(r.id, marcaNombre(null, null, r.marca_id))
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const a of (actRes.data ?? []) as any[]) {
    if (!a.entidad_id) continue
    const m = String(a.accion ?? '').match(/estado a "([a-z_]+)"/)
    const ev: Ev = { estado: m?.[1] ?? null, aprobar: /Mandó a aprobar/.test(a.accion ?? ''), t: new Date(a.created_at).getTime(), marca: a.marca_slug ?? null }
    if (!ev.estado && !ev.aprobar) continue
    const arr = evPorPub.get(a.entidad_id) ?? []; arr.push(ev); evPorPub.set(a.entidad_id, arr)
  }
  const tDesde = new Date(inicioIso(rango.desde)).getTime()
  const tHasta = new Date(finIso(rango.hasta)).getTime()
  const correcciones: DatosRendimiento['correcciones'] = { porMarca: {}, total: { pubs: 0, rondas: 0 } }
  const duraciones: Record<string, number[]> = {}
  for (const [pubId, evs] of evPorPub) {
    let rondas = 0, enviada = false
    const marca = marcaDePub.get(pubId) ?? null
    for (let i = 0; i < evs.length; i++) {
      const e = evs[i]
      const est = e.aprobar ? 'aprobar' : e.estado
      if (est === 'aprobar') enviada = true
      else if (est === 'editar' && enviada && e.t >= tDesde && e.t <= tHasta) { rondas++; enviada = false }
      /* Tiempo en la etapa: hasta el próximo cambio a OTRO estado. Se ignoran
         los saltos de menos de 5 min (cambios en lote / correcciones de clic). */
      const prev = i > 0 ? (evs[i - 1].aprobar ? 'aprobar' : evs[i - 1].estado) : null
      if (est && est !== prev && e.t >= tDesde - 30 * 864e5) {
        const sig = evs.slice(i + 1).find((x) => (x.aprobar ? 'aprobar' : x.estado) !== est)
        if (sig) {
          const h = (sig.t - e.t) / 3600000
          if (h >= 5 / 60 && h < 24 * 60) (duraciones[est] ??= []).push(h)
        }
      }
    }
    const tocoRango = evs.some((e) => e.t >= tDesde && e.t <= tHasta && (e.aprobar || e.estado === 'aprobar'))
    if (tocoRango) {
      const nombre = marca ?? 'Gestión / interno'
      const c = (correcciones.porMarca[nombre] ??= { pubs: 0, rondas: 0 })
      c.pubs++; c.rondas += rondas; correcciones.total.pubs++; correcciones.total.rondas += rondas
    }
  }

  const aprobacionCliente: DatosRendimiento['aprobacionCliente'] = { porMarca: {}, horas: [] }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (aprobRes.data ?? []) as any[]) {
    const evs = evPorPub.get(p.id) ?? []
    const tA = new Date(p.aprobado_cliente_at).getTime()
    const envio = [...evs].reverse().find((e) => (e.aprobar || e.estado === 'aprobar') && e.t <= tA)
    if (!envio) continue
    const h = (tA - envio.t) / 3600000
    if (h < 0 || h > 24 * 30) continue
    const n = marcaNombre(null, null, p.marca_id)
    ;(aprobacionCliente.porMarca[n] ??= []).push(h); aprobacionCliente.horas.push(h)
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const wip = (wipRes.data ?? []) as any[]
  const ahora = Date.now()
  const flujo: DatosRendimiento['flujo'] = {
    etapas: ETAPAS.map((et) => {
      const cola = wip.filter((p) => p.estado === et.estado).map((p) => {
        const evs = evPorPub.get(p.id) ?? []
        const ult = [...evs].reverse().find((e) => e.estado === et.estado || (et.estado === 'aprobar' && e.aprobar))
        const desde = ult?.t ?? new Date(p.updated_at).getTime()
        return { id: p.id as string, nombre: (p.nombre ?? '(sin título)') as string, marca: marcaNombre(null, null, p.marca_id), dias: Math.floor((ahora - desde) / 864e5) }
      }).sort((a, b) => b.dias - a.dias)
      const ds = duraciones[et.estado] ?? []
      return { ...et, medianaHoras: mediana(ds), muestras: ds.length, enCola: cola.length, masViejas: cola.slice(0, 5) }
    }),
  }

  return { rango, miembros, marcas, registros, registrosPrevios, hechos, pendientes, correcciones, aprobacionCliente, flujo }
}

/* Horas disponibles de una persona en un rango (según su horario). */
export function horasDisponibles(m: Miembro, dias: string[]): number {
  return dias.filter((d) => m.diasLaborales.includes(diaSemana(d))).length * m.horasDia
}
