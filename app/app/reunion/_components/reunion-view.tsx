'use client'

/* REUNIONES del equipo — interfaz tipo Google Meet (Pedro 17-jul, responsive
 * 23-jul-2026). Overlay a PANTALLA COMPLETA (fixed inset-0) para que NO lo
 * apriete el shell de la app y los controles se vean siempre, también en
 * celular. Lobby → grid de video que llena el alto → barra de controles fija.
 * El motor (WebRTC + señalización) vive en usar-llamada.ts. */

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  ArrowLeft, Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff, Phone, Users, X,
} from 'lucide-react'
import { usarLlamada, type Remoto } from './usar-llamada'

function colorDe(nombre: string): string {
  const paleta = ['#7170ff', '#ba41f7', '#14b8a6', '#f59e0b', '#ec4899', '#16a34a', '#0ea5e9', '#ef4444']
  let h = 0
  for (let i = 0; i < nombre.length; i++) h = (h * 31 + nombre.charCodeAt(i)) >>> 0
  return paleta[h % paleta.length]
}
const inicial = (n: string) => (n.trim()[0] ?? '?').toUpperCase()

/* Cuadro de video. Llena su celda del grid (object-cover). El <video> se
   alimenta por ref: un MediaStream no se puede pasar como prop de src. */
function Cuadro({ stream, nombre, silenciado, esYo, sinEspejo, camApagada }: {
  stream: MediaStream | null; nombre: string; silenciado?: boolean; esYo?: boolean; sinEspejo?: boolean; camApagada?: boolean
}) {
  const ref = useRef<HTMLVideoElement | null>(null)
  useEffect(() => {
    if (ref.current && stream && ref.current.srcObject !== stream) ref.current.srcObject = stream
  }, [stream])
  const color = colorDe(nombre)
  const mostrarVideo = stream && !camApagada

  return (
    <div className="relative w-full h-full min-h-0 rounded-xl sm:rounded-2xl overflow-hidden bg-[#1a1d27] ring-1 ring-white/10">
      {/* Mantengo el <video> montado aunque la cámara esté apagada (para no
          perder el stream); solo lo oculto y muestro el avatar encima. */}
      {stream && (
        <video
          ref={ref}
          autoPlay
          playsInline
          muted={esYo}                 /* nunca te escuchas a ti mismo: evita el acople */
          className="w-full h-full object-cover"
          style={{
            ...(esYo && !sinEspejo ? { transform: 'scaleX(-1)' } : {}),  /* espejo (cámara) — NO al compartir pantalla */
            ...(mostrarVideo ? {} : { display: 'none' }),
          }}
        />
      )}
      {!mostrarVideo && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="rounded-full flex items-center justify-center font-extrabold text-white"
            style={{ width: 'clamp(56px, 18vw, 88px)', aspectRatio: '1', background: color, fontSize: 'clamp(22px, 7vw, 34px)' }}>
            {inicial(nombre)}
          </div>
        </div>
      )}
      <div className="absolute left-2 bottom-2 px-2 py-1 rounded-lg text-[12px] font-bold text-white flex items-center gap-1.5"
        style={{ background: 'rgba(0,0,0,0.55)' }}>
        {silenciado && <MicOff className="w-3.5 h-3.5 text-red-400" />}
        {esYo ? 'Tú' : nombre}
      </div>
    </div>
  )
}

/* Botón de control redondo — grande y táctil (bien para el dedo en celular). */
function BotonControl({ onClick, activo, peligro, resaltado, children, label }: {
  onClick: () => void; activo?: boolean; peligro?: boolean; resaltado?: boolean; children: React.ReactNode; label: string
}) {
  const bg = peligro ? '#dc2626' : resaltado ? '#7170ff' : activo ? 'rgba(255,255,255,0.16)' : '#dc2626'
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-full inline-flex items-center justify-center transition-colors active:scale-95 shrink-0"
      style={{ background: bg, color: '#fff', width: 56, height: 56 }}
    >
      {children}
    </button>
  )
}

export function ReunionView({ yoId, nombre }: { yoId: string; nombre: string }) {
  const {
    conectados, remotos, local, enLlamada, micOn, camOn, compartiendo, soportaCompartir, error, invitacion,
    entrar, salir, toggleMic, toggleCam, compartirPantalla, llamarA, setInvitacion,
  } = usarLlamada(yoId, nombre)

  const enSala = conectados.filter((c) => c.enLlamada)
  const otros = conectados.filter((c) => c.id !== yoId)

  /* Columnas del grid según cuántos hay — responsive (Meet-style): en celular
     apila; en pantalla grande reparte en columnas. */
  const total = remotos.length + 1
  const gridCols =
    total === 1 ? 'grid-cols-1'
      : total === 2 ? 'grid-cols-1 sm:grid-cols-2'
        : total <= 4 ? 'grid-cols-2'
          : 'grid-cols-2 lg:grid-cols-3'

  return (
    /* Overlay a pantalla completa: cubre el shell de la app (header incluido)
       para que la reunión ocupe TODO en celular y PC. */
    <main
      className="fixed inset-0 z-50 flex flex-col"
      style={{ height: '100dvh', background: '#0f1117' }}
    >
      {/* Barra superior — compacta, una sola línea en celular */}
      <div className="flex items-center gap-2 px-3 py-2.5 shrink-0" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Link href="/inicio" className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-xl text-[13px] font-bold text-white/80 hover:bg-white/10 transition-colors shrink-0">
          <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Volver</span>
        </Link>
        <div className="font-extrabold text-[14px] sm:text-[15px] text-white inline-flex items-center gap-1.5 min-w-0">
          <Video className="w-4 h-4 shrink-0" /> <span className="truncate">Reunión del equipo</span>
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/60 shrink-0">
          <Users className="w-4 h-4" /> {enSala.length}<span className="hidden sm:inline"> en la sala · {conectados.length} conectados</span>
        </span>
      </div>

      {error && (
        <div className="mx-3 mt-3 px-4 py-3 rounded-xl text-[13px] font-semibold shrink-0" style={{ background: 'rgba(220,38,38,0.15)', color: '#fca5a5' }}>
          {error}
        </div>
      )}

      {!enLlamada ? (
        /* ===== LOBBY ===== */
        <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">¿Listo para entrar?</h1>
              <p className="text-white/60 text-[14px] mt-1">
                Se te pedirá permiso de <strong>cámara</strong> y <strong>micrófono</strong>.
              </p>
              <button
                onClick={entrar}
                className="mt-4 inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl text-white font-bold text-[15px] active:scale-95 transition-transform"
                style={{ background: 'linear-gradient(135deg, #7170ff, #ba41f7)', boxShadow: '0 8px 24px -8px rgba(113,112,255,0.8)' }}
              >
                <Video className="w-5 h-5" /> Unirse a la reunión
              </button>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wider text-white/40 mb-2">
              Equipo conectado · {otros.length}
            </div>
            {otros.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/15 text-center text-white/40 text-[13px] py-8">
                Nadie más está conectado ahora. Puedes entrar y esperarlos.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {otros.map((p) => (
                  <div key={p.id} className="rounded-2xl p-4 flex flex-col items-center gap-2 ring-1 ring-white/10" style={{ background: 'rgba(255,255,255,0.05)' }}>
                    <div className="rounded-full flex items-center justify-center font-extrabold text-white"
                      style={{ width: 52, height: 52, background: colorDe(p.nombre), fontSize: 20 }}>
                      {inicial(p.nombre)}
                    </div>
                    <div className="text-[13px] font-bold text-white truncate max-w-full">{p.nombre}</div>
                    {p.enLlamada ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(22,163,74,0.2)', color: '#4ade80' }}>
                        ● En la sala
                      </span>
                    ) : (
                      <button
                        onClick={() => llamarA(p.id)}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-bold text-white active:scale-95 transition-transform"
                        style={{ background: 'rgba(255,255,255,0.12)' }}
                      >
                        <Phone className="w-3.5 h-3.5" /> Llamar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ===== EN LA LLAMADA ===== */
        <>
          <div className="flex-1 min-h-0 p-2 sm:p-3">
            <div className={`grid ${gridCols} gap-2 sm:gap-3 h-full`} style={{ gridAutoRows: '1fr' }}>
              <Cuadro stream={local} nombre={nombre} esYo silenciado={!micOn} sinEspejo={compartiendo} camApagada={!camOn && !compartiendo} />
              {remotos.map((r: Remoto) => (
                <Cuadro key={r.id} stream={r.stream} nombre={r.nombre} />
              ))}
            </div>
          </div>

          {/* Barra de controles — SIEMPRE visible, táctil, tipo Meet. */}
          <div
            className="flex items-center justify-center gap-3 sm:gap-4 shrink-0"
            style={{ padding: '14px 12px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid rgba(255,255,255,0.08)', background: '#0f1117' }}
          >
            <BotonControl onClick={toggleMic} activo={micOn} label={micOn ? 'Silenciar' : 'Activar micrófono'}>
              {micOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </BotonControl>
            <BotonControl onClick={toggleCam} activo={camOn} label={camOn ? 'Apagar cámara' : 'Encender cámara'}>
              {camOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </BotonControl>
            {/* Compartir pantalla solo se muestra donde el navegador lo soporta
                (compu). En celular la API no existe → no mostramos el botón. */}
            {soportaCompartir && (
              <BotonControl onClick={compartirPantalla} activo resaltado={compartiendo} label={compartiendo ? 'Dejar de compartir' : 'Compartir pantalla'}>
                <MonitorUp className="w-6 h-6" />
              </BotonControl>
            )}
            <BotonControl onClick={salir} peligro label="Salir de la reunión">
              <PhoneOff className="w-6 h-6" />
            </BotonControl>
          </div>
        </>
      )}

      {/* Te están llamando */}
      {invitacion && !enLlamada && (
        <div className="fixed inset-x-0 bottom-0 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 z-[60] p-3 sm:p-0" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <div className="rounded-2xl p-4 shadow-2xl flex items-center gap-3 sm:min-w-[380px]" style={{ background: '#1c1f2b', border: '1px solid rgba(255,255,255,0.12)' }}>
            <div className="rounded-full flex items-center justify-center font-extrabold text-white shrink-0"
              style={{ width: 44, height: 44, background: colorDe(invitacion.nombre) }}>
              {inicial(invitacion.nombre)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[14px] font-extrabold text-white truncate">{invitacion.nombre} te está llamando</div>
              <div className="text-[12px] text-white/50">Reunión del equipo</div>
            </div>
            <button onClick={() => setInvitacion(null)} aria-label="Rechazar"
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 active:scale-95" style={{ background: '#dc2626' }}>
              <X className="w-5 h-5" />
            </button>
            <button onClick={entrar} aria-label="Unirse"
              className="w-11 h-11 rounded-full flex items-center justify-center text-white shrink-0 active:scale-95" style={{ background: '#16a34a' }}>
              <Phone className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
