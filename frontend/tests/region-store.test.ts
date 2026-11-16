import assert from 'node:assert/strict'
import { test } from 'node:test'
import { setImmediate } from 'node:timers/promises'
import { borrarConjunto, guardarConjunto, leerArchivoLocal } from '../src/services/region/store'

test('persistencia espera commit; abortar avisa y conserva el resultado de sesión', async t => {
  const original = Object.getOwnPropertyDescriptor(globalThis, 'indexedDB')
  type Transaction = { oncomplete?: () => void; onabort?: () => void; error: Error; objectStore: () => unknown }
  let transaction: Transaction
  let closed = 0
  const db = { close: () => closed++, transaction: () => {
    transaction = { error: new Error('cuota'), objectStore: () => ({ put: () => ({ result: 'ok' }), delete: () => ({ result: undefined }) }) }
    return transaction
  } }
  const idb = { open: () => {
    const req = { result: db, onsuccess: () => {} }
    queueMicrotask(() => req.onsuccess())
    return req
  } }
  Object.defineProperty(globalThis, 'indexedDB', { value: idb, configurable: true })
  t.after(() => { if (original) Object.defineProperty(globalThis, 'indexedDB', original); else Reflect.deleteProperty(globalThis, 'indexedDB') })
  const conjunto = { archivos: { 'a.txt': 'sesión' }, region_id: 'X', nombre: 'X', guardado: new Date().toISOString() }
  let settled = false
  const saving = guardarConjunto(conjunto).then(r => { settled = true; return r })
  await setImmediate()
  assert.equal(settled, false)
  transaction!.onabort!()
  assert.match((await saving)!, /memory/)
  assert.equal(await leerArchivoLocal('a.txt'), 'sesión')
  assert.equal(closed, 1)
  const success = guardarConjunto(conjunto)
  await setImmediate(); transaction!.oncomplete!()
  assert.equal(await success, null)
  const deleting = borrarConjunto()
  const rejection = assert.rejects(deleting, /cuota/)
  await setImmediate(); transaction!.onabort!()
  await rejection
  assert.equal(await leerArchivoLocal('a.txt'), 'sesión')
})
