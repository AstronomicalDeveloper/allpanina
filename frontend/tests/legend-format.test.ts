import assert from 'node:assert/strict'
import { test } from 'node:test'
import { percentileLegend } from '../src/pages/map/sections/percentileLegend'
import { calendarScaleTicks } from '../src/pages/calendar/sections/calendarPresentation'

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

test('escala del calendario sin decimales en conteos', () => {
  assert.deepEqual(calendarScaleTicks(75), ['0', '19', '38', '56', '75'])
  assert.deepEqual(calendarScaleTicks(1), ['0', '0', '1', '1', '1'])
  assert.ok(calendarScaleTicks(5581).slice(0, 4).every(tick => !/\.\d$/.test(tick)))
})
