import assert from 'node:assert/strict'
import test from 'node:test'
import {
  OWNER_SCOPE,
  TAREAS_READ_SCOPE,
  canIssueOwnerScope,
  defaultDeviceKeyScopes,
  scopeSatisfies,
} from './device-key-scopes.ts'

test('owner cubre tareas:read; full y * son alias', () => {
  assert.equal(scopeSatisfies([TAREAS_READ_SCOPE], TAREAS_READ_SCOPE), true)
  assert.equal(scopeSatisfies([OWNER_SCOPE], TAREAS_READ_SCOPE), true)
  assert.equal(scopeSatisfies(['full'], OWNER_SCOPE), true)
  assert.equal(scopeSatisfies(['*'], 'calendario:write'), true)
  assert.equal(scopeSatisfies([TAREAS_READ_SCOPE], OWNER_SCOPE), false)
})

test('solo director, admin o usuario sin team_member emite owner', () => {
  assert.equal(canIssueOwnerScope({ teamMemberId: null, rolBase: null }), true)
  assert.equal(canIssueOwnerScope({ teamMemberId: 'x', rolBase: 'director' }), true)
  assert.equal(canIssueOwnerScope({ teamMemberId: 'x', rolBase: 'admin' }), true)
  assert.equal(canIssueOwnerScope({ teamMemberId: 'x', rolBase: 'editor' }), false)
  assert.deepEqual(defaultDeviceKeyScopes(true), [OWNER_SCOPE])
  assert.deepEqual(defaultDeviceKeyScopes(false), [TAREAS_READ_SCOPE])
})
