'use client'
import { useEffect, useRef } from 'react'
import * as T from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { crearPersonaje, animarPersonaje, liberarPersonaje } from '../_personaje-3d'
import type { AvatarConfig } from '../_avatar'

export default function AvatarPreview({ avatar }: { avatar: AvatarConfig }) {
  const host = useRef<HTMLDivElement>(null), current = useRef(avatar)
  useEffect(() => { current.current = avatar }, [avatar])
  useEffect(() => {
    const el = host.current!
    let renderer: T.WebGLRenderer
    try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }) }
    catch { el.textContent = 'Vista 3D no disponible en este equipo.'; return }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.toneMapping = T.ACESFilmicToneMapping
    el.appendChild(renderer.domElement); renderer.domElement.setAttribute('aria-label', 'Vista previa 3D de tu avatar. Arrastra para girarlo.'); renderer.domElement.tabIndex = 0
    const scene = new T.Scene(); scene.add(new T.HemisphereLight('#e9f5ff', '#98877b', 2.8))
    const light = new T.DirectionalLight('#fff2df', 2.5); light.position.set(2, 4, 5); scene.add(light)
    const camera = new T.PerspectiveCamera(35, 1, .1, 20); camera.position.set(0, 1.30, 3.5)
    const controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 1.05, 0); controls.enablePan = false; controls.minDistance = 1.15; controls.maxDistance = 4.5
    controls.minPolarAngle = Math.PI / 3; controls.maxPolarAngle = Math.PI * .62; controls.enableDamping = true
    let rig = crearPersonaje(current.current), key = JSON.stringify(current.current); scene.add(rig.group)
    const resize = new ResizeObserver(() => { if (el.clientWidth && el.clientHeight) { renderer.setSize(el.clientWidth, el.clientHeight); camera.aspect = el.clientWidth / el.clientHeight; camera.updateProjectionMatrix() } }); resize.observe(el)
    let raf = 0
    function frame(now: number) {
      raf = requestAnimationFrame(frame)
      if (document.hidden) return
      if (JSON.stringify(current.current) !== key) { liberarPersonaje(rig); rig = crearPersonaje(current.current); scene.add(rig.group); key = JSON.stringify(current.current) }
      animarPersonaje(rig, { x: 0, y: 0, dir: 's', mov: false, sentado: false }, .016, now / 1000)
      controls.update(); renderer.render(scene, camera)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); resize.disconnect(); controls.dispose(); liberarPersonaje(rig); renderer.dispose(); renderer.domElement.remove() }
  }, [])
  return <div ref={host} className="h-72 w-full rounded-3xl bg-gradient-to-b from-slate-100 to-white" />
}
