import assert from 'node:assert/strict'
import test from 'node:test'
import type { SupabaseClient } from '@supabase/supabase-js'
import { idDeSolicitudDiseno, insertarDisenoUnaVez } from './create-task.ts'

const requestId = 'da22f941-53d4-4629-a311-937c9b91d707'
const newRequestId = '6a0bdc4f-f742-48f6-bcd3-c21bc9ef8936'
type Row = Record<string, unknown>

// Modelo de la restricción de clave primaria de publicaciones. Las pruebas
// ejercitan concurrencia y respuestas perdidas sin crear tareas del equipo.
function database(options: { loseFirstResponse?: boolean; missingOptionalColumn?: boolean } = {}) {
  const rows = new Map<string, Row>()
  const attempts: Row[] = []
  const service = {
    from: () => ({
      insert: (payload: Row) => ({
        select: () => ({
          single: async () => {
            await Promise.resolve()
            attempts.push({ ...payload })
            if (options.missingOptionalColumn && attempts.length === 1) {
              return { data: null, error: { code: '42703', message: 'column marcas_extra does not exist' } }
            }
            const id = String(payload.id)
            if (rows.has(id)) return { data: null, error: { code: '23505', message: 'publicaciones_pkey' } }
            rows.set(id, { ...payload })
            if (options.loseFirstResponse && attempts.length === 1) {
              return { data: null, error: { code: 'NETWORK', message: 'respuesta perdida' } }
            }
            return { data: { id, marcas_extra: payload.marcas_extra }, error: null }
          },
        }),
      }),
      select: () => {
        const filters: Row = {}
        const query = {
          eq(key: string, value: unknown) { filters[key] = value; return query },
          async maybeSingle() {
            const row = [...rows.values()].find(r => Object.entries(filters).every(([key, value]) => r[key] === value))
            return { data: row ? { id: row.id } : null, error: null }
          },
        }
        return query
      },
    }),
  } as unknown as SupabaseClient
  return { service, rows, attempts }
}

function payload(solicitudId = requestId) {
  return {
    id: idDeSolicitudDiseno('user-a', solicitudId), created_by: 'user-a', es_tarea_diseno: true,
    nombre: 'POST MANRIQUE', estado_tarea: 'sin_empezar', fecha_marcada_para_disenar: '2026-09-29',
  }
}

test('una solicitud tiene un id estable, aislado por usuario y con formato UUID', () => {
  const id = idDeSolicitudDiseno('user-a', requestId)
  assert.equal(id, idDeSolicitudDiseno('user-a', requestId.toUpperCase()))
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
  assert.notEqual(id, idDeSolicitudDiseno('user-b', requestId))
  assert.notEqual(id, idDeSolicitudDiseno('user-a', newRequestId))
  assert.throws(() => idDeSolicitudDiseno('user-a', 'no-es-un-uuid'), /no es válida/)
})

test('20 peticiones concurrentes crean una sola tarea y devuelven el mismo id', async () => {
  const db = database()
  const results = await Promise.all(Array.from({ length: 20 }, () => insertarDisenoUnaVez(db.service, payload())))
  assert.equal(db.rows.size, 1)
  assert.ok(results.every(r => !r.error && r.data?.id === payload().id))
  assert.equal(db.rows.get(payload().id)?.fecha_marcada_para_disenar, '2026-09-29')
})

test('reintentar una respuesta perdida recupera la tarea sin sobrescribir el avance', async () => {
  const db = database({ loseFirstResponse: true })
  assert.ok((await insertarDisenoUnaVez(db.service, payload())).error)
  db.rows.get(payload().id)!.estado_tarea = 'en_progreso'
  const retry = await insertarDisenoUnaVez(db.service, payload())
  assert.equal(retry.error, null)
  assert.equal(retry.data?.id, payload().id)
  assert.equal(db.rows.size, 1)
  assert.equal(db.rows.get(payload().id)?.estado_tarea, 'en_progreso')
})

test('dos solicitudes nuevas pueden tener el mismo nombre sin fusionarse', async () => {
  const db = database()
  await insertarDisenoUnaVez(db.service, payload())
  await insertarDisenoUnaVez(db.service, payload(newRequestId))
  assert.equal(db.rows.size, 2)
})

test('el fallback de columnas preserva el id y la marca para trabajar hoy', async () => {
  const db = database({ missingOptionalColumn: true })
  const result = await insertarDisenoUnaVez(db.service, { ...payload(), marcas_extra: ['marca-b'], descripcion: 'Brief' })
  assert.equal(result.error, null)
  assert.equal(db.attempts.length, 2)
  assert.equal(db.attempts[0].id, db.attempts[1].id)
  assert.equal(db.rows.size, 1)
  assert.equal(db.rows.get(payload().id)?.fecha_marcada_para_disenar, '2026-09-29')
})

test('un conflicto con una fila ajena no se trata como éxito', async () => {
  const db = database()
  db.rows.set(payload().id, { ...payload(), created_by: 'user-b' })
  const result = await insertarDisenoUnaVez(db.service, payload())
  assert.equal(result.error?.code, '23505')
  assert.equal(result.data, null)
})
