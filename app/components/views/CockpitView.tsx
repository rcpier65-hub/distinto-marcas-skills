'use client'

/* CockpitView — la home Linear-style. Refactor del Cockpit del mockup
   pero diseñado para renderizar DENTRO del AppShell (no fullscreen).
   Usa MARCAS_NAV centralizado + mock data inline (mientras migramos
   a Supabase).

   Iconos: usamos lucide-react para los KPIs y headers de bloques.
   Mantiene los SVG inline custom (PlusIcon, EyeIcon, etc.) que tienen
   semántica específica y no quiero romper. */

import { useState } from 'react'
import {
  Calendar, MessageCircle, Grid3x3, DollarSign,
  Video, Palette, Megaphone,
  Sparkles, Clock, AlertTriangle, type LucideIcon,
} from 'lucide-react'
import { MARCAS_NAV, type MarcaNav } from '@/lib/mock-marcas'
import { TrabajoEquipo } from '@/app/inicio/_components/trabajo-equipo'
import type { MiembroTrabajo } from '@/lib/inicio/get-trabajo-equipo'

// ============================================================
// MOCK DATA — luego viene de Supabase
// ============================================================

const COMENTARIOS_PENDIENTES = [
  { id: '1', marcaSlug: 'manrique',      red: 'instagram' as const, autor: 'mariafer.lopez',  texto: 'Hola, atienden niños de 4 años con sospecha de TEA?',         hace: '12 min', categoria: 'consulta' as const,       urgencia: 'high' as const },
  { id: '2', marcaSlug: 'distrifitness', red: 'instagram' as const, autor: 'crossfit_jorge',  texto: 'Cuanto sale el rack squat con polea? Quiero uno YA 💪',       hace: '34 min', categoria: 'interes_compra' as const, urgencia: 'high' as const },
  { id: '3', marcaSlug: 'lozano',        red: 'facebook' as const,  autor: 'Carla Mendoza',   texto: 'Hacen muebles a medida para departamento pequeño?',           hace: '1 h',    categoria: 'consulta' as const,       urgencia: 'medium' as const },
  { id: '4', marcaSlug: 'littlejoe',     red: 'instagram' as const, autor: 'foodie.lima',     texto: 'Tienen delivery a Surquillo? 🍕',                              hace: '1 h',    categoria: 'consulta' as const,       urgencia: 'high' as const },
  { id: '5', marcaSlug: 'kintu',         red: 'instagram' as const, autor: 'wellness_andrea', texto: 'Excelente producto, mi piel mejoró muchísimo ❤️',              hace: '2 h',    categoria: 'agradecimiento' as const, urgencia: 'low' as const },
  { id: '6', marcaSlug: 'novalamps',     red: 'tiktok' as const,    autor: 'arquitecto.luis', texto: 'Qué watts tiene la línea downlight slim?',                    hace: '2 h',    categoria: 'consulta' as const,       urgencia: 'medium' as const },
  { id: '7', marcaSlug: 'manrique',      red: 'facebook' as const,  autor: 'Pedro Sánchez',   texto: 'Llevé a mi hijo y la atención no fue como prometieron.',      hace: '3 h',    categoria: 'queja' as const,          urgencia: 'high' as const },
  { id: '8', marcaSlug: 'warriorsupps',  red: 'instagram' as const, autor: 'gym_master',      texto: '@franco_lift mira esto bro 🔥',                                hace: '4 h',    categoria: 'tag_amigo' as const,      urgencia: 'low' as const },
]

const GRILLAS_SEMANA = [
  { marcaSlug: 'manrique',    publicaciones: 6, estado: 'aprobada' as const,  proximoEnvio: 'Hoy 18:30'      },
  { marcaSlug: 'lozano',      publicaciones: 5, estado: 'aprobada' as const,  proximoEnvio: 'Hoy 18:30'      },
  { marcaSlug: 'kintu',       publicaciones: 4, estado: 'pendiente' as const, proximoEnvio: 'Mañana 18:30'   },
  { marcaSlug: 'lavictoria',  publicaciones: 7, estado: 'borrador' as const,  proximoEnvio: '—'              },
  { marcaSlug: 'littlejoe',   publicaciones: 5, estado: 'aprobada' as const,  proximoEnvio: 'Hoy 18:30'      },
  { marcaSlug: 'oralbeauty',  publicaciones: 4, estado: 'pendiente' as const, proximoEnvio: 'Mañana 18:30'   },
]

const HABITOS_HOY = [
  { id: 'h1', titulo: 'Revisar inbox comentarios', completado: true,  hora: '08:30' },
  { id: 'h2', titulo: 'Daily standup equipo',      completado: true,  hora: '09:00' },
  { id: 'h3', titulo: 'Aprobar grilla del día',    completado: false, hora: '18:00' },
  { id: 'h4', titulo: 'Cerrar cuentas Distinto',   completado: false, hora: '20:30' },
]

const GRABACIONES_PROXIMAS = [
  { fecha: 'Mar 27', hora: '10:00', marca: 'manrique',      tipo: 'Reel TDAH parte 2'      },
  { fecha: 'Mié 28', hora: '15:30', marca: 'lozano',        tipo: 'Carrusel closets'        },
  { fecha: 'Vie 30', hora: '09:00', marca: 'distrifitness', tipo: 'Video equipos box'       },
]

const METRICAS = {
  publicacionesEstaSemana: 47,
  comentariosRespondidos: 124,
  comentariosPendientes: 73,
  grillasEnviadas: 6,
  ingresoMes: 18750,
  ingresoMesPasado: 16200,
}

// ============================================================
// COMPONENT
// ============================================================

/* Tipo de los datos REALES que vienen del page.tsx (server). Antes
   todo era mock; ahora cada bloque del cockpit puede recibir su data
   o caer al mock si no se pasa. */
export type CockpitData = {
  nombreUsuario: string
  puedeVerFinanzas: boolean
  marcasActivasCount: number
  comentariosPendientesTotal: number
  grillasParaEnviarHoy: number
  comentariosVisibles: Array<{
    id: string
    marcaSlug: string
    marcaNombre: string
    marcaColor: string
    /* Emoji de la marca (de marcas.emoji_marca). Sirve como logo en el
       carrusel para que el header no muestre solo un dot. */
    marcaEmoji: string | null
    autor: string
    texto: string
    hace: string
    categoria: string
    red: string
  }>
  grillas: Array<{
    marcaSlug: string
    marcaNombre: string
    marcaColor: string
    publicaciones: number
    estado: string  // 'aprobada' | 'pendiente' | 'borrador'
  }>
  habitos: Array<{
    id: string
    titulo: string
    icono: string
    color: string
    completado: boolean
  }>
  habitosCompletadosHoy: number
  grabacionesProximas: Array<{
    fechaCorta: string  // "MAR 27"
    fechaCompleta: string  // "27 jun"
    hora: string
    tipo: string
    marcaSlug: string
    marcaNombre: string
    marcaColor: string
  }>
  metricas: {
    publicacionesEstaSemana: number
    comentariosRespondidosMes: number
    comentariosPendientes: number
    grillasEnviadasMes: number
    publicacionesEditadasMes: number
  }
  /* Marcas sin grabación coordinada en próximos 30 días — alerta. */
  marcasSinGrabacion?: Array<{ slug: string; nombre: string; color: string }>
  /* Publicaciones en diseño (estado='disenar', portada_lista=false). */
  tareasDiseno?: Array<{
    id: string
    nombre: string
    marcaSlug: string
    marcaNombre: string
    marcaColor: string
    estadoTarea: string
    fechaDiseno: string | null
  }>
  /* Videos marcados para editar hoy desde el módulo editor. */
  videosEditandoHoy?: Array<{
    id: string
    nombre: string
    editorNombre: string | null
    marcaSlug: string
    marcaNombre: string
    marcaColor: string
  }>
  /* Lista de marcas activas (de la DB vía getMarcasNav). Si no viene,
     el componente cae al mock — pero entonces las marcas nuevas creadas
     en /dashboard no se ven en el dashboard del Cockpit. La page real de
     /inicio debe pasarla siempre. */
  marcasNav?: MarcaNav[]
  /* CEO: oculta el panel celeste "Grabaciones próximas" — Pedro ya tiene
     el aviso ámbar y el panel de /grabaciones; en su inicio prefiere ver
     "El trabajo de tu equipo" en su lugar. */
  ocultarGrabacionesProximas?: boolean
}

/* Props:
   - data: datos reales del page server. Si no se pasa, fallback a mock
     legacy para no romper /mockup.
   - nombreUsuario: para personalizar el saludo (legacy)
   - puedeVerFinanzas: legacy
*/
type CockpitViewProps = {
  data?: CockpitData
  nombreUsuario?: string
  puedeVerFinanzas?: boolean
  /* embedded: cuando se renderiza dentro de /inicio. Quita el header
     "Workspace / Cockpit", el saludo "Buen día" y la altura 100vh
     para que fluya dentro del layout de /inicio sin duplicar UI. */
  embedded?: boolean
  /* esCEO (director): Pedro NO quiere ver los bloques "Tareas en diseño"
     ni "Editando hoy" (eso es del equipo); en su lugar ve el carrusel
     "El trabajo de tu equipo" debajo de Comentarios por responder. */
  esCEO?: boolean
  trabajoEquipo?: MiembroTrabajo[]
}

export function CockpitView({ data, nombreUsuario = 'amigo', puedeVerFinanzas = false, embedded = false, esCEO = false, trabajoEquipo }: CockpitViewProps = {}) {
  /* Si recibimos data del page server, usamos esos valores. Si no, mock. */
  const nombreFinal = data?.nombreUsuario ?? nombreUsuario
  const puedeVerFinanzasFinal = data?.puedeVerFinanzas ?? puedeVerFinanzas

  /* Lista canónica de marcas: la real (de DB) si la page la pasó, sino mock.
     marcaMap se usa en TODA la vista para resolver slug → {nombreCorto,
     color, emoji}. Si una marca nueva no está acá no se ve el nombre/color
     en las cards del cockpit. */
  const marcasNav = data?.marcasNav ?? MARCAS_NAV
  const marcaMap = Object.fromEntries(marcasNav.map((m) => [m.slug, m]))
  const ingresoDelta = METRICAS.ingresoMes - METRICAS.ingresoMesPasado
  const ingresoPct = ((ingresoDelta / METRICAS.ingresoMesPasado) * 100).toFixed(1)

  /* Datos efectivos: reales si vienen, mock si no */
  const marcasActivasCount = data?.marcasActivasCount ?? marcasNav.length
  const comentariosPendientesTotal = data?.comentariosPendientesTotal ?? METRICAS.comentariosPendientes
  const grillasParaEnviarHoy = data?.grillasParaEnviarHoy ?? 6
  const comentariosList = data?.comentariosVisibles
  const grillasList = data?.grillas
  const habitosList = data?.habitos
  const habitosCompletadosHoyCount = data?.habitosCompletadosHoy ?? HABITOS_HOY.filter(h => h.completado).length
  const grabacionesList = data?.grabacionesProximas
  const metricasReales = data?.metricas

  /* Wrapper: en modo embedded (dentro de /inicio) no usamos 100vh, no
     renderizamos header del cockpit ni el saludo "Buen día" porque
     /inicio ya tiene su propio header animado. */
  const containerStyle: React.CSSProperties = embedded
    ? { display: 'flex', flexDirection: 'column', gap: 0 }
    : { height: '100vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--mk-bg-base)' }
  const bodyStyle: React.CSSProperties = embedded
    ? { padding: 0 }
    : { flex: 1, overflow: 'auto', padding: '24px 28px 80px' }

  return (
    <div style={containerStyle}>
      {/* HEADER del cockpit — solo en modo standalone (sin /inicio) */}
      {!embedded && (
        <header
          style={{
            height: 'var(--mk-header-height)',
            padding: '0 20px',
            borderBottom: '1px solid var(--mk-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--mk-bg-base)',
            flexShrink: 0,
            position: 'relative',
            zIndex: 5,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--mk-text-sm)' }}>
            <span style={{ color: 'var(--mk-text-tertiary)' }}>Workspace</span>
            <span style={{ color: 'var(--mk-text-quaternary)' }}>/</span>
            <span style={{ color: 'var(--mk-text-primary)', fontWeight: 500 }}>Cockpit</span>
          </div>
          <div style={{ flex: 1 }} />
          <PillSegment options={['Hoy', 'Semana', 'Mes']} active="Hoy" />
          <button className="mk-focusable" style={btnGhostStyle}>
            <PlusIcon /> Nueva publicación
            <span className="mk-kbd" style={{ marginLeft: 4 }}>C</span>
          </button>
          <button className="mk-focusable" style={btnPrimaryStyle}>
            Generar grillas semana
          </button>
        </header>
      )}

      {/* BODY */}
      <div style={bodyStyle}>
        {/* Saludo: solo en modo standalone (en /inicio ya hay saludo bonito) */}
        {!embedded && (
          <div className="mk-anim-slide-up" style={{ marginBottom: 24 }}>
            <h1
              style={{
                fontSize: 'var(--mk-text-2xl)',
                fontWeight: 600,
                letterSpacing: 'var(--mk-tracking-tight)',
                lineHeight: 'var(--mk-leading-tight)',
                color: 'var(--mk-text-primary)',
                margin: 0,
                marginBottom: 4,
              }}
            >
              Buen día, {nombreFinal}
            </h1>
            <p style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)', margin: 0 }}>
              {marcasActivasCount} {marcasActivasCount === 1 ? 'marca activa' : 'marcas activas'}
              {' · '}{comentariosPendientesTotal} {comentariosPendientesTotal === 1 ? 'comentario pendiente' : 'comentarios pendientes'}
              {' · '}{grillasParaEnviarHoy} {grillasParaEnviarHoy === 1 ? 'grilla a enviar hoy' : 'grillas a enviar hoy'}
            </p>
          </div>
        )}

        {/* KPI grid. 3 columnas para users sin permiso finanzas (la card
            Ingresos no se muestra). 4 columnas para Pedro/admin con la
            card de Ingresos secreta (oculta por default, toggle con ojo). */}
        <div
          className="mk-stagger mk-cockpit-kpis"
          style={{
            display: 'grid',
            gridTemplateColumns: puedeVerFinanzasFinal ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
            gap: 1,
            marginBottom: 32,
            background: 'var(--mk-border-subtle)',
            border: '1px solid var(--mk-border-subtle)',
            borderRadius: 'var(--mk-radius-lg)',
            overflow: 'hidden',
          }}
        >
          <Kpi
            label="Publicaciones esta semana"
            value={(metricasReales?.publicacionesEstaSemana ?? METRICAS.publicacionesEstaSemana).toString()}
            delta={`${metricasReales?.publicacionesEditadasMes ?? 0} editadas este mes`}
            deltaPositive={null}
            Icon={Calendar}
            color="#06b6d4"
          />
          <Kpi
            label="Comentarios respondidos"
            value={(metricasReales?.comentariosRespondidosMes ?? METRICAS.comentariosRespondidos).toString()}
            delta={`${metricasReales?.comentariosPendientes ?? METRICAS.comentariosPendientes} pendientes`}
            deltaPositive={null}
            Icon={MessageCircle}
            color="#22c55e"
          />
          <Kpi
            label="Grillas enviadas"
            value={(metricasReales?.grillasEnviadasMes ?? METRICAS.grillasEnviadas).toString()}
            delta="este mes"
            deltaPositive={null}
            Icon={Grid3x3}
            color="#7170ff"
          />
          {puedeVerFinanzasFinal && (
            <KpiSecreto
              label="Ingresos del mes"
              value={`S/ ${(METRICAS.ingresoMes / 1000).toFixed(1)}k`}
              delta={`+${ingresoPct}% vs mes pasado`}
              deltaPositive
              Icon={DollarSign}
              color="#f59e0b"
            />
          )}
        </div>

        {/* === ALERTA: COORDINACIÓN DE GRABACIÓN PENDIENTE === */}
        {data?.marcasSinGrabacion && data.marcasSinGrabacion.length > 0 && (
          <AlertaCoordinacionGrabacion marcas={data.marcasSinGrabacion} />
        )}

        {/* === CARRUSEL: COMENTARIOS POR MARCA === */}
        <section style={{ marginBottom: 24 }}>
          <SectionHeader
            title="Comentarios por responder"
            count={comentariosList?.length ?? COMENTARIOS_PENDIENTES.length}
            actionLabel="Ver todos"
            Icon={MessageCircle}
            color="#22c55e"
          />
          {comentariosList && comentariosList.length === 0 ? (
            <div style={{
              padding: 32, textAlign: 'center', color: 'var(--mk-text-quaternary)',
              fontSize: 14, background: 'var(--mk-bg-elevated)',
              border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-lg)',
            }}>
              No tienes comentarios pendientes 🎉
            </div>
          ) : comentariosList ? (
            <CarruselComentarios comentarios={comentariosList} />
          ) : (
            <div style={{ background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-lg)' }}>
              {COMENTARIOS_PENDIENTES.map((c) => (
                <CommentRow key={c.id} comment={c} marca={marcaMap[c.marcaSlug]} />
              ))}
            </div>
          )}
        </section>

        {/* === EL TRABAJO DE TU EQUIPO (solo CEO) ===
            Va justo debajo de "Comentarios por responder". Mismo contenedor
            que el carrusel de comentarios → scrollea contenido sin arrastrar
            toda la pantalla. */}
        {esCEO && trabajoEquipo && trabajoEquipo.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <TrabajoEquipo miembros={trabajoEquipo} />
          </section>
        )}

        {/* === BLOQUES INFERIORES: Diseño + Editando hoy + Grabaciones ===
            Ocultos para el CEO (ve el carrusel del equipo en su lugar). El
            equipo (CM/admin con métricas) SÍ los ve. */}
        {!esCEO && (
        <div className="mk-cockpit-bloques" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
          {/* Tareas en diseño */}
          <BloqueTrabajo
            title="Tareas en diseño"
            count={data?.tareasDiseno?.length ?? 0}
            actionHref="/diseno"
            actionLabel="Ver todo"
            color="#ec4899"
            Icon={Palette}
          >
            {(!data?.tareasDiseno || data.tareasDiseno.length === 0) ? (
              <EmptyMini text="Sin tareas en diseño" />
            ) : (
              data.tareasDiseno.slice(0, 5).map((t) => (
                <ItemTrabajo
                  key={t.id}
                  href={`/publicaciones/${t.id}`}
                  marcaColor={t.marcaColor}
                  marcaNombre={t.marcaNombre}
                  nombre={t.nombre}
                  meta={subEstadoLabel(t.estadoTarea)}
                />
              ))
            )}
          </BloqueTrabajo>

          {/* Videos editando hoy */}
          <BloqueTrabajo
            title="Editando hoy"
            count={data?.videosEditandoHoy?.length ?? 0}
            actionHref="/editor"
            actionLabel="Ver editor"
            color="#8b5cf6"
            Icon={Video}
          >
            {(!data?.videosEditandoHoy || data.videosEditandoHoy.length === 0) ? (
              <EmptyMini text="Nadie marcó videos para editar hoy" />
            ) : (
              data.videosEditandoHoy.slice(0, 5).map((v) => (
                <ItemTrabajo
                  key={v.id}
                  href={`/publicaciones/${v.id}`}
                  marcaColor={v.marcaColor}
                  marcaNombre={v.marcaNombre}
                  nombre={v.nombre}
                  meta={v.editorNombre ? `Editor: ${v.editorNombre}` : 'Sin editor asignado'}
                />
              ))
            )}
          </BloqueTrabajo>

          {/* Grabaciones pendientes — oculto para el CEO (ve "El trabajo
              de tu equipo" en su lugar). */}
          {!data?.ocultarGrabacionesProximas && (
          <BloqueTrabajo
            title="Grabaciones próximas"
            count={grabacionesList?.length ?? GRABACIONES_PROXIMAS.length}
            actionHref="/grabaciones"
            actionLabel="Calendario"
            color="#06b6d4"
            Icon={Clock}
          >
            {grabacionesList ? (
              grabacionesList.length === 0 ? (
                <EmptyMini text="Sin grabaciones próximas" />
              ) : (
                grabacionesList.slice(0, 5).map((g, i) => (
                  <ItemTrabajo
                    key={i}
                    href="/grabaciones"
                    marcaColor={g.marcaColor}
                    marcaNombre={g.marcaNombre}
                    nombre={g.tipo}
                    meta={`${g.fechaCorta} · ${g.hora}`}
                  />
                ))
              )
            ) : (
              GRABACIONES_PROXIMAS.slice(0, 5).map((g, i) => {
                const m = marcaMap[g.marca]
                return (
                  <ItemTrabajo
                    key={i}
                    href="/grabaciones"
                    marcaColor={m?.color ?? '#737373'}
                    marcaNombre={m?.nombreCorto ?? g.marca}
                    nombre={g.tipo}
                    meta={`${g.fecha} · ${g.hora}`}
                  />
                )
              })
            )}
          </BloqueTrabajo>
          )}
        </div>
        )}

        {/* === GRILLAS A ENVIAR + HÁBITOS DEL DÍA === */}
        <div className="mk-cockpit-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
            <section>
              <SectionHeader
                title="Grillas a enviar"
                count={grillasList ? grillasList.filter((g) => g.estado === 'aprobada').length : GRILLAS_SEMANA.filter((g) => g.estado === 'aprobada').length}
                Icon={Grid3x3}
                color="#7170ff"
              />
              <div style={{ border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-lg)', background: 'var(--mk-bg-elevated)', overflow: 'hidden' }}>
                {grillasList ? (
                  grillasList.length === 0 ? (
                    <div style={{ padding: 16, textAlign: 'center', color: 'var(--mk-text-quaternary)', fontSize: 12 }}>
                      No hay publicaciones esta semana
                    </div>
                  ) : (
                    grillasList.map((g, i) => (
                      <div
                        key={g.marcaSlug}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px',
                          borderBottom: i < grillasList.length - 1 ? '1px solid var(--mk-border-subtle)' : 'none',
                          cursor: 'pointer',
                          transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                      >
                        <span className="mk-dot" style={{ background: g.marcaColor, boxShadow: `0 0 6px ${g.marcaColor}`, width: 6, height: 6 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-primary)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {g.marcaNombre}
                          </div>
                          <div style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>
                            {g.publicaciones} {g.publicaciones === 1 ? 'pub' : 'pubs'} esta semana
                          </div>
                        </div>
                        <StatusBadge estado={g.estado as 'aprobada' | 'pendiente' | 'borrador'} />
                      </div>
                    ))
                  )
                ) : (
                  GRILLAS_SEMANA.map((g, i) => {
                    const m = marcaMap[g.marcaSlug]
                    if (!m) return null
                    return (
                      <div
                        key={g.marcaSlug}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 12px',
                          borderBottom: i < GRILLAS_SEMANA.length - 1 ? '1px solid var(--mk-border-subtle)' : 'none',
                        }}
                      >
                        <span className="mk-dot" style={{ background: m.color, width: 6, height: 6 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-primary)', fontWeight: 500 }}>{m.nombreCorto}</div>
                          <div style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>{g.publicaciones} pubs · {g.proximoEnvio}</div>
                        </div>
                        <StatusBadge estado={g.estado} />
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section>
              <SectionHeader
                title="Hábitos hoy"
                count={habitosList
                  ? `${habitosCompletadosHoyCount}/${habitosList.length}`
                  : `${HABITOS_HOY.filter((h) => h.completado).length}/${HABITOS_HOY.length}`}
                Icon={Sparkles}
                color="#ba41f7"
              />
              <div style={{ border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-lg)', background: 'var(--mk-bg-elevated)', padding: 4 }}>
                {habitosList ? (
                  habitosList.length === 0 ? (
                    <div style={{ padding: 12, textAlign: 'center', color: 'var(--mk-text-quaternary)', fontSize: 12 }}>
                      No tienes hábitos configurados
                    </div>
                  ) : (
                    habitosList.map((h) => (
                      <div
                        key={h.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          width: '100%', padding: '8px 10px',
                          borderRadius: 'var(--mk-radius-md)',
                          textAlign: 'left',
                        }}
                      >
                        <Checkbox checked={h.completado} />
                        <span style={{ fontSize: 14, marginRight: 4 }}>{h.icono}</span>
                        <span style={{ flex: 1, fontSize: 'var(--mk-text-sm)', color: h.completado ? 'var(--mk-text-tertiary)' : 'var(--mk-text-primary)', textDecoration: h.completado ? 'line-through' : 'none' }}>
                          {h.titulo}
                        </span>
                      </div>
                    ))
                  )
                ) : (
                  HABITOS_HOY.map((h) => (
                    <div
                      key={h.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        width: '100%', padding: '8px 10px',
                        borderRadius: 'var(--mk-radius-md)',
                      }}
                    >
                      <Checkbox checked={h.completado} />
                      <span style={{ flex: 1, fontSize: 'var(--mk-text-sm)', color: h.completado ? 'var(--mk-text-tertiary)' : 'var(--mk-text-primary)', textDecoration: h.completado ? 'line-through' : 'none' }}>
                        {h.titulo}
                      </span>
                      <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>{h.hora}</span>
                    </div>
                  ))
                )}
              </div>
            </section>

        </div>
      </div>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

/* AlertaCoordinacionGrabacion: banner amarillo arriba del cockpit
   cuando hay marcas activas sin grabaciones agendadas. Pedro pidió
   que esto sea LA primera cosa que vea para coordinar. */
function AlertaCoordinacionGrabacion({ marcas }: { marcas: NonNullable<CockpitData['marcasSinGrabacion']> }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '14px 18px',
      background: '#fffbeb',
      border: '1px solid #fde68a',
      borderRadius: 12,
      marginBottom: 24,
      boxShadow: '0 1px 2px rgba(245, 158, 11, 0.08)',
    }}>
      <span style={{
        width: 32, height: 32,
        borderRadius: 9,
        background: '#fde68a',
        color: '#92400e',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <AlertTriangle size={18} strokeWidth={2} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>
          Coordinación de grabación pendiente
        </div>
        <div style={{ fontSize: 12.5, color: '#78350f', lineHeight: 1.5 }}>
          Faltan agendar grabaciones para:{' '}
          {marcas.map((m, i) => (
            <span key={m.slug}>
              <a
                href={`/grabaciones?marca=${m.slug}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  color: '#92400e', textDecoration: 'none', fontWeight: 600,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block' }} />
                {m.nombre}
              </a>
              {i < marcas.length - 1 ? ', ' : ''}
            </span>
          ))}
        </div>
      </div>
      <a
        href="/grabaciones"
        style={{
          padding: '6px 12px',
          background: '#92400e',
          color: '#fff',
          fontSize: 12, fontWeight: 500,
          borderRadius: 8,
          textDecoration: 'none',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Agendar →
      </a>
    </div>
  )
}

/* CarruselComentarios: cards horizontales por marca con scroll
   horizontal. Cada card muestra preview de 3 comentarios + "+X más".
   Pedro pidió esto en lugar del stack vertical porque ocupaba mucho
   espacio. */
function CarruselComentarios({ comentarios }: { comentarios: NonNullable<CockpitData['comentariosVisibles']> }) {
  const grupos = new Map<string, { marcaSlug: string; marcaNombre: string; marcaColor: string; marcaEmoji: string | null; items: typeof comentarios }>()
  for (const c of comentarios) {
    const existing = grupos.get(c.marcaSlug) ?? {
      marcaSlug: c.marcaSlug,
      marcaNombre: c.marcaNombre,
      marcaColor: c.marcaColor,
      marcaEmoji: c.marcaEmoji,
      items: [],
    }
    existing.items.push(c)
    grupos.set(c.marcaSlug, existing)
  }
  const ordenados = Array.from(grupos.values()).sort((a, b) => b.items.length - a.items.length)

  return (
    <div
      style={{
        display: 'flex',
        gap: 14,
        overflowX: 'auto',
        paddingBottom: 8,
        scrollSnapType: 'x mandatory',
        scrollbarWidth: 'thin',
      }}
    >
      {ordenados.map((grupo) => {
        const preview = grupo.items.slice(0, 3)
        const restantes = grupo.items.length - preview.length
        return (
          <a
            key={grupo.marcaSlug}
            href={`/comentarios?marca=${grupo.marcaSlug}`}
            style={{
              flexShrink: 0,
              width: 300,
              scrollSnapAlign: 'start',
              background: 'var(--mk-bg-elevated)',
              border: '1px solid var(--mk-border-subtle)',
              borderRadius: 14,
              overflow: 'hidden',
              textDecoration: 'none',
              transition: 'border-color 150ms ease-out, box-shadow 150ms ease-out',
              display: 'flex', flexDirection: 'column',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = grupo.marcaColor
              e.currentTarget.style.boxShadow = `0 8px 20px -8px ${grupo.marcaColor}33`
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--mk-border-subtle)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            {/* Header de la card */}
            <div style={{
              padding: '12px 14px',
              borderBottom: '1px solid var(--mk-border-subtle)',
              display: 'flex', alignItems: 'center', gap: 10,
              background: `linear-gradient(180deg, ${grupo.marcaColor}10, transparent)`,
            }}>
              {/* Logo de la marca: emoji_marca de BD en cuadro tinted.
                  Fallback al dot si la marca no tiene emoji configurado. */}
              {grupo.marcaEmoji ? (
                <span style={{
                  width: 32, height: 32,
                  borderRadius: 9,
                  background: `${grupo.marcaColor}18`,
                  border: `1px solid ${grupo.marcaColor}33`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 17, lineHeight: 1,
                  flexShrink: 0,
                }}>
                  {grupo.marcaEmoji}
                </span>
              ) : (
                <span style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: grupo.marcaColor,
                  boxShadow: `0 0 8px ${grupo.marcaColor}66`,
                  flexShrink: 0,
                }} />
              )}
              <span style={{
                flex: 1,
                fontSize: 14, fontWeight: 600,
                color: '#111827',
                letterSpacing: '-0.01em',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {grupo.marcaNombre}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: grupo.marcaColor,
                fontVariantNumeric: 'tabular-nums',
                background: `${grupo.marcaColor}1a`,
                padding: '2px 8px',
                borderRadius: 999,
              }}>
                {grupo.items.length}
              </span>
            </div>

            {/* Preview de 3 */}
            <div style={{ flex: 1, padding: 4 }}>
              {preview.map((c, i) => (
                <div
                  key={c.id}
                  style={{
                    padding: '8px 10px',
                    borderBottom: i < preview.length - 1 ? '1px solid var(--mk-border-subtle)' : 'none',
                    fontSize: 12.5,
                  }}
                >
                  <div style={{ fontSize: 10.5, color: 'var(--mk-text-tertiary)', marginBottom: 2 }}>
                    @{c.autor} · {c.hace}
                  </div>
                  <div style={{
                    color: '#111827',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.4,
                  }}>
                    {c.texto}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer: + X más */}
            {restantes > 0 && (
              <div style={{
                padding: '8px 14px',
                borderTop: '1px solid var(--mk-border-subtle)',
                background: 'rgba(0, 0, 0, 0.015)',
                fontSize: 11.5, fontWeight: 500,
                color: grupo.marcaColor,
                textAlign: 'center',
              }}>
                + {restantes} más →
              </div>
            )}
          </a>
        )
      })}
    </div>
  )
}

/* BloqueTrabajo: card de un bloque inferior del cockpit (Diseño,
   Editando hoy, Grabaciones). Header con title, count y link a la
   sección completa; body con los items. */
function BloqueTrabajo({
  title, count, actionHref, actionLabel, color, Icon, children,
}: {
  title: string
  count: number
  actionHref: string
  actionLabel: string
  color: string
  Icon?: LucideIcon
  children: React.ReactNode
}) {
  return (
    <section style={{
      background: 'var(--mk-bg-elevated)',
      border: '1px solid var(--mk-border-subtle)',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '12px 14px',
        borderBottom: '1px solid var(--mk-border-subtle)',
        display: 'flex', alignItems: 'center', gap: 10,
        background: `linear-gradient(180deg, ${color}10, transparent)`,
      }}>
        {Icon ? (
          <span style={{
            width: 26, height: 26,
            borderRadius: 7,
            background: `${color}1a`,
            color,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={14} strokeWidth={1.8} />
          </span>
        ) : (
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: color, flexShrink: 0,
          }} />
        )}
        <h3 style={{
          flex: 1, margin: 0,
          fontSize: 13, fontWeight: 600,
          color: '#111827', letterSpacing: '-0.005em',
        }}>
          {title}
        </h3>
        <span style={{
          fontSize: 11, fontWeight: 600,
          color, fontVariantNumeric: 'tabular-nums',
          background: `${color}1a`,
          padding: '2px 7px',
          borderRadius: 999,
        }}>
          {count}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        {children}
      </div>
      <a
        href={actionHref}
        style={{
          padding: '8px 14px',
          borderTop: '1px solid var(--mk-border-subtle)',
          fontSize: 11.5, fontWeight: 500,
          color, textDecoration: 'none',
          background: 'rgba(0, 0, 0, 0.015)',
          textAlign: 'center',
        }}
      >
        {actionLabel} →
      </a>
    </section>
  )
}

function ItemTrabajo({
  href, marcaColor, marcaNombre, nombre, meta,
}: {
  href: string
  marcaColor: string
  marcaNombre: string
  nombre: string
  meta: string
}) {
  return (
    <a
      href={href}
      style={{
        display: 'block',
        padding: '10px 14px',
        borderBottom: '1px solid var(--mk-border-subtle)',
        textDecoration: 'none',
        fontSize: 12.5,
        transition: 'background 100ms ease-out',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div style={{
        color: '#111827', fontWeight: 500,
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        marginBottom: 2,
      }}>
        {nombre}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--mk-text-tertiary)' }}>
        <span style={{ width: 5, height: 5, borderRadius: '50%', background: marcaColor }} />
        <span>{marcaNombre}</span>
        <span>·</span>
        <span>{meta}</span>
      </div>
    </a>
  )
}

function EmptyMini({ text }: { text: string }) {
  return (
    <div style={{
      padding: 20, textAlign: 'center',
      color: 'var(--mk-text-quaternary)',
      fontSize: 12, fontStyle: 'italic',
    }}>
      {text}
    </div>
  )
}

/* Helper para etiquetas de estado_tarea */
function subEstadoLabel(estado: string): string {
  const map: Record<string, string> = {
    sin_empezar: 'Sin empezar',
    en_progreso: 'En progreso',
    listo: 'Listo',
    revisar: 'A revisar',
  }
  return map[estado] ?? estado.replace(/_/g, ' ')
}

/* KpiSecreto: card de ingresos con valor oculto por default. Pedro
   pidió que cuando comparte pantalla con el equipo, los ingresos NO
   sean visibles a primera vista. Por defecto muestra ••••••; al
   hacer clic en el ojo se revela. El toggle es state local (no se
   persiste) — al recargar vuelve a estar oculto. */
function KpiSecreto({ label, value, delta, deltaPositive, Icon, color }: {
  label: string
  value: string
  delta: string
  deltaPositive: boolean | null
  Icon?: LucideIcon
  color?: string
}) {
  const [revealed, setRevealed] = useState(false)
  const deltaColor = deltaPositive === true ? 'var(--mk-success)' : deltaPositive === false ? 'var(--mk-danger)' : 'var(--mk-text-tertiary)'
  return (
    <div
      style={{
        background: 'var(--mk-bg-elevated)',
        padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 6,
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
        position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mk-bg-elevated)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {Icon && (
          <span style={{
            width: 30, height: 30,
            borderRadius: 8,
            background: `${color ?? '#22c55e'}14`,
            color: color ?? '#22c55e',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={16} strokeWidth={1.8} />
          </span>
        )}
        <div className="mk-label" style={{ flex: 1, fontSize: 11, lineHeight: 1.3 }}>{label}</div>
        <button
          onClick={(e) => { e.stopPropagation(); setRevealed((v) => !v) }}
          title={revealed ? 'Ocultar' : 'Revelar — solo tú lo ves'}
          aria-label={revealed ? 'Ocultar ingresos' : 'Mostrar ingresos'}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            display: 'inline-flex',
            alignItems: 'center',
            color: revealed ? 'var(--mk-accent)' : 'var(--mk-text-tertiary)',
            borderRadius: 'var(--mk-radius-sm)',
            transition: 'color var(--mk-dur-fast) var(--mk-ease-out)',
          }}
        >
          {revealed ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      <div
        style={{
          fontSize: 24, fontWeight: 600,
          letterSpacing: 'var(--mk-tracking-tight)',
          color: 'var(--mk-text-primary)',
          fontVariantNumeric: 'tabular-nums', lineHeight: 1.1,
          filter: revealed ? 'none' : 'blur(0px)',
          /* Sin blur — mostramos directamente texto censurado para que
             la sensación sea explícita: nadie debe asumir que detrás hay
             un dato. */
        }}
      >
        {revealed ? value : '••••••'}
      </div>
      <div style={{
        fontSize: 'var(--mk-text-xs)',
        color: revealed ? deltaColor : 'var(--mk-text-quaternary)',
        fontWeight: 500,
      }}>
        {revealed
          ? (
            <>
              {deltaPositive === true && '↑ '}
              {deltaPositive === false && '↓ '}
              {delta}
            </>
          )
          : 'Privado · solo el admin'}
      </div>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M1 7C2.5 4 4.5 2.5 7 2.5C9.5 2.5 11.5 4 13 7C11.5 10 9.5 11.5 7 11.5C4.5 11.5 2.5 10 1 7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="7" cy="7" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <path d="M2.5 2.5L11.5 11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5 4.2C5.6 4 6.3 3.8 7 3.8C9.5 3.8 11.5 5.3 13 7C12.4 8 11.6 8.9 10.7 9.5M8.9 10.6C8.3 10.8 7.7 10.9 7 10.9C4.5 10.9 2.5 9.4 1 7C1.7 5.9 2.6 4.9 3.7 4.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M5.5 7C5.5 6.2 6.2 5.5 7 5.5M8.5 7C8.5 7.8 7.8 8.5 7 8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function Kpi({ label, value, delta, deltaPositive, Icon, color }: {
  label: string
  value: string
  delta: string
  deltaPositive: boolean | null
  Icon?: LucideIcon
  color?: string
}) {
  const deltaColor = deltaPositive === true ? 'var(--mk-success)' : deltaPositive === false ? 'var(--mk-danger)' : 'var(--mk-text-tertiary)'
  const acento = color ?? '#7170ff'
  return (
    <div
      style={{
        background: 'var(--mk-bg-elevated)',
        padding: '16px 18px',
        display: 'flex', flexDirection: 'column', gap: 8,
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
        cursor: 'pointer',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#fafafa' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--mk-bg-elevated)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {Icon && (
          <span style={{
            width: 30, height: 30,
            borderRadius: 8,
            background: `${acento}14`,
            color: acento,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={16} strokeWidth={1.8} />
          </span>
        )}
        <div className="mk-label" style={{ fontSize: 11, lineHeight: 1.3 }}>{label}</div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: 'var(--mk-tracking-tight)', color: 'var(--mk-text-primary)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>
        {value}
      </div>
      <div style={{ fontSize: 'var(--mk-text-xs)', color: deltaColor, fontWeight: 500 }}>
        {deltaPositive === true && '↑ '}
        {deltaPositive === false && '↓ '}
        {delta}
      </div>
    </div>
  )
}

function SectionHeader({ title, count, actionLabel, Icon, color }: {
  title: string
  count: number | string
  actionLabel?: string
  Icon?: LucideIcon
  color?: string
}) {
  const acento = color ?? '#7170ff'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      {Icon && (
        <span style={{ color: acento, display: 'inline-flex' }}>
          <Icon size={16} strokeWidth={2} />
        </span>
      )}
      <h2 style={{ fontSize: 'var(--mk-text-base)', fontWeight: 600, letterSpacing: 'var(--mk-tracking-snug)', color: 'var(--mk-text-primary)', margin: 0 }}>{title}</h2>
      <span style={{
        fontSize: 11, fontWeight: 700,
        color: acento,
        background: `${acento}15`,
        padding: '2px 8px',
        borderRadius: 999,
        fontVariantNumeric: 'tabular-nums',
      }}>{count}</span>
      {actionLabel && (
        <button
          style={{ marginLeft: 'auto', background: 'transparent', border: 'none', color: 'var(--mk-text-tertiary)', fontFamily: 'inherit', fontSize: 'var(--mk-text-xs)', cursor: 'pointer', padding: '2px 4px' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mk-text-primary)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mk-text-tertiary)' }}
        >
          {actionLabel} →
        </button>
      )}
    </div>
  )
}

/* Categorías completas — declaradas explícitamente para soportar todas
   las categorías posibles aunque el mock actual no las use todas. */
type Categoria = 'consulta' | 'interes_compra' | 'agradecimiento' | 'queja' | 'tag_amigo' | 'spam' | 'otro'
type Comentario = Omit<typeof COMENTARIOS_PENDIENTES[number], 'categoria'> & { categoria: Categoria }
type Marca = typeof MARCAS_NAV[number]

const CAT_COLORS: Record<Categoria, string> = {
  consulta: 'var(--mk-info)',
  interes_compra: 'var(--mk-success)',
  agradecimiento: 'var(--mk-accent)',
  queja: 'var(--mk-danger)',
  tag_amigo: 'var(--mk-text-tertiary)',
  spam: 'var(--mk-text-quaternary)',
  otro: 'var(--mk-text-tertiary)',
}
const CAT_LABELS: Record<Categoria, string> = {
  consulta: 'Consulta',
  interes_compra: 'Interés compra',
  agradecimiento: 'Gracias',
  queja: 'Queja',
  tag_amigo: 'Tag',
  spam: 'Spam',
  otro: 'Otro',
}

/* ComentariosAgrupados: vista resumen por marca.
   - Header de cada marca con nombre + count GRANDE a la derecha
   - Solo 3 comentarios de PREVIEW por marca (no todos)
   - Si hay más, "+ X más →" link a /comentarios?marca=slug
   - Marcas ordenadas por cantidad descendente (las que más necesitan
     atención salen primero)
   Pedro pidió esto porque mostrar todos hacía scroll infinito. */
const PREVIEW_POR_MARCA = 3

function ComentariosAgrupados({ comentarios }: { comentarios: NonNullable<CockpitData['comentariosVisibles']> }) {
  const grupos = new Map<string, { marcaSlug: string; marcaNombre: string; marcaColor: string; items: typeof comentarios }>()
  for (const c of comentarios) {
    const existing = grupos.get(c.marcaSlug) ?? {
      marcaSlug: c.marcaSlug,
      marcaNombre: c.marcaNombre,
      marcaColor: c.marcaColor,
      items: [],
    }
    existing.items.push(c)
    grupos.set(c.marcaSlug, existing)
  }
  const ordenados = Array.from(grupos.values()).sort((a, b) => b.items.length - a.items.length)

  return (
    <div>
      {ordenados.map((grupo, idx) => {
        const visibles = grupo.items.slice(0, PREVIEW_POR_MARCA)
        const restantes = grupo.items.length - visibles.length
        return (
          <div key={grupo.marcaSlug} style={{
            borderBottom: idx < ordenados.length - 1 ? '1px solid var(--mk-border-subtle)' : 'none',
          }}>
            {/* Header de marca: nombre + dot a la izquierda, COUNT grande a la derecha */}
            <a
              href={`/comentarios?marca=${grupo.marcaSlug}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 16px',
                background: '#fafafa',
                borderBottom: visibles.length > 0 ? '1px solid var(--mk-border-subtle)' : 'none',
                textDecoration: 'none',
                cursor: 'pointer',
                transition: 'background 150ms ease-out',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#f3f4f6' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fafafa' }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: '50%',
                background: grupo.marcaColor,
                boxShadow: `0 0 8px ${grupo.marcaColor}66`,
                flexShrink: 0,
              }} />
              <span style={{
                flex: 1,
                fontSize: 14, fontWeight: 600,
                color: '#111827',
                letterSpacing: '-0.01em',
              }}>
                {grupo.marcaNombre}
              </span>
              {/* Count grande a la derecha con pill */}
              <span style={{
                display: 'inline-flex', alignItems: 'baseline', gap: 4,
                padding: '3px 10px',
                background: `${grupo.marcaColor}1a`,
                color: grupo.marcaColor,
                borderRadius: 999,
                fontSize: 13, fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {grupo.items.length}
                <span style={{ fontSize: 10, fontWeight: 500, opacity: 0.8 }}>
                  {grupo.items.length === 1 ? 'pendiente' : 'pendientes'}
                </span>
              </span>
            </a>

            {/* Preview de hasta 3 comentarios */}
            {visibles.map((c, i) => (
              <a
                key={c.id}
                href={`/comentarios?marca=${grupo.marcaSlug}`}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 100px 70px',
                  gap: 12,
                  padding: '10px 16px 10px 32px',
                  fontSize: 13.5,
                  alignItems: 'center',
                  borderBottom: i < visibles.length - 1 || restantes > 0 ? '1px solid var(--mk-border-subtle)' : 'none',
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background 100ms ease-out',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: 'var(--mk-text-tertiary)', marginBottom: 1 }}>@{c.autor}</div>
                  <div style={{ color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.texto}
                  </div>
                </div>
                <span style={{ color: 'var(--mk-text-tertiary)', textTransform: 'capitalize', fontSize: 11 }}>
                  {c.categoria.replace(/_/g, ' ')}
                </span>
                <span style={{ color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums', fontSize: 11, textAlign: 'right' }}>
                  {c.hace}
                </span>
              </a>
            ))}

            {/* "+ X más" si hay restantes */}
            {restantes > 0 && (
              <a
                href={`/comentarios?marca=${grupo.marcaSlug}`}
                style={{
                  display: 'block',
                  padding: '8px 16px 10px 32px',
                  fontSize: 12, fontWeight: 500,
                  color: grupo.marcaColor,
                  textDecoration: 'none',
                  cursor: 'pointer',
                  transition: 'background 100ms ease-out',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f9fafb' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                + {restantes} más en {grupo.marcaNombre} →
              </a>
            )}
          </div>
        )
      })}
    </div>
  )
}

/* CommentRowReal: variante que renderiza un comentario REAL de BD
   (la prop ya viene con marcaNombre/marcaColor en lugar de tener que
   resolver desde MARCAS_NAV). */
function CommentRowReal({ comment: c }: { comment: NonNullable<CockpitData['comentariosVisibles']>[number] }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '24px 1fr 140px 100px 80px 60px',
        gap: 12,
        padding: '10px 14px',
        borderBottom: '1px solid var(--mk-border-subtle)',
        fontSize: 'var(--mk-text-sm)',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span className="mk-dot" style={{ background: c.marcaColor, width: 6, height: 6 }} />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)' }}>@{c.autor}</div>
        <div style={{ color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {c.texto}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--mk-text-secondary)' }}>
        <span className="mk-dot" style={{ background: c.marcaColor, width: 5, height: 5 }} />
        {c.marcaNombre}
      </div>
      <span style={{ color: 'var(--mk-text-tertiary)', textTransform: 'capitalize' }}>{c.categoria}</span>
      <span style={{ color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{c.hace}</span>
      <span style={{ color: 'var(--mk-text-quaternary)' }}>→</span>
    </div>
  )
}

function CommentRow({ comment, marca }: { comment: Comentario; marca: Marca | undefined }) {
  if (!marca) return null
  const urgencyColor = comment.urgencia === 'high' ? 'var(--mk-danger)' : comment.urgencia === 'medium' ? 'var(--mk-warning)' : 'var(--mk-text-tertiary)'
  const catColors = CAT_COLORS
  const catLabels = CAT_LABELS
  return (
    <div
      style={{
        display: 'grid', gridTemplateColumns: '24px 1fr 140px 100px 80px 60px',
        gap: 12, alignItems: 'center',
        padding: '0 14px', height: 'var(--mk-row-height)',
        borderBottom: '1px solid var(--mk-border-subtle)',
        cursor: 'pointer',
        transition: 'background var(--mk-dur-fast) var(--mk-ease-out)',
        position: 'relative',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--mk-bg-hover)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <span className="mk-dot" style={{ background: urgencyColor, boxShadow: comment.urgencia === 'high' ? `0 0 6px ${urgencyColor}` : 'none' }} />
      <div style={{ minWidth: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-tertiary)', fontWeight: 500 }}>@{comment.autor}</span>
        <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
          {comment.texto}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <span className="mk-dot" style={{ background: marca.color, width: 6, height: 6 }} />
        <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {marca.nombreCorto}
        </span>
        <span style={{ fontSize: 10, color: 'var(--mk-text-quaternary)', textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)' }}>
          {comment.red === 'instagram' ? 'IG' : comment.red === 'facebook' ? 'FB' : 'TT'}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="mk-dot" style={{ background: catColors[comment.categoria], width: 6, height: 6 }} />
        <span style={{ fontSize: 'var(--mk-text-sm)', color: 'var(--mk-text-secondary)' }}>{catLabels[comment.categoria]}</span>
      </div>
      <span style={{ fontSize: 'var(--mk-text-xs)', color: 'var(--mk-text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>{comment.hace}</span>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
        <button
          style={{ background: 'transparent', border: 'none', color: 'var(--mk-text-tertiary)', cursor: 'pointer', padding: 4, borderRadius: 'var(--mk-radius-sm)', transition: 'all var(--mk-dur-fast) var(--mk-ease-out)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--mk-text-primary)'; e.currentTarget.style.background = 'var(--mk-bg-active)' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--mk-text-tertiary)'; e.currentTarget.style.background = 'transparent' }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M3 7L6 10L11 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  )
}

function PillSegment({ options, active }: { options: string[]; active: string }) {
  return (
    <div style={{ display: 'flex', background: 'var(--mk-bg-elevated)', border: '1px solid var(--mk-border-subtle)', borderRadius: 'var(--mk-radius-md)', padding: 2, gap: 2 }}>
      {options.map((o) => (
        <button
          key={o}
          style={{
            padding: '3px 10px',
            fontSize: 'var(--mk-text-xs)',
            fontFamily: 'inherit',
            background: o === active ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
            color: o === active ? 'var(--mk-text-primary)' : 'var(--mk-text-tertiary)',
            border: 'none',
            borderRadius: 'var(--mk-radius-sm)',
            cursor: 'pointer',
            fontWeight: o === active ? 500 : 400,
            transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
          }}
        >
          {o}
        </button>
      ))}
    </div>
  )
}

function StatusBadge({ estado }: { estado: 'aprobada' | 'pendiente' | 'borrador' }) {
  const config = {
    aprobada:  { color: 'var(--mk-success)',        bg: 'var(--mk-success-bg)',    label: 'Lista' },
    pendiente: { color: 'var(--mk-warning)',        bg: 'var(--mk-warning-bg)',    label: 'Revisar' },
    borrador:  { color: 'var(--mk-text-tertiary)',  bg: 'rgba(255,255,255,0.04)',  label: 'Borrador' },
  }
  const c = config[estado]
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        padding: '2px 7px', fontSize: 10, fontWeight: 500,
        color: c.color, background: c.bg,
        borderRadius: 'var(--mk-radius-sm)',
        textTransform: 'uppercase', letterSpacing: 'var(--mk-tracking-caps)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {c.label}
    </span>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return (
    <span
      style={{
        width: 14, height: 14,
        border: `1px solid ${checked ? 'var(--mk-accent)' : 'var(--mk-border-strong)'}`,
        borderRadius: 3,
        background: checked ? 'var(--mk-accent)' : 'transparent',
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
      }}
    >
      {checked && (
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M2 4.5L4 6.5L7.5 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </span>
  )
}

function PlusIcon() {
  return <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 2V9M2 5.5H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
}

const btnGhostStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 'var(--mk-button-height-lg)', padding: '0 10px',
  background: 'transparent',
  border: '1px solid var(--mk-border-subtle)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'var(--mk-text-secondary)',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
  cursor: 'pointer',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}

const btnPrimaryStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  height: 'var(--mk-button-height-lg)', padding: '0 12px',
  background: 'var(--mk-accent)',
  border: '1px solid var(--mk-accent)',
  borderRadius: 'var(--mk-radius-md)',
  color: 'white',
  fontFamily: 'inherit', fontSize: 'var(--mk-text-sm)', fontWeight: 500,
  cursor: 'pointer',
  boxShadow: '0 0 0 1px rgba(113, 112, 255, 0.20), 0 0 16px rgba(113, 112, 255, 0.20)',
  transition: 'all var(--mk-dur-fast) var(--mk-ease-out)',
}
