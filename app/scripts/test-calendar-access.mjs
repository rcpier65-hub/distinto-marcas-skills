import assert from 'node:assert/strict'
import { calendarAccess } from '../lib/calendario/access.ts'
import { mergePermisos, tieneAcceso } from '../lib/team/types.ts'

const base = { publicaciones: { acceso: true, puede_editar: false } }
const full = { view: true, schedule: true, manage: true }
const read = { view: true, schedule: false, manage: false }
const none = { view: false, schedule: false, manage: false }
const member = (rolBase, permisos = base, activo = true) => ({ rolBase, permisos, activo })
assert.deepEqual(calendarAccess(null), none)
assert.deepEqual(calendarAccess(member('director', base, false)), none)
for (const role of ['director', 'admin']) assert.deepEqual(calendarAccess(member(role)), full)
for (const role of ['editor', 'community_manager']) assert.deepEqual(calendarAccess(member(role)), read)
assert.deepEqual(calendarAccess(member('disenador')), { view: true, schedule: true, manage: false })

const previous = { tareas: { excluir_miembros: ['pedro'], puede_asignar: true }, marcas: { acceso: false } }
const granted = { ...previous, calendario: { acceso: true, puede_editar: true } }
const effective = mergePermisos(base, granted)
for (const role of ['director', 'community_manager', 'editor', 'disenador']) {
  assert.deepEqual(calendarAccess(member(role, effective)), full)
}
assert.deepEqual(effective.tareas, previous.tareas)
assert.deepEqual(effective.marcas, previous.marcas)
assert.equal(effective.publicaciones.puede_editar, false)
assert.deepEqual(previous, { tareas: { excluir_miembros: ['pedro'], puede_asignar: true }, marcas: { acceso: false } })
assert.deepEqual(calendarAccess(member('director', { ...base, calendario: { acceso: false, puede_editar: true } })), none)
assert.deepEqual(calendarAccess(member('director', { ...base, calendario: { puede_editar: false } })), read)
assert.deepEqual(calendarAccess(member('editor', { calendario: { acceso: true, puede_editar: true } })), full)
assert.equal(tieneAcceso(base, 'calendario'), true)
assert.equal(tieneAcceso({ ...base, calendario: { acceso: false } }, 'calendario'), false)
assert.equal(tieneAcceso({ calendario: { acceso: true } }, 'publicaciones'), false)
console.log('PASS calendar roles, explicit grants/revocation, inactive/unknown denial, navigation and unrelated permissions preserved')
