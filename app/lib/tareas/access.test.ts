import test from 'node:test'
import assert from 'node:assert/strict'
import { canCreateBrand, scopeTasks, taskAccess, taskAssignable, taskEditable, taskMemberVisible } from './access'
import { mergePermisos } from '@/lib/team/types'

const pedro = '86918211-b173-4013-bdff-39a446a40c57'
const lorena = 'a8481016-0e02-4636-ab10-569070279a01'
const otro = '11111111-1111-4111-8111-111111111111'
const member = { id: lorena, email: 'lorena@agenciadistinto.com', rol_base: 'community_manager', activo: true }
const permisos = { tareas: { ver_equipo: true, puede_asignar: true, excluir_miembros: [pedro] }, marcas: { acceso: true, puede_crear: true } }
const access = taskAccess(member, permisos)

test('Lorena consulta el equipo pero nunca Pedro ni tareas sin responsable', () => {
  assert.equal(taskMemberVisible(access, lorena), true)
  assert.equal(taskMemberVisible(access, otro), true)
  assert.equal(taskMemberVisible(access, pedro), false)
  assert.equal(taskMemberVisible(access, null), false)
  assert.equal(taskAssignable(access, otro), true)
  assert.equal(taskAssignable(access, pedro), false)
})
test('supervisar no concede borrar/completar tareas ajenas; sí las que Lorena asignó', () => {
  assert.equal(taskEditable(access, { team_member_id: otro, created_by: pedro }), false)
  assert.equal(taskEditable(access, { team_member_id: otro, created_by: lorena }), true)
  assert.equal(taskEditable(access, { team_member_id: lorena, created_by: pedro }), true)
  assert.equal(taskEditable(access, { team_member_id: pedro, created_by: lorena }), false)
})
test('los demás miembros conservan vista personal; los fallos de identidad cierran el acceso', () => {
  for (const rol_base of ['editor', 'disenador', 'director']) {
    const personal = taskAccess({ ...member, rol_base }, {})
    assert.equal(taskMemberVisible(personal, otro), false)
    assert.equal(taskMemberVisible(personal, lorena), true)
  }
  for (const denied of [taskAccess(null), taskAccess({ ...member, activo: false }, permisos), taskAccess(member, { tareas: { acceso: false } })]) {
    assert.equal(taskMemberVisible(denied, otro), false)
    assert.equal(taskEditable(denied, { team_member_id: lorena, created_by: lorena }), false)
    assert.equal(taskAssignable(denied, otro), false)
  }
  const owner = taskAccess({ ...member, id: pedro, email: 'pedro@agenciadistinto.com', rol_base: 'director' }, {})
  assert.equal(taskMemberVisible(owner, otro), true)
  assert.equal(taskMemberVisible(owner, null), true)
})
test('las consultas aplican exclusión antes de límites y rechazan pedir a Pedro por ID', () => {
  const calls: unknown[][] = []
  const query = { eq(...args: unknown[]) { calls.push(['eq', ...args]); return this }, is(...args: unknown[]) { calls.push(['is', ...args]); return this }, not(...args: unknown[]) { calls.push(['not', ...args]); return this }, neq(...args: unknown[]) { calls.push(['neq', ...args]); return this } }
  scopeTasks(query, access)
  assert.deepEqual(calls, [['not','team_member_id','is',null], ['neq','team_member_id',pedro]])
  calls.length = 0; scopeTasks(query, access, pedro)
  assert.deepEqual(calls, [['is','id',null]])
  calls.length = 0; scopeTasks(query, access, otro)
  assert.deepEqual(calls[0], ['eq','team_member_id',otro])
})
test('crear marcas es independiente de administración y conserva los overrides existentes', () => {
  const effective = mergePermisos({ equipo: { acceso: false }, finanzas: { acceso: false }, marcas: { acceso: true } }, permisos)
  assert.equal(canCreateBrand(member, effective), true)
  assert.equal(effective.equipo?.acceso, false)
  assert.equal(effective.finanzas?.acceso, false)
  assert.equal(canCreateBrand(member, {}), false)
  assert.equal(canCreateBrand({ ...member, activo: false }, permisos), false)
  assert.equal(canCreateBrand({ ...member, rol_base: 'director' }, {}), true)
})
