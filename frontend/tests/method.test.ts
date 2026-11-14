import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { ValidationResult } from '../src/types/data.ts'
import { hasMetrics, hasPartialResults, metricText, topTestErrors } from '../src/services/data/method.ts'

// In-memory inputs exercise presentation only; never published as evaluation data.
const residuals = [2, 8, 0, 6, 4, 10, 1].map((absolute_error, index) => ({
  month: `2024-${String(index + 1).padStart(2, '0')}`,
  modis_observed: 10, estimate: 10 + absolute_error, signed_error: absolute_error, absolute_error,
}))
const results: ValidationResult = { region_id: 'TEST-ONLY', methods: {
  B0: { split: 'test', metrics: { mae: null, wape: null, bias: null }, n_months_matched: 7, residuals },
  B1: { split: 'valid', metrics: { mae: 0, wape: 0.18, bias: -1 }, n_months_matched: 2 },
} }
test('errores: orden descendente, límite de cinco, sin recalcular ni mutar residuos', () => {
  const before = structuredClone(results)
  const top = topTestErrors(results)
  assert.deepEqual(top.map(error => error.absolute_error), [10, 8, 6, 4, 2])
  assert.equal(top.length, 5)
  assert.ok(top.every(error => error.method === 'B0'))
  assert.equal(top[0].month, '2024-06')
  assert.deepEqual(results, before)
})
test('errores excluyen train y valid; sin test se informa ausencia', () => {
  for (const split of ['train', 'valid'] as const) {
    assert.deepEqual(topTestErrors({ ...results, methods: { B0: { ...results.methods.B0!, split } } }), [])
  }
  assert.deepEqual(topTestErrors({ region_id: 'TEST-ONLY', methods: {} }), [])
})
test('errores conservan método, valores y signo recibido al combinar métodos', () => {
  const input: ValidationResult = { ...results, methods: { ...results.methods,
    B1: { ...results.methods.B1!, split: 'test', residuals: [{ month: '2024-08', modis_observed: 30, estimate: 10, signed_error: -20, absolute_error: 20 }] },
  } }
  assert.deepEqual(topTestErrors(input)[0], { method: 'B1', month: '2024-08', modis_observed: 30, estimate: 10, signed_error: -20, absolute_error: 20 })
})
test('métricas: null y método ausente no se convierten a cero; WAPE no cambia de escala', () => {
  assert.equal(metricText(null), 'No disponible')
  assert.equal(metricText(undefined), 'No disponible')
  assert.equal(metricText(0), '0')
  assert.equal(metricText(0.18), '0.18')
  assert.equal(metricText(-1.5), '-1.5')
  assert.equal(hasMetrics(results), true)
  assert.equal(hasPartialResults(results), true)
  const empty: ValidationResult = { region_id: 'TEST-ONLY', methods: {} }
  assert.equal(hasMetrics(empty), false)
  assert.equal(hasPartialResults(empty), false)
})
