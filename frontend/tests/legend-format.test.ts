import assert from 'node:assert/strict'
import { test } from 'node:test'
import { percentileLegend } from '../src/pages/map/sections/percentileLegend'
import { classLabels, quantileBreaks } from '../src/ui/fireScale'

test('leyenda del mapa usa enteros y marca tramos vacíos en lugar de repetir cortes', () => {
  assert.deepEqual(percentileLegend(1, 1, 1.5).map(r => r.range), ['≤ 1', 'No values in this range', 'No values in this range', '≥ 2'])
  assert.deepEqual(percentileLegend(2.5, 7, 40.25).map(r => r.range), ['≤ 2', '3 to 7', '8 to 40', '≥ 41'])
  assert.deepEqual(percentileLegend(1, 2, 3).map(r => r.range), ['≤ 1', '2', '3', '≥ 4'])
})

test('cada valor entero cae en el tramo de la leyenda que corresponde a su color en el mapa', () => {
  // Misma regla que percentileColorExpression: ≤ q25, ≤ q50, ≤ q75, resto.
  const colorClass = (v: number, q: number[]) => v <= q[0] ? 0 : v <= q[1] ? 1 : v <= q[2] ? 2 : 3
  const inRange = (v: number, range: string) => {
    if (range.startsWith('≤ ')) return v <= Number(range.slice(2))
    if (range.startsWith('≥ ')) return v >= Number(range.slice(2))
    if (range === 'No values in this range') return false
    const [low, high = low] = range.split(' to ').map(Number)
    return v >= low && v <= high
  }
  for (const q of [[1, 1, 1], [1, 1.5, 4], [2.25, 2.75, 9.5], [3, 6, 6], [0.5, 12.8, 31.2]]) {
    const legend = percentileLegend(q[0], q[1], q[2])
    for (let v = 0; v <= 40; v++) assert.ok(inRange(v, legend[colorClass(v, q)].range), `valor ${v} con cortes ${q}`)
  }
})

test('leyenda del calendario: rangos enteros por cuantiles, sin decimales ni tramos repetidos', () => {
  const breaks = quantileBreaks([1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377, 610, 987, 1597, 2584, 4181, 5581])
  const labels = classLabels(breaks)
  assert.ok(labels.length <= 9)
  assert.ok(labels.every(label => /^[\d,]+–[\d,]+$|^≥ [\d,]+$/.test(label)), labels.join(' | '))
  assert.equal(new Set(labels).size, labels.length)
  assert.deepEqual(classLabels([]), ['≥ 1'])
})
