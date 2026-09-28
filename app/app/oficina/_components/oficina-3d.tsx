'use client'

import { useEffect, useRef } from 'react'
import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { MUEBLES, PAREDES, PUERTAS, ZONAS } from '../_mapa'
import type { AvatarConfig, Direccion } from '../_avatar'

export type Persona3D = { id: string; nombre: string; x: number; y: number; dir: Direccion; mov: boolean; sentado: boolean; avatar: AvatarConfig; emote?: string | null }
type Props = { personas: () => Persona3D[]; caminar: (x: number, y: number) => void; fallar: () => void; orientar: (yaw: number) => void }

/** Escena visual: presencia, audio, navegación y colisiones siguen siendo del proveedor. */
export default function Oficina3D(props: Props) {
  const host = useRef<HTMLDivElement>(null)
  const latest = useRef(props)
  useEffect(() => { latest.current = props }, [props])
  useEffect(() => {
    const el = host.current!
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }) }
    catch { latest.current.fallar(); return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5))
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.PCFSoftShadowMap
    renderer.toneMapping = T.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    el.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', 'Oficina 3D. Usa WASD o flechas para caminar, arrastra para girar y la rueda para acercar.')
    renderer.domElement.tabIndex = 0
    const scene = new T.Scene()
    scene.background = new T.Color('#dce5ed')
    scene.fog = new T.Fog('#dce5ed', 55, 110)
    const camera = new T.PerspectiveCamera(48, 1, .1, 150)
    camera.position.set(20, 13, 25)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.enablePan = false
    controls.minDistance = 5; controls.maxDistance = 37
    controls.minPolarAngle = .25; controls.maxPolarAngle = Math.PI / 2.5
    const hemi = new T.HemisphereLight('#e6f3ff', '#9a8a76', 2.4); scene.add(hemi)
    const sun = new T.DirectionalLight('#fff2d9', 3.5)
    sun.position.set(12, 30, 12); sun.castShadow = true
    sun.shadow.mapSize.set(2048, 2048)
    Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 25, bottom: -25, far: 90 })
    sun.shadow.normalBias = .04; sun.target.position.set(20, 0, 13)
    scene.add(sun, sun.target)
    const materials = new Map<string, T.MeshStandardMaterial>()
    function mat(color: string, metalness = 0) {
      const key = color + metalness
      if (!materials.has(key)) materials.set(key, new T.MeshStandardMaterial({ color, roughness: metalness ? .3 : .72, metalness }))
      return materials.get(key)!
    }
    const resources = new Set<T.BufferGeometry | T.Material | T.Texture>()
    function box(parent: T.Object3D, x: number, h: number, z: number, w: number, height: number, depth: number, color: string) {
      const geometry = new T.BoxGeometry(w, height, depth); resources.add(geometry)
      const mesh: T.Mesh<T.BufferGeometry, T.Material> = new T.Mesh(geometry, mat(color)); mesh.position.set(x, h, z)
      mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh); return mesh
    }
    function ball(parent: T.Object3D, x: number, h: number, z: number, r: number, color: string, sy = 1) {
      const geometry = new T.SphereGeometry(r, 12, 10); resources.add(geometry)
      const mesh = new T.Mesh(geometry, mat(color)); mesh.position.set(x, h, z); mesh.scale.y = sy
      mesh.castShadow = true; parent.add(mesh); return mesh
    }
    function label(text: string, width = 3, color = '#222b38') {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96
      const ctx = canvas.getContext('2d')!
      ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.beginPath(); ctx.roundRect(0, 0, 512, 96, 26); ctx.fill()
      ctx.fillStyle = color; ctx.font = '600 36px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(text, 256, 48, 470)
      const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace; resources.add(texture)
      const material = new T.SpriteMaterial({ map: texture, depthTest: false }); resources.add(material)
      const sprite = new T.Sprite(material); sprite.scale.set(width, width * 96 / 512, 1); return sprite
    }
    // Suelo y juntas: la geometría conserva exactamente el mapa de navegación.
    box(scene, 20, -.18, 13, 40, .3, 26, '#d5cec3')
    for (let x = 0; x < 40; x += 2) for (let z = 0; z < 26; z += 2)
      box(scene, x + 1, -.02, z + 1, 1.98, .04, 1.98, (x + z) % 4 ? '#ddd8ce' : '#e7e2d9')
    ZONAS.forEach(zone => {
      box(scene, zone.x + zone.w / 2, .02, zone.y + zone.h / 2, zone.w, .035, zone.h, zone.id === 'lounge' ? '#bc9875' : '#d5d6df')
      const sign = label(zone.nombre, 3.6); sign.position.set(zone.x + zone.w / 2, 3.5, zone.y + .5); scene.add(sign)
    })
    const glass = new T.MeshStandardMaterial({ color: '#b8d9e2', transparent: true, opacity: .18, roughness: .18, depthWrite: false }); resources.add(glass)
    const wallCells = new Set<string>()
    PAREDES.forEach(r => { for (let x = r.x; x < r.x + r.w; x++) for (let z = r.y; z < r.y + r.h; z++) wallCells.add(`${x},${z}`) })
    wallCells.forEach(cell => {
      const [x, z] = cell.split(',').map(Number)
      if (PUERTAS.some(d => x >= d.x && x < d.x + d.w && z >= d.y && z < d.y + d.h)) return
      const north = z === 0
      const vertical = (wallCells.has(`${x},${z - 1}`) || wallCells.has(`${x},${z + 1}`)) && !north
      const panel = box(scene, x + .5, north ? 1.6 : 1.25, z + .5, vertical ? .18 : .96, north ? 3.2 : 2.5, vertical ? .96 : .18, '#ddd8d0')
      if (!north) { panel.material = glass; panel.castShadow = false }
      box(scene, x + .5, .12, z + .5, vertical ? .2 : .96, .24, vertical ? .96 : .2, '#343c44')
      if ((x + z) % 2 === 0) box(scene, x + .5, 1.25, z + .5, .055, 2.5, .2, '#4c555e')
    })
    // Mesas, puestos de trabajo, mobiliario y estudio con escala humana.
    MUEBLES.forEach(m => {
      const g = new T.Group(); g.position.set(m.x + m.w / 2, 0, m.y + m.h / 2); scene.add(g)
      const w = m.w * .88, d = m.h * .88
      switch (m.tipo) {
        case 'alfombra': box(g, 0, .06, 0, w, .025, d, m.color || '#a6a4ba'); break
        case 'mesa': case 'escritorio': case 'recepcion':
          box(g, 0, .82, 0, w, .13, d, '#ad825e')
          for (const x of [-w / 2 + .12, w / 2 - .12]) for (const z of [-d / 2 + .12, d / 2 - .12]) box(g, x, .39, z, .09, .78, .09, '#333c43')
          if (m.tipo !== 'mesa') {
            box(g, 0, 1.25, -d / 4, .75, .48, .07, '#252c38')
            box(g, 0, 1.25, -d / 4 + .041, .68, .4, .01, '#899ceb')
            box(g, 0, .98, -d / 4, .07, .3, .07, '#475569')
            box(g, 0, .91, .18, .5, .025, .19, '#e5e7eb')
            box(g, .4, .91, .18, .09, .035, .12, '#e5e7eb')
          } break
        case 'silla':
          g.rotation.y = { n: Math.PI, s: 0, e: Math.PI / 2, o: -Math.PI / 2 }[m.dir || 's']
          box(g, 0, .48, 0, .58, .14, .58, '#3e4a5e'); box(g, 0, .85, -.25, .58, .65, .12, '#45526b')
          box(g, 0, .23, 0, .08, .45, .08, '#555d65')
          box(g, 0, .06, 0, .65, .06, .08, '#555d65'); box(g, 0, .06, 0, .08, .06, .65, '#555d65'); break
        case 'sofa':
          box(g, 0, .38, 0, w, .55, d, '#798985'); box(g, 0, .82, -d / 2 + .13, w, .72, .26, '#657b77')
          for (const x of [-w / 2 + .12, w / 2 - .12]) box(g, x, .62, 0, .24, .52, d, '#657b77'); break
        case 'planta':
          box(g, 0, .22, 0, .45, .44, .45, '#eee6dc'); box(g, 0, .7, 0, .05, 1, .05, '#785944')
          for (let i = 0; i < 7; i++) { const leaf = ball(g, Math.sin(i * 2.4) * .22, .8 + i * .1, Math.cos(i * 2.4) * .22, .25, i % 2 ? '#4b7852' : '#628661', .45); leaf.rotation.z = i }
          break
        case 'pizarra': case 'tv': case 'fondo':
          box(g, 0, 1.4, 0, w, 1.4, .12, m.tipo === 'tv' ? '#293441' : '#edeae4')
          box(g, 0, 1.4, .075, w * .92, 1.2, .025, m.tipo === 'tv' ? '#879ae3' : '#faf9f5'); break
        case 'estante': case 'cocina':
          box(g, 0, .65, 0, w, 1.3, d, '#c8b49a')
          for (let i = 0; i < Math.max(2, m.w); i++) box(g, -w / 2 + (i + .5) * w / Math.max(2, m.w), .68, d / 2, w / Math.max(2, m.w) - .06, 1.13, .02, '#ede9e1')
          box(g, 0, 1.33, 0, w + .05, .06, d + .05, '#e6e4df'); break
        case 'luz': case 'camara':
          box(g, 0, .8, 0, .055, 1.6, .055, '#343c44'); box(g, 0, .05, 0, .65, .05, .5, '#343c44')
          box(g, 0, 1.65, 0, m.tipo === 'luz' ? .6 : .3, .4, .3, m.tipo === 'luz' ? '#ffefd0' : '#242c38'); break
      }
    })
    const rigs = new Map<string, { group: T.Group; limbs: T.Group[]; config: string; name: string }>()
    function retire(group: T.Group) {
      scene.remove(group)
      group.traverse(object => {
        if (object instanceof T.Mesh) { object.geometry.dispose(); resources.delete(object.geometry) }
        if (object instanceof T.Sprite) {
          if (object.material.map) { object.material.map.dispose(); resources.delete(object.material.map) }
          object.material.dispose(); resources.delete(object.material)
        }
      })
    }
    function human(p: Persona3D) {
      const g = new T.Group(); scene.add(g)
      const skin = p.avatar.piel, shirt = p.avatar.ropa
      const torso = box(g, 0, 1.17, 0, .46, .58, .26, shirt); torso.geometry.dispose(); torso.geometry = new T.CapsuleGeometry(.23, .24, 4, 10); resources.add(torso.geometry)
      ball(g, 0, 1.64, 0, .19, skin, 1.16)
      if (p.avatar.peinado !== 'calvo') ball(g, 0, 1.76, -.015, .197, p.avatar.pelo, .62)
      if (p.avatar.peinado === 'largo' || p.avatar.peinado === 'mono') ball(g, 0, 1.6, -.14, .15, p.avatar.pelo, 1.6)
      ball(g, -.065, 1.67, .173, .017, '#27303b'); ball(g, .065, 1.67, .173, .017, '#27303b')
      ball(g, 0, 1.61, .19, .034, skin)
      if (p.avatar.accesorio === 'lentes') for (const x of [-.075, .075]) box(g, x, 1.67, .19, .115, .065, .025, '#252934')
      const limbs: T.Group[] = []
      for (let i = 0; i < 4; i++) {
        const arm = i < 2, side = i % 2 ? 1 : -1
        const limb = new T.Group(); limb.position.set(side * (arm ? .3 : .13), arm ? 1.37 : .91, 0); g.add(limb); limbs.push(limb)
        const geo = new T.CapsuleGeometry(arm ? .075 : .1, arm ? .37 : .56, 4, 8); resources.add(geo)
        const mesh = new T.Mesh(geo, mat(arm ? shirt : '#354354')); mesh.position.y = arm ? -.23 : -.35; mesh.castShadow = true; limb.add(mesh)
        if (arm) ball(limb, 0, -.5, 0, .072, skin, 1.3)
        else { box(limb, 0, -.82, .07, .2, .18, .34, '#f0eee8'); ball(limb, 0, -.4, .015, .102, '#354354') }
      }
      const tag = label(`${p.emote ? p.emote + ' ' : ''}${p.nombre}`, 2.4); tag.position.y = 2.2; g.add(tag)
      return { group: g, limbs, config: JSON.stringify(p.avatar), name: `${p.emote || ''}${p.nombre}` }
    }
    const ray = new T.Raycaster(), mouse = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3()
    let down = { x: 0, y: 0 }
    const pointerDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY } }
    const pointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const r = el.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1)
      ray.setFromCamera(mouse, camera)
      if (ray.ray.intersectPlane(plane, hit)) latest.current.caminar(hit.x, hit.z)
    }
    renderer.domElement.addEventListener('pointerdown', pointerDown)
    renderer.domElement.addEventListener('pointerup', pointerUp)
    const lost = (e: Event) => { e.preventDefault(); latest.current.fallar() }
    renderer.domElement.addEventListener('webglcontextlost', lost)
    const resize = new ResizeObserver(() => {
      const w = el.clientWidth, h = el.clientHeight
      if (!w || !h) return
      camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h)
    }); resize.observe(el)
    let raf = 0, last = performance.now(), initialized = false
    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) { last = now; return }
      const dt = Math.min((now - last) / 1000, .05); last = now
      const people = latest.current.personas(), ids = new Set(people.map(p => p.id))
      rigs.forEach((r, id) => { if (!ids.has(id)) { retire(r.group); rigs.delete(id) } })
      for (const p of people) {
        let r = rigs.get(p.id)
        if (r && (r.config !== JSON.stringify(p.avatar) || r.name !== `${p.emote || ''}${p.nombre}`)) { retire(r.group); rigs.delete(p.id); r = undefined }
        if (!r) { r = human(p); rigs.set(p.id, r) }
        r.group.position.set(p.x, p.sentado ? -.28 : 0, p.y)
        r.group.rotation.y = { s: 0, n: Math.PI, e: Math.PI / 2, o: -Math.PI / 2 }[p.dir]
        r.limbs.forEach((limb, i) => { limb.rotation.x = p.sentado && i >= 2 ? -Math.PI / 2 : p.mov ? Math.sin(now * .012 + (i % 2 ? Math.PI : 0)) * .48 * (i < 2 ? -1 : 1) : 0 })
      }
      if (people[0]) {
        const target = new T.Vector3(people[0].x, .8, people[0].y)
        const delta = target.clone().sub(controls.target).multiplyScalar(initialized ? Math.min(1, dt * 9) : 1)
        controls.target.add(delta);
        if (!initialized) camera.position.copy(target).add(new T.Vector3(0, 9, 12))
        else camera.position.add(delta)
        initialized = true
      }
      controls.update(); latest.current.orientar(controls.getAzimuthalAngle())
      renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf); resize.disconnect(); controls.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp)
      renderer.domElement.removeEventListener('webglcontextlost', lost)
      resources.forEach(r => r.dispose()); materials.forEach(m => m.dispose())
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [])
  return <div ref={host} className="absolute inset-0" />
}
