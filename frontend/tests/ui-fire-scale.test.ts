import test from 'node:test'
import assert from 'node:assert/strict'
import { FIRE_DARK, FIRE_LIGHT, classLabels, fireStep, fireTextColor, quantileBreaks } from '../src/ui/fireScale.ts'
import { formatCount, formatMonth } from '../src/ui/format.ts'

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map(i => { const c = parseInt(hex.slice(i, i + 2), 16) / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4 })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

test('escala clara: luminancia decreciente; escala oscura: creciente', () => {
  for (let i = 1; i < 9; i++) {
    assert.ok(luminance(FIRE_LIGHT[i]) < luminance(FIRE_LIGHT[i - 1]), `claro paso ${i}`)
    assert.ok(luminance(FIRE_DARK[i]) > luminance(FIRE_DARK[i - 1]), `oscuro paso ${i}`)
  }
})

test('el texto dentro de cada paso se lee (≥ 3,9:1)', () => {
  for (let i = 0; i < 9; i++) {
    assert.ok(contrast(FIRE_LIGHT[i], fireTextColor(i, 'light')) >= 3.9, `claro ${i}`)
    assert.ok(contrast(FIRE_DARK[i], fireTextColor(i, 'dark')) >= 3.9, `oscuro ${i}`)
  }
})

test('cuantiles: ignoran cero, nulos y no finitos; el máximo cae en el último paso', () => {
  const values = [0, null, NaN, ...Array.from({ length: 90 }, (_, i) => i + 1)]
  const breaks = quantileBreaks(values)
  assert.equal(breaks.length, 8)
  assert.deepEqual([...breaks].sort((a, b) => a - b), breaks)
  assert.equal(fireStep(1, breaks), 0)
  assert.equal(fireStep(90, breaks), 8)
})

test('cuantiles con pocos valores distintos: no inventan clases', () => {
  assert.deepEqual(quantileBreaks([]), [])
  assert.deepEqual(quantileBreaks([5, 5, 5]), [])
  assert.equal(fireStep(5, []), 8)
  const breaks = quantileBreaks([1, 1, 1, 10, 10, 10])
  assert.deepEqual(breaks, [10])
  assert.equal(fireStep(1, breaks), 0)
  assert.equal(fireStep(10, breaks), 8)
})

test('rótulos de clase: enteros y en inglés', () => {
  assert.deepEqual(classLabels([13, 41, 4200]), ['1–12', '13–40', '41–4,199', '≥ 4,200'])
  assert.equal(formatCount(25046), '25,046')
  assert.equal(formatCount(null), '—')
  assert.equal(formatMonth(2024, 8), 'Aug 2024')
})
