import { createRoot } from 'react-dom/client'
import { flushSync } from 'react-dom'
import Oficina3D, { type ErrorEscena3D } from '../../app/oficina/_components/oficina-3d'
import { AvisoEscena3D } from '../../app/oficina/_components/aviso-escena-3d'
import { avatarPorNombre } from '../../app/oficina/_avatar'

const host = document.querySelector('#scene')!, output = document.querySelector('pre')!
const root = createRoot(host)
let serial = 0, error: ErrorEscena3D | null = null, recovering = false, compatible = false
const people = [{ id: 'fixture', nombre: 'Prueba local', avatar: avatarPorNombre('Prueba'), x: 19, y: 13, dir: 's' as const, mov: false, sentado: false }]
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))
const check = (ok: unknown, text: string) => { if (!ok) throw new Error(text); output.textContent += `PASS · ${text}\n` }
async function until(predicate: () => unknown) { for (let i = 0; i < 120; i++) { if (predicate()) return; await pause(100) } throw new Error('Tiempo agotado') }
function draw() {
  root.render(error ? <AvisoEscena3D error={error} reintentar={retry} /> : <Oficina3D key={serial} compatible={compatible} personas={() => people} caminar={() => {}} orientar={() => {}} destino={() => null}
    recuperar={value => { recovering = value; document.querySelector('#status')!.textContent = value ? 'Recuperando la vista 3D…' : 'Escena activa' }}
    fallar={value => { error = value; draw() }} />)
}
function retry() { serial++; error = null; recovering = false; compatible = true; document.querySelector('#status')!.textContent = 'Escena activa'; draw() }
async function canvas() { await until(() => host.querySelector('canvas')); await pause(300); return host.querySelector('canvas')! }
async function run() {
  const button = document.querySelector('button')!; button.disabled = true; output.textContent = ''
  try {
    error = null; compatible = false; serial++; draw()
    const first = await canvas(), gl = first.getContext('webgl2')!, ext = gl.getExtension('WEBGL_lose_context')!
    check(gl && !gl.isContextLost(), 'Inicio de escena real con WebGL 2')
    ext.loseContext(); await until(() => recovering)
    check(host.querySelector('canvas') === first && !error, 'Pérdida temporal conserva el canvas para recuperarlo')
    ext.restoreContext(); await until(() => !recovering); await pause(400)
    check(!gl.isContextLost() && !error && host.querySelector('canvas') === first, 'Restauración vuelve a dibujar sin desmontar la escena')
    ext.loseContext(); await until(() => !!error)
    check(error === 'interrumpida' && !!host.querySelector('[role="alert"]'), 'Fallo prolongado ofrece reintentar después de 8 segundos')
    host.querySelector('button')!.click()
    const second = await canvas(), gl2 = second.getContext('webgl2')!
    check(second !== first && !gl2.isContextLost() && gl2.getContextAttributes()?.antialias === false, 'Reintento inicia la oficina 3D con menor carga gráfica')
    flushSync(() => root.render(null)); await pause(100)
    check(gl2.isContextLost(), 'Salir libera el contexto gráfico anterior')
    const original = HTMLCanvasElement.prototype.getContext
    // Simula WebGL deshabilitado solo dentro de este fixture; conserva Canvas2D.
    HTMLCanvasElement.prototype.getContext = function(this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type === 'webgl2') return null
      return Reflect.apply(original, this, [type, ...args])
    } as typeof original
    try { serial++; error = null; draw(); await until(() => !!error) }
    finally { HTMLCanvasElement.prototype.getContext = original }
    check(error === 'no-disponible' && host.textContent?.includes('Configuración → Sistema'), 'WebGL deshabilitado muestra la causa y los pasos para activar gráficos')
    host.querySelector('button')!.click(); const third = await canvas()
    check(!third.getContext('webgl2')!.isContextLost(), 'Reintento recupera la escena cuando WebGL vuelve a estar disponible')
    output.textContent += 'COMPLETADO · 8 pruebas. Sin sesión, micrófono ni datos de usuarios.\n'
  } catch (e) { output.textContent += `FAIL · ${e}\n` }
  finally { button.disabled = false }
}
document.querySelector('button')!.addEventListener('click', run)
