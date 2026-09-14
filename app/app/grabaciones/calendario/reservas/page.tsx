import Link from 'next/link'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/get-user'
import { getCurrentMemberPermisos } from '@/lib/team/permisos-helper'
import { db, settings } from '@/lib/reservas/server'
export const dynamic = 'force-dynamic'

async function requireDirector() {
  await requireUser()
  const p = await getCurrentMemberPermisos()
  if (p && !['director', 'admin'].includes(p.member.rol_base)) redirect('/inicio')
}
async function save(form: FormData) {
  'use server'
  await requireDirector()
  const number = (key: string, min: number, max: number) => {
    const n = Number(form.get(key))
    if (!Number.isInteger(n) || n < min || n > max) throw new Error('Configuración inválida: ' + key)
    return n
  }
  const start = number('start_hour', 0, 22), end = number('end_hour', 1, 23)
  const weekdays = form.getAll('weekdays').map(Number)
  if (end <= start || !weekdays.length || weekdays.some(n => !Number.isInteger(n) || n < 0 || n > 6)) throw new Error('Revisa los días y horas de atención.')
  const { error } = await db().from('booking_settings').update({
    enabled: form.has('enabled'), start_hour: start, end_hour: end, weekdays,
    duration_min: number('duration_min', 15, 180), notice_hours: number('notice_hours', 1, 720), horizon_days: number('horizon_days', 1, 90),
  }).eq('id', 1)
  if (error) throw new Error('No se guardó la configuración. Intenta nuevamente.')
  revalidatePath('/grabaciones/calendario/reservas')
  redirect('/grabaciones/calendario/reservas?guardado=1')
}
export default async function ReservasAdmin({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  await requireDirector()
  const [config, bookings, sp] = await Promise.all([settings(), db().from('web_bookings').select('id,nombre,email,empresa,starts_at,status,meet_link').order('created_at', { ascending: false }).limit(100), searchParams])
  return <main className="mx-auto max-w-4xl space-y-6 p-6">
    <Link href="/grabaciones/calendario" className="text-sm text-purple-700">← Calendario</Link>
    <h1 className="text-3xl font-semibold">Reservas desde la web</h1>
    <p className="text-sm text-muted-foreground">Disponibilidad en hora de Perú. Las reuniones confirmadas aparecen en el calendario de la app mediante Google. Los cambios y cancelaciones se gestionan en Google Calendar.</p>
    <a href="/reservar/diagnostico" target="_blank" rel="noopener" className="inline-block rounded-xl bg-purple-700 px-5 py-3 text-sm text-white">Abrir calendario público ↗</a>
    {sp.guardado && <p role="status" className="rounded-xl bg-green-50 p-4 text-green-800">Configuración guardada.</p>}
    <form action={save} className="space-y-5 rounded-2xl border bg-white p-6">
      <label className="flex gap-2"><input type="checkbox" name="enabled" defaultChecked={config.enabled} /> Aceptar reservas públicas</label>
      <div className="flex flex-wrap gap-4">{['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'].map((day, i) => <label key={day} className="flex gap-2"><input type="checkbox" name="weekdays" value={i} defaultChecked={config.weekdays.includes(i)} />{day}</label>)}</div>
      <div className="grid gap-4 sm:grid-cols-2">{[
        ['start_hour','Hora de inicio (0–22)',0,22], ['end_hour','Hora de cierre (1–23)',1,23], ['duration_min','Duración en minutos',15,180], ['notice_hours','Anticipación mínima en horas',1,720], ['horizon_days','Días a futuro para reservar',1,90],
      ].map(([key,label,min,max]) => <label key={String(key)} className="text-sm">{label}<input className="mt-1 block w-full rounded-lg border p-2" name={String(key)} type="number" min={Number(min)} max={Number(max)} required defaultValue={Number(config[key as keyof typeof config])} /></label>)}</div>
      <button className="rounded-xl bg-purple-700 px-5 py-3 text-white">Guardar horarios</button>
    </form>
    <section className="space-y-3"><h2 className="text-xl font-semibold">Últimas reservas</h2>
      {bookings.error ? <p>No pudimos cargar las reservas.</p> : !bookings.data?.length ? <p className="text-muted-foreground">Todavía no hay reservas desde la web.</p> : bookings.data.map(row => <article key={row.id} className="rounded-xl border bg-white p-4"><strong>{row.nombre}</strong> · {row.empresa || 'Sin empresa'}<p className="text-sm">{row.email} · {new Date(row.starts_at).toLocaleString('es-PE', { timeZone: 'America/Lima' })}</p><p className="text-sm text-muted-foreground">{({pending:'Pendiente de confirmar con Google',confirmed:'Confirmada',cancelled:'Cancelada',review:'Requiere revisión'} as Record<string,string>)[row.status] || row.status}</p>{row.meet_link?.startsWith('https://meet.google.com/') && <a href={row.meet_link} target="_blank" rel="noopener" className="text-sm text-purple-700">Abrir Meet ↗</a>}</article>)}
    </section>
  </main>
}
