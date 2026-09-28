'use client'
import { useEffect, useRef } from 'react'
import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { crearInterior } from '../_interior-3d'
import { crearPersonaje, animarPersonaje, liberarPersonaje, type Personaje, type PosePersona } from '../_personaje-3d'
import type { AvatarConfig } from '../_avatar'

export type Persona3D = PosePersona & { id: string; nombre: string; avatar: AvatarConfig; emote?: string | null }
type Props = { personas: () => Persona3D[]; caminar: (x: number, y: number) => void; fallar: () => void; orientar: (yaw: number) => void; destino: () => { x: number; y: number } | null }

/** Solo dibuja: la conexión y la captura siguen en el proveedor global. */
export default function Oficina3D(props: Props) {
  const host = useRef<HTMLDivElement>(null), latest = useRef(props)
  useEffect(() => { latest.current = props }, [props])
  useEffect(() => {
    const el = host.current!
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' }) }
    catch { latest.current.fallar(); return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.shadowMap.enabled = true
    renderer.shadowMap.type = T.PCFSoftShadowMap; renderer.toneMapping = T.ACESFilmicToneMapping; renderer.toneMappingExposure = 1
    el.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-label', 'Oficina 3D. Clic en un asiento para caminar y sentarte. WASD: caminar. Arrastra: girar. Rueda: zoom.')
    renderer.domElement.tabIndex = 0
    const scene = new T.Scene(); scene.background = new T.Color('#e9eef1'); scene.fog = new T.Fog('#e9eef1', 50, 95)
    scene.add(new T.HemisphereLight('#f1faff', '#9aa8ad', 2))
    const sun = new T.DirectionalLight('#fff4dd', 2.8); sun.position.set(8, 25, 14); sun.target.position.set(20, 0, 13)
    sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); sun.shadow.normalBias = .025; sun.shadow.radius = 3
    Object.assign(sun.shadow.camera, { left: -29, right: 29, top: 24, bottom: -24, far: 80 }); scene.add(sun, sun.target)
    const camera = new T.PerspectiveCamera(47, 1, .1, 100)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true; controls.enablePan = false; controls.minDistance = 4; controls.maxDistance = 32
    controls.minPolarAngle = .35; controls.maxPolarAngle = Math.PI / 2.4
    const interior = crearInterior(scene)
    const rigs = new Map<string, { rig: Personaje; key: string; tag: T.Sprite; name: string }>()
    function tag(text: string) {
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 88
      const ctx = canvas.getContext('2d')!; ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.beginPath(); ctx.roundRect(0, 0, 512, 88, 30); ctx.fill()
      ctx.fillStyle = '#384b5d'; ctx.font = '600 34px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 44, 480)
      const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: texture, depthTest: false })); sprite.scale.set(2.15, .37, 1); sprite.position.y = 2.17; return sprite
    }
    const remove = (r: { rig: Personaje; tag: T.Sprite }) => { liberarPersonaje(r.rig); r.tag.material.map?.dispose(); r.tag.material.dispose() }
    const targetGeometry = new T.RingGeometry(.30, .37, 40), targetMaterial = new T.MeshBasicMaterial({ color: '#8074cf', side: T.DoubleSide })
    const target = new T.Mesh(targetGeometry, targetMaterial); target.rotation.x = -Math.PI / 2; target.visible = false; scene.add(target)
    const ray = new T.Raycaster(), mouse = new T.Vector2(), plane = new T.Plane(new T.Vector3(0, 1, 0), 0), hit = new T.Vector3()
    let down = { x: 0, y: 0 }
    const pointerDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY } }
    const pointerUp = (e: PointerEvent) => {
      if (e.button !== 0 || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return
      const r = el.getBoundingClientRect(); mouse.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1)
      ray.setFromCamera(mouse, camera)
      const seat = interior.seatAt(ray, latest.current.personas().slice(1))
      if (seat) latest.current.caminar(seat.x, seat.y)
      else if (ray.ray.intersectPlane(plane, hit)) latest.current.caminar(hit.x, hit.z)
    }
    const lost = (e: Event) => { e.preventDefault(); latest.current.fallar() }
    renderer.domElement.addEventListener('pointerdown', pointerDown); renderer.domElement.addEventListener('pointerup', pointerUp); renderer.domElement.addEventListener('webglcontextlost', lost)
    const resize = new ResizeObserver(() => { const w = el.clientWidth, h = el.clientHeight; if (w && h) { camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h) } }); resize.observe(el)
    let raf = 0, last = performance.now(), initialized = false
    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) { last = now; return }
      const dt = Math.min((now - last) / 1000, .05); last = now
      const people = latest.current.personas(), ids = new Set(people.map(p => p.id))
      rigs.forEach((r, id) => { if (!ids.has(id)) { remove(r); rigs.delete(id) } })
      for (const p of people) {
        const key = JSON.stringify(p.avatar), name = `${p.emote ? p.emote + ' ' : ''}${p.nombre}`
        let r = rigs.get(p.id)
        if (r && r.key !== key) { remove(r); rigs.delete(p.id); r = undefined }
        if (!r) { const rig = crearPersonaje(p.avatar), label = tag(name); rig.group.add(label); scene.add(rig.group); r = { rig, key, tag: label, name }; rigs.set(p.id, r) }
        if (r.name !== name) { r.tag.removeFromParent(); r.tag.material.map?.dispose(); r.tag.material.dispose(); r.tag = tag(name); r.rig.group.add(r.tag); r.name = name }
        animarPersonaje(r.rig, p, dt, now / 1000)
      }
      const destination = latest.current.destino(); target.visible = !!destination
      if (destination) target.position.set(destination.x, .045, destination.y)
      if (people[0]) {
        const focus = new T.Vector3(people[0].x, .8, people[0].y)
        if (!initialized) { controls.target.copy(focus); camera.position.copy(focus).add(new T.Vector3(2, 6.5, 8.5)); initialized = true }
        else { const delta = focus.sub(controls.target).multiplyScalar(1 - Math.exp(-dt * 8)); controls.target.add(delta); camera.position.add(delta) }
      }
      controls.update(); latest.current.orientar(controls.getAzimuthalAngle()); renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf); resize.disconnect(); controls.dispose(); interior.dispose(); rigs.forEach(remove)
      targetGeometry.dispose(); targetMaterial.dispose()
      renderer.domElement.removeEventListener('pointerdown', pointerDown); renderer.domElement.removeEventListener('pointerup', pointerUp); renderer.domElement.removeEventListener('webglcontextlost', lost)
      renderer.dispose(); renderer.domElement.remove()
    }
  }, [])
  return <div ref={host} className="absolute inset-0" />
}
