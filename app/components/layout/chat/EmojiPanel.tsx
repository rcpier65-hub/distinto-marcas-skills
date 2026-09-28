'use client'

/* Panel de emojis del chat (estilo Telegram): pestañas por categoría y
   "Recientes" guardados en este dispositivo. Sin librerías: lista curada con
   lo que más se usa en el equipo. */

import { useState } from 'react'

const ACENTO = '#ba41f7'
const CLAVE_RECIENTES = 'chat-emojis-recientes'

const CATEGORIAS: { id: string; icono: string; nombre: string; emojis: string }[] = [
  { id: 'caras', icono: '😀', nombre: 'Caritas', emojis: '😀 😃 😄 😁 😆 😅 🤣 😂 🙂 😉 😊 😇 🥰 😍 🤩 😘 😗 😚 😋 😛 😜 🤪 😝 🤑 🤗 🤭 🤫 🤔 🤐 🤨 😐 😑 😶 😏 😒 🙄 😬 😮‍💨 🤥 😌 😔 😪 🤤 😴 😷 🤒 🤕 🤢 🤮 🥵 🥶 🥴 😵 🤯 🤠 🥳 🥸 😎 🤓 🧐 😕 😟 🙁 😮 😯 😲 😳 🥺 😦 😧 😨 😰 😥 😢 😭 😱 😖 😣 😞 😓 😩 😫 🥱 😤 😡 😠 🤬 😈 👿 💀 💩 🤡 👻 👽 🤖' },
  { id: 'gestos', icono: '👍', nombre: 'Gestos', emojis: '👍 👎 👌 🤌 🤏 ✌️ 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✋ 🤚 🖐️ 🖖 👋 🤝 🙏 👏 🙌 👐 🤲 💪 🦾 ✍️ 💅 🤳 👀 👁️ 🧠 🫶 🫡 🫠 🫢 🫣 🤷 🤦 🙋 🙆 🙅 💁 🙇 🕺 💃 🏃 🚶' },
  { id: 'corazones', icono: '❤️', nombre: 'Corazones', emojis: '❤️ 🧡 💛 💚 💙 💜 🖤 🤍 🤎 💔 ❤️‍🔥 ❣️ 💕 💞 💓 💗 💖 💘 💝 💟 ♥️ 💯 💢 💥 💫 💦 💨 🔥 ✨ ⭐ 🌟 ⚡ 🎉 🎊' },
  { id: 'trabajo', icono: '💼', nombre: 'Trabajo', emojis: '💼 📅 🗓️ 📆 ⏰ ⏳ ✅ ☑️ ✔️ ❌ ❗ ❓ ⚠️ 🚨 📌 📍 📎 🖇️ ✏️ 📝 📋 📊 📈 📉 💡 🔔 📣 📢 💬 💭 📷 📸 🎥 🎬 🎙️ 🎧 💻 🖥️ 📱 ⌨️ 🖱️ 💾 📁 📂 🗂️ 📦 🚀 🎯 🏆 🥇 💰 💵 💳 🧾 🔑 🔒 🔓 🛠️ ⚙️' },
  { id: 'comida', icono: '🍕', nombre: 'Comida', emojis: '☕ 🍵 🧃 🥤 🍺 🍻 🥂 🍷 🍹 🍕 🍔 🍟 🌭 🥪 🌮 🌯 🥗 🍝 🍜 🍣 🍱 🍗 🍖 🥩 🍳 🥞 🧇 🥐 🍞 🧀 🍎 🍌 🍇 🍓 🍉 🍍 🥑 🍫 🍩 🍪 🎂 🍰 🧁 🍦 🍿' },
  { id: 'naturaleza', icono: '🌿', nombre: 'Naturaleza', emojis: '🌞 🌝 🌚 🌙 ⭐ ☁️ ⛅ 🌧️ ⛈️ 🌈 ❄️ 🌊 🌿 🍀 🌱 🌳 🌴 🌵 🌷 🌹 🌻 🌸 💐 🐶 🐱 🐭 🐰 🦊 🐻 🐼 🐨 🐯 🦁 🐮 🐷 🐸 🐵 🙈 🙉 🙊 🐔 🐧 🐦 🦄 🐝 🦋 🐢 🐍 🐙 🐬 🐳' },
  { id: 'otros', icono: '🎈', nombre: 'Otros', emojis: '🎈 🎁 🎀 🪅 🎮 🕹️ 🎲 🧩 ⚽ 🏀 🏈 ⚾ 🎾 🏐 🏓 🥊 🏋️ 🚗 🚕 🚌 ✈️ 🚀 🏠 🏢 🏖️ 🗺️ 🇵🇪 🏳️ 🏁 ➕ ➖ ✖️ ➗ 🔴 🟠 🟡 🟢 🔵 🟣 ⚫ ⚪ 🔺 🔻 ▶️ ⏸️ ⏹️ 🔁 🔄 🆗 🆕 🆒 🆓' },
]

function leerRecientes(): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(CLAVE_RECIENTES) ?? '[]')
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string').slice(0, 32) : []
  } catch { return [] }
}

export function EmojiPanel({ onElegir }: { onElegir: (emoji: string) => void }) {
  const [recientes, setRecientes] = useState<string[]>(() => (typeof window === 'undefined' ? [] : leerRecientes()))
  const [pestana, setPestana] = useState<string>(() => (recientes.length ? 'recientes' : 'caras'))

  const lista = pestana === 'recientes'
    ? recientes
    : (CATEGORIAS.find((c) => c.id === pestana)?.emojis.split(' ') ?? [])

  function elegir(e: string) {
    onElegir(e)
    const nuevos = [e, ...recientes.filter((x) => x !== e)].slice(0, 32)
    setRecientes(nuevos)
    try { localStorage.setItem(CLAVE_RECIENTES, JSON.stringify(nuevos)) } catch { /* sin storage */ }
  }

  const pestanas = [
    ...(recientes.length ? [{ id: 'recientes', icono: '🕘', nombre: 'Recientes' }] : []),
    ...CATEGORIAS.map(({ id, icono, nombre }) => ({ id, icono, nombre })),
  ]

  return (
    <div style={{ borderTop: '1px solid #f1f1f3', background: '#fff', flexShrink: 0 }}>
      <div style={{ display: 'flex', gap: 2, padding: '6px 8px 0', overflowX: 'auto' }}>
        {pestanas.map((p) => (
          <button
            key={p.id}
            type="button"
            title={p.nombre}
            aria-label={p.nombre}
            onClick={() => setPestana(p.id)}
            style={{
              flexShrink: 0, width: 34, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
              fontSize: 17, lineHeight: 1,
              background: pestana === p.id ? 'rgba(186,65,247,0.12)' : 'transparent',
              boxShadow: pestana === p.id ? `inset 0 -2px 0 ${ACENTO}` : 'none',
            }}
          >
            {p.icono}
          </button>
        ))}
      </div>
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(36px, 1fr))',
          gap: 2, padding: 8, height: 188, overflowY: 'auto', alignContent: 'start',
        }}
      >
        {lista.map((e, i) => (
          <button
            key={`${e}-${i}`}
            type="button"
            onClick={() => elegir(e)}
            aria-label={e}
            style={{ height: 36, border: 'none', background: 'transparent', borderRadius: 8, cursor: 'pointer', fontSize: 22, lineHeight: 1 }}
            onMouseEnter={(ev) => { ev.currentTarget.style.background = '#f4f4f6' }}
            onMouseLeave={(ev) => { ev.currentTarget.style.background = 'transparent' }}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  )
}
