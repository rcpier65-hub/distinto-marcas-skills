import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { MUEBLES, PAREDES, PUERTAS, ZONAS, asientosDe, type Asiento } from './_mapa'

export function crearInterior(scene: T.Scene) {
  const root = new T.Group(); scene.add(root)
  const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>()
  const palette = new Map<string, T.MeshStandardMaterial>()
  const seats: T.Group[] = []
  const material = (color: string, metal = 0) => {
    const key = color + metal
    if (!palette.has(key)) { const m = new T.MeshStandardMaterial({ color, roughness: metal ? .34 : .66, metalness: metal }); palette.set(key, m); materials.add(m) }
    return palette.get(key)!
  }
  function mesh(parent: T.Object3D, geo: T.BufferGeometry, mat: T.Material, x: number, y: number, z: number) {
    geometries.add(geo); const m = new T.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m
  }
  const block = (p: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, radius = .06, metal = 0) =>
    mesh(p, new RoundedBoxGeometry(w, h, d, 2, Math.min(radius, w / 2, h / 2, d / 2)), material(color, metal), x, y, z)
  function ellipsoid(p: T.Object3D, x: number, y: number, z: number, r: number, color: string, sx = 1, sy = 1, sz = 1) {
    const m = mesh(p, new T.SphereGeometry(r, 12, 10), material(color), x, y, z); m.scale.set(sx, sy, sz); return m
  }
  function shape(w: number, d: number, r: number) {
    const s = new T.Shape(), x = -w / 2, y = -d / 2
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r)
    s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d)
    s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r)
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s
  }
  function slab(p: T.Object3D, x: number, y: number, z: number, w: number, d: number, height: number, radius: number, color: string) {
    const g = new T.ExtrudeGeometry(shape(w, d, radius), { depth: height, bevelEnabled: false, curveSegments: 12 }); g.rotateX(-Math.PI / 2)
    return mesh(p, g, material(color), x, y, z)
  }
  function sign(text: string, color: string, width: number) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 160
    const ctx = c.getContext('2d')!; ctx.fillStyle = color; ctx.font = '600 56px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 512, 80, 980)
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; textures.add(t)
    const m = new T.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }); materials.add(m)
    return mesh(root, new T.PlaneGeometry(width, width * 160 / 1024), m, 0, 0, 0)
  }
  slab(root, 20, -.22, 13, 41, 27, .2, 1.1, '#d2dce0')
  slab(root, 20, -.035, 13, 40, 26, .035, .8, '#e9e9e4')
  // Cada área usa un suelo continuo, sin alfombras superpuestas ni parpadeos.
  const floorColors: Record<string, string> = { juntas: '#dfd9ef', estudio: '#d4e3ed', diseno: '#e8dbcf', lounge: '#d5e4dc', gerencia: '#d2dfe8' }
  for (const zone of ZONAS) {
    slab(root, zone.x + zone.w / 2, .006, zone.y + zone.h / 2, zone.w - .25, zone.h - .25, .016, .6, zone.color)
    slab(root, zone.x + zone.w / 2, .023, zone.y + zone.h / 2, zone.w - .46, zone.h - .46, .009, .5, floorColors[zone.id])
    const title = sign(zone.nombre.toLocaleUpperCase('es'), '#526071', Math.min(zone.w - 2, 6))
    title.rotation.x = -Math.PI / 2; title.position.set(zone.x + zone.w / 2, .035, zone.id === 'gerencia' ? zone.y + zone.h - 1.1 : zone.y + 1.1)
  }
  slab(root, 19.5, .004, 7, 12, 12, .02, 1.4, '#e1e6e7')
  const creative = sign('ESTUDIO CREATIVO', '#60717d', 7); creative.rotation.x = -Math.PI / 2; creative.position.set(19.5, .03, 2)
  const glass = new T.MeshPhysicalMaterial({ color: '#b5d8e3', transparent: true, opacity: .13, roughness: .12, metalness: .15, depthWrite: false }); materials.add(glass)
  // Paneles completos con pocos marcos, en lugar de barrotes por casilla.
  for (const wall of PAREDES) {
    const horizontal = wall.w >= wall.h, length = horizontal ? wall.w : wall.h
    let start = -1
    const part = (from: number, to: number) => {
      const len = to - from
      const cx = wall.x + (horizontal ? from + len / 2 : .5), cz = wall.y + (horizontal ? .5 : from + len / 2)
      const w = horizontal ? len : .12, d = horizontal ? .12 : len
      const back = wall.y === 0
      const panel = block(root, cx, 1.4, cz, w, 2.8, d, '#eeefeb', .02)
      if (!back) { panel.material = glass; panel.castShadow = false }
      block(root, cx, .09, cz, w, .18, d + (horizontal ? .03 : 0), '#b9c4c8', .02, .5)
      block(root, cx, 2.78, cz, w, .07, d, '#e4e8e7', .025, .3)
      if (!back) for (const end of [from, to]) block(root, wall.x + (horizontal ? end : .5), 1.4, wall.y + (horizontal ? .5 : end), .055, 2.8, .055, '#bec9ce', .015, .6)
    }
    for (let i = 0; i <= length; i++) {
      const x = wall.x + (horizontal ? i : 0), y = wall.y + (horizontal ? 0 : i)
      const open = i === length || PUERTAS.some(p => x >= p.x && x < p.x + p.w && y >= p.y && y < p.y + p.h)
      if (!open && start < 0) start = i
      if (open && start >= 0) { part(start, i); start = -1 }
    }
  }
  // Líneas luminosas empotradas y aros de luz sin un techo que oculte el mapa.
  for (const [x, z, radius] of [[19.5, 6, 3.3], [19.5, 11, 2.5], [6.5, 4.5, 2.6], [33.5, 21, 2.5]]) {
    const lightMat = new T.MeshStandardMaterial({ color: '#eefbff', emissive: '#bfe5f9', emissiveIntensity: 1.5 }); materials.add(lightMat)
    const ring = mesh(root, new T.TorusGeometry(radius, .035, 6, 60), lightMat, x, 3.5, z); ring.rotation.x = Math.PI / 2; ring.castShadow = false
  }
  for (const m of MUEBLES) {
    const g = new T.Group(); g.position.set(m.x + m.w / 2, 0, m.y + m.h / 2); root.add(g)
    const targets = asientosDe(m)
    if (targets.length) { g.userData.asientos = targets; seats.push(g) }
    const w = m.w - .16, d = m.h - .10
    const monitor = () => {
      block(g, 0, 1.25, -.20, .90, .52, .045, '#323e4d', .025, .4)
      block(g, 0, 1.25, -.172, .84, .46, .009, '#9dafd4', .015)
      block(g, -.20, 1.28, -.163, .30, .022, .006, '#d9e8fb', .004)
      block(g, -.12, 1.20, -.163, .46, .012, .006, '#d9e8fb', .004)
      block(g, 0, .99, -.20, .045, .32, .045, '#b0bdc6', .012, .8)
      slab(g, 0, .864, -.20, .3, .22, .025, .05, '#b0bdc6')
      block(g, -.06, .881, .20, .52, .025, .18, '#f7f8f5', .018)
      block(g, .36, .895, .20, .10, .05, .14, '#f7f8f5', .035)
    }
    switch (m.tipo) {
      case 'mesa': case 'escritorio': case 'recepcion': {
        if (!m.compartido) {
          const coffee = m.tipo === 'mesa' && m.y > 18
          const height = coffee ? .43 : .80
          slab(g, 0, height, 0, w, d, .055, Math.min(w, d) / 2.1, m.color || '#e9dfcf')
          for (const x of [-w * .30, w * .30]) block(g, x, height / 2, 0, .20, height, Math.max(.35, d * .65), '#c6d1d2', .08, .55)
          if (m.tipo === 'recepcion') {
            slab(g, 0, .04, 0, w - .4, d - .15, .69, .35, '#f2f4f0')
            const accent = block(g, 0, .47, d / 2 + .015, w - .7, .025, .025, '#a1b8ea', .01)
            const light = new T.MeshStandardMaterial({ color: '#b0d9f7', emissive: '#a2b4fa', emissiveIntensity: 1 }); materials.add(light); accent.material = light
          }
        }
        if (m.tipo === 'escritorio') monitor()
        break
      }
      case 'silla': {
        g.rotation.y = { n: Math.PI, s: 0, e: Math.PI / 2, o: -Math.PI / 2 }[m.dir || 's']
        const color = m.color || '#729397'
        block(g, 0, .49, 0, .62, .14, .62, color, .065)
        const back = block(g, 0, .88, -.28, .61, .70, .09, color, .045); back.rotation.x = -.12
        block(g, 0, .245, 0, .07, .43, .07, '#bdcbd2', .03, .85)
        for (const side of [-1, 1]) { block(g, side * .33, .68, -.02, .055, .055, .36, '#4e676f', .025); block(g, side * .31, .56, -.15, .035, .22, .035, '#a7bac2', .015, .6) }
        for (let i = 0; i < 5; i++) {
          const a = i * Math.PI * 2 / 5, leg = block(g, Math.sin(a) * .16, .08, Math.cos(a) * .16, .06, .06, .37, '#b4c2c9', .025, .8); leg.rotation.y = a
          ellipsoid(g, Math.sin(a) * .32, .055, Math.cos(a) * .32, .055, '#43535e')
        }
        break
      }
      case 'sofa': {
        const color = m.color || '#859caf', north = m.dir === 'n', backZ = north ? d / 2 - .14 : -d / 2 + .14
        block(g, 0, .27, 0, w, .40, d, color, .18)
        block(g, 0, .76, backZ, w, .76, .30, color, .14)
        for (const side of [-1, 1]) block(g, side * (w / 2 - .19), .60, 0, .38, .48, d, color, .17)
        targets.forEach(a => { block(g, a.x - g.position.x, .48, a.y - g.position.z, .96, .16, .86, color, .075); block(g, a.x - g.position.x, .74, backZ + (north ? -.22 : .22), .91, .50, .18, color, .08) })
        break
      }
      case 'planta': {
        mesh(g, new T.CylinderGeometry(.33, .24, .58, 20), material('#e2dfd5'), 0, .29, 0)
        block(g, 0, 1, 0, .035, 1.1, .035, '#7e705d', .015)
        for (let i = 0; i < 12; i++) { const a = i * 2.4; const leaf = ellipsoid(g, Math.sin(a) * .25, .88 + i * .055, Math.cos(a) * .25, .25, i % 2 ? '#5d8c6b' : '#76977c', 1, .22, .52); leaf.rotation.set(.2, a, .3) }
        break
      }
      case 'cocina': case 'estante': {
        block(g, 0, .5, 0, w, 1, d, '#c8b597', .10)
        slab(g, 0, 1, 0, w + .1, d + .05, .06, .2, '#f5f4ed')
        for (let i = 1; i < m.w; i++) block(g, -w / 2 + i, .49, d / 2 + .008, .016, .88, .01, '#b0a48e', .004)
        block(g, -w * .25, 1.27, 0, .55, .43, .43, '#536270', .06, .7)
        ellipsoid(g, .8, 1.13, .1, .12, '#f7f4e8', 1, 1, 1)
        break
      }
      case 'pizarra': case 'tv': case 'fondo': {
        block(g, 0, 1.38, 0, w, 1.6, .10, m.tipo === 'tv' ? '#38475a' : '#eef0ea', .045)
        if (m.tipo === 'tv') block(g, 0, 1.38, .06, w - .12, 1.46, .01, '#849dbf', .03)
        if (m.tipo === 'pizarra') for (let i = 0; i < 4; i++) block(g, -w / 3 + i * .65, 1.45, .065, .44, .38, .02, ['#cbb9e3', '#accbbf', '#e5cba6', '#adbfdd'][i], .025)
        break
      }
      case 'camara': case 'luz': {
        block(g, 0, .87, 0, .04, 1.74, .04, '#75858e', .015, .6)
        for (let i = 0; i < 3; i++) { const leg = block(g, Math.sin(i * 2.09) * .17, .18, Math.cos(i * 2.09) * .17, .03, .42, .03, '#75858e', .01, .6); leg.rotation.z = .35 }
        if (m.tipo === 'luz') { const disk = mesh(g, new T.CylinderGeometry(.34, .34, .06, 8), material('#f8f4e8'), 0, 1.72, 0); disk.rotation.x = Math.PI / 2 }
        else { block(g, 0, 1.65, 0, .29, .22, .22, '#33424d', .04); ellipsoid(g, 0, 1.65, -.14, .10, '#7895a8', 1, 1, .65) }
        break
      }
    }
  }
  // Marca oficial de la app en la pared del atrio.
  let disposed = false
  new T.TextureLoader().load('/brand/logo-h-color-tight.png', texture => {
    if (disposed) { texture.dispose(); return }
    texture.colorSpace = T.SRGBColorSpace; textures.add(texture)
    const m = new T.MeshBasicMaterial({ map: texture, transparent: true }); materials.add(m)
    const logo = mesh(root, new T.PlaneGeometry(5, 1.22), m, 19.5, 1.95, .58); logo.castShadow = false
  }, undefined, () => {})
  return {
    seats,
    seatAt(ray: T.Raycaster, occupied: Array<{ x: number; y: number }>): Asiento | null {
      const hits = ray.intersectObjects(seats, true)
      if (!hits.length) return null
      let object: T.Object3D | null = hits[0].object
      while (object && !object.userData.asientos) object = object.parent
      const candidates = (object?.userData.asientos || []) as Asiento[]
      return candidates.filter(a => !occupied.some(p => Math.hypot(p.x - a.x, p.y - a.y) < .55))
        .sort((a, b) => Math.hypot(a.x - hits[0].point.x, a.y - hits[0].point.z) - Math.hypot(b.x - hits[0].point.x, b.y - hits[0].point.z))[0] ?? null
    },
    dispose() { disposed = true; geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); root.removeFromParent() },
  }
}
