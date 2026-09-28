import * as T from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { normalizarAvatar, type AvatarConfig, type Direccion } from './_avatar'

export type PosePersona = { x: number; y: number; dir: Direccion; mov: boolean; sentado: boolean }
export type Personaje = ReturnType<typeof crearPersonaje>
const angulos = { s: 0, n: Math.PI, e: Math.PI / 2, o: -Math.PI / 2 }

/** Un único modelo articulado para la oficina y la vista previa del editor. */
export function crearPersonaje(avatar: AvatarConfig) {
  const cfg = normalizarAvatar(avatar)
  const group = new T.Group(), cuerpo = new T.Group()
  group.add(cuerpo)
  const materials = new Map<string, T.MeshStandardMaterial>()
  const material = (color: string) => {
    if (!materials.has(color)) materials.set(color, new T.MeshStandardMaterial({ color, roughness: .76 }))
    return materials.get(color)!
  }
  function mesh(parent: T.Object3D, geo: T.BufferGeometry, color: string, x: number, y: number, z: number) {
    const m = new T.Mesh(geo, material(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); return m
  }
  function oval(parent: T.Object3D, x: number, y: number, z: number, r: number, color: string, sx = 1, sy = 1, sz = 1) {
    const m = mesh(parent, new T.SphereGeometry(r, 18, 14), color, x, y, z); m.scale.set(sx, sy, sz); return m
  }
  function rounded(parent: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, color: string, radius = .03) {
    return mesh(parent, new RoundedBoxGeometry(w, h, d, 2, radius), color, x, y, z)
  }
  const female = cfg.cuerpo === 'mujer', male = cfg.cuerpo === 'hombre'
  const shoulder = female ? .205 : male ? .25 : .225
  const waist = female ? .155 : .185, hip = female ? .195 : .175
  // Torso perfilado, cuello y pelvis; sin cilindros rígidos de cuerpo entero.
  const profile = [new T.Vector2(hip, .87), new T.Vector2(waist, 1.03), new T.Vector2(shoulder, 1.30), new T.Vector2(shoulder * .88, 1.39), new T.Vector2(.085, 1.46)]
  const torso = mesh(cuerpo, new T.LatheGeometry(profile, 24), cfg.ropa, 0, 0, 0); torso.scale.z = .65
  rounded(cuerpo, 0, .89, 0, hip * 1.7, .2, .25, cfg.pantalon, .08)
  oval(cuerpo, 0, 1.49, 0, .075, cfg.piel, 1, 1.25, 1)
  const head = new T.Group(); head.position.y = 1.70; cuerpo.add(head)
  const faceW = cfg.rostro === 'redondo' ? 1.10 : cfg.rostro === 'angular' ? .95 : 1
  const faceH = cfg.rostro === 'redondo' ? 1.05 : 1.25
  const skull = oval(head, 0, 0, 0, .155, cfg.piel, faceW, faceH, .92)
  if (cfg.rostro === 'angular') rounded(head, 0, -.08, .005, .25, .16, .21, cfg.piel, .05)
  for (const side of [-1, 1]) {
    oval(head, side * .156 * faceW, -.012, 0, .034, cfg.piel, .55, 1.3, .8)
    oval(head, side * .060, .02, .128, .034, '#fffaf3', 1, .72, .37)
    oval(head, side * .060, .02, .139, .018, cfg.ojos, .84, .95, .4)
    oval(head, side * .060, .02, .146, .008, '#16212a', 1, 1, .6)
    rounded(head, side * .060, .063, .133, .069, .014, .018, cfg.pelo, .007)
  }
  oval(head, 0, -.018, .144, .032, cfg.piel, .60, 1.05, 1)
  rounded(head, 0, -.089, .128, .077, .018, .025, '#a06f64', .008)
  if (cfg.barba !== 'ninguna') oval(head, 0, -.105, .063, .112, cfg.pelo, 1.12, cfg.barba === 'completa' ? .78 : .45, .76)
  if (cfg.accesorio === 'bigote') rounded(head, 0, -.063, .139, .091, .029, .022, cfg.pelo, .01)
  // Siluetas de pelo realmente distintas (cada opción se ve en la escena).
  const cap = () => {
    const hair = mesh(head, new T.SphereGeometry(.164, 20, 12, 0, Math.PI * 2, 0, Math.PI * .51), cfg.pelo, 0, .023, -.01)
    hair.scale.set(faceW, 1.05, 1); return hair
  }
  if (cfg.peinado !== 'calvo' && cfg.peinado !== 'gorra') cap()
  if (cfg.peinado === 'corto') oval(head, -.02, .153, .025, .11, cfg.pelo, 1.35, .52, .9)
  if (cfg.peinado === 'rizado') for (let i = 0; i < 18; i++) {
    const angle = i * 2.4; oval(head, Math.cos(angle) * .12, .10 + (i % 3) * .026, Math.sin(angle) * .12, .058, cfg.pelo)
  }
  if (cfg.peinado === 'largo' || cfg.peinado === 'bob') {
    const len = cfg.peinado === 'largo' ? .30 : .16
    oval(head, 0, -.10, -.11, .14, cfg.pelo, 1.12, len / .14, .6)
    for (const side of [-1, 1]) oval(head, side * .14, cfg.peinado === 'largo' ? -.15 : -.07, -.01, .078, cfg.pelo, .65, len / .078, .78)
  }
  if (cfg.peinado === 'mono') oval(head, 0, .19, -.13, .10, cfg.pelo)
  if (cfg.peinado === 'cola') { oval(head, 0, .02, -.20, .076, cfg.pelo, .85, 2.4, .8); oval(head, 0, .12, -.13, .06, cfg.ropa) }
  if (cfg.peinado === 'gorra') {
    const hat = mesh(head, new T.SphereGeometry(.172, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), '#31455e', 0, .04, -.01)
    hat.scale.y = .84; rounded(head, 0, .052, .16, .26, .025, .21, '#31455e', .01)
  }
  if (cfg.accesorio === 'lentes') {
    for (const side of [-1, 1]) {
      const ring = mesh(head, new T.TorusGeometry(.041, .006, 6, 20), '#283744', side * .060, .02, .151); ring.scale.set(1.15, .82, 1)
    }
    rounded(head, 0, .025, .153, .032, .009, .008, '#283744', .004)
  }
  if (cfg.accesorio === 'audifonos') {
    const band = mesh(head, new T.TorusGeometry(.18, .013, 8, 22, Math.PI), '#253446', 0, .018, -.005)
    for (const side of [-1, 1]) oval(head, side * .18, 0, 0, .056, '#394a64', .45, 1.35, 1)
    band.rotation.z = 0
  }
  if (cfg.vestimenta !== 'camiseta') {
    rounded(cuerpo, 0, 1.18, .14, .022, .43, .014, cfg.vestimenta === 'camisa' ? '#f0e9dd' : '#273445', .006)
    for (const side of [-1, 1]) {
      const lapel = rounded(cuerpo, side * .07, 1.37, .12, .10, .16, .026, cfg.vestimenta === 'camisa' ? '#f4efe7' : cfg.ropa, .01)
      lapel.rotation.z = side * -.45
    }
    if (cfg.vestimenta === 'camisa') for (let y = 1.02; y < 1.35; y += .09) oval(cuerpo, 0, y, .154, .012, '#f4efe7')
  }
  // Cadera y rodilla, hombro y codo. Las articulaciones doblan al sentarse.
  const piernas: Array<{ hip: T.Group; knee: T.Group; ankle: T.Group }> = []
  const brazos: Array<{ shoulder: T.Group; elbow: T.Group }> = []
  for (const side of [-1, 1]) {
    const joint = new T.Group(); joint.position.set(side * .112, .95, 0); cuerpo.add(joint)
    mesh(joint, new T.CapsuleGeometry(.088, .26, 4, 12), cfg.pantalon, 0, -.215, 0)
    const knee = new T.Group(); knee.position.y = -.43; joint.add(knee)
    oval(knee, 0, 0, 0, .084, cfg.pantalon)
    mesh(knee, new T.CapsuleGeometry(.072, .285, 4, 12), cfg.pantalon, 0, -.215, 0)
    const ankle = new T.Group(); ankle.position.y = -.43; knee.add(ankle)
    rounded(ankle, 0, -.025, .055, .17, .13, .29, '#f3f2ec', .055)
    rounded(ankle, 0, -.08, .055, .18, .028, .30, '#cbd0d1', .012)
    piernas.push({ hip: joint, knee, ankle })
    const arm = new T.Group(); arm.position.set(side * (shoulder + .02), 1.36, 0); cuerpo.add(arm)
    mesh(arm, new T.CapsuleGeometry(.069, .19, 4, 12), cfg.ropa, 0, -.155, 0)
    const elbow = new T.Group(); elbow.position.y = -.31; arm.add(elbow)
    oval(elbow, 0, 0, 0, .060, cfg.vestimenta === 'chaqueta' ? cfg.ropa : cfg.piel)
    mesh(elbow, new T.CapsuleGeometry(.052, .20, 4, 12), cfg.vestimenta === 'chaqueta' ? cfg.ropa : cfg.piel, 0, -.14, 0)
    oval(elbow, 0, -.31, .015, .060, cfg.piel, .75, 1.25, .67)
    brazos.push({ shoulder: arm, elbow })
  }
  skull.name = 'rostro'
  return { group, cuerpo, head, piernas, brazos, phase: 0, blend: 0, sitting: 0, initialized: false, lastX: 0, lastY: 0 }
}

export function animarPersonaje(r: Personaje, pose: PosePersona, dt: number, time: number) {
  const dx = pose.x - r.lastX, dz = pose.y - r.lastY
  const distance = r.initialized ? Math.hypot(dx, dz) : 0
  const moving = pose.mov && distance > .0001 && distance < 1
  const smooth = 1 - Math.exp(-dt * 12)
  r.blend += ((moving ? Math.min(1, distance / Math.max(.001, dt) / 2.4) : 0) - r.blend) * smooth
  r.sitting += ((pose.sentado ? 1 : 0) - r.sitting) * (1 - Math.exp(-dt * 7))
  r.phase += distance < 1 ? distance * Math.PI * 2 / 1.55 : 0
  const target = moving ? Math.atan2(dx, dz) : angulos[pose.dir]
  const difference = Math.atan2(Math.sin(target - r.group.rotation.y), Math.cos(target - r.group.rotation.y))
  r.group.rotation.y += difference * (r.initialized ? smooth : 1)
  r.group.position.set(pose.x, 0, pose.y)
  r.cuerpo.position.y = -.39 * r.sitting + Math.cos(r.phase * 2) * .022 * r.blend
  r.cuerpo.rotation.z = Math.sin(r.phase) * .025 * r.blend
  r.head.rotation.y = Math.sin(time * .5) * .025 * (1 - r.blend)
  r.piernas.forEach(({ hip, knee, ankle }, i) => {
    const phase = r.phase + i * Math.PI
    hip.rotation.x = Math.sin(phase) * .53 * r.blend * (1 - r.sitting) - 1.48 * r.sitting
    knee.rotation.x = Math.max(0, Math.sin(phase + .7)) * .78 * r.blend * (1 - r.sitting) + 1.48 * r.sitting
    ankle.rotation.x = -Math.max(0, Math.sin(phase)) * .20 * r.blend * (1 - r.sitting)
  })
  r.brazos.forEach(({ shoulder, elbow }, i) => {
    shoulder.rotation.x = -Math.sin(r.phase + i * Math.PI) * .34 * r.blend * (1 - r.sitting) - .18 * r.sitting
    shoulder.rotation.z = (i ? 1 : -1) * .035
    elbow.rotation.x = -.13 - .65 * r.sitting - .10 * r.blend
  })
  r.lastX = pose.x; r.lastY = pose.y; r.initialized = true
}

export function liberarPersonaje(r: Personaje) {
  const materials = new Set<T.Material>()
  r.group.traverse(o => {
    if (o instanceof T.Mesh) { o.geometry.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => materials.add(m)) }
  })
  materials.forEach(m => m.dispose())
  r.group.removeFromParent()
}
