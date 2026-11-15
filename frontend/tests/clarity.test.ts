import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import { valueContext } from '../src/components/ui/valueContext.ts'
import CellDaysHelp from '../src/components/ui/CellDaysHelp.tsx'
import { PURPOSE_CELL, PURPOSE_COMPARE } from '../src/components/ui/cellDaysPurpose.ts'
import CalendarDetail from '../src/pages/calendar/sections/CalendarDetail.tsx'
import { buildCalendar } from '../src/services/data/calendar.ts'
import type { MonthlyRecord } from '../src/types/data.ts'
const dom = new JSDOM('<body></body>', {url:'http://localhost/'})
Object.defineProperties(globalThis,{window:{value:dom.window,configurable:true},document:{value:dom.window.document,configurable:true},IS_REACT_ACT_ENVIRONMENT:{value:true,configurable:true}})

const row = (year: number, month: number, cell_days: number | null, status: MonthlyRecord['status'] = 'ok'): MonthlyRecord =>
  ({ region_id: 'PE-UCA', year, month, sensor_group: 'MODIS', cell_days, status, source_version: 'v', updated_at: '2026-01-01' }) as MonthlyRecord

test('valueContext cuenta cuántos valores son mayores y no inventa nada', () => {
  assert.deepEqual(valueContext([5, 10, 10, 20], 10), { greater: 1, total: 4, max: 20 })
  assert.deepEqual(valueContext([5, 10, 20], 20), { greater: 0, total: 3, max: 20 })
  assert.deepEqual(valueContext([0, 0, 3], 0), { greater: 1, total: 3, max: 3 })
  assert.equal(valueContext([], 4), null)
  assert.equal(valueContext([1, 2], null), null)
  assert.equal(valueContext([1, 2], Number.NaN), null)
})

test('la ayuda de días-celda añade para qué sirve comparar períodos y cómo leer una celda', async t => {
  for (const [purpose, title] of [[PURPOSE_COMPARE, /Para qué sirve comparar períodos/], [PURPOSE_CELL, /Cómo leer el valor de una celda/]] as const) {
    const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
    t.after(async () => { await act(async () => root.unmount()); host.remove() })
    await act(async () => root.render(createElement(CellDaysHelp, { purpose })))
    const text = host.textContent!
    assert.match(text, /No equivale a cantidad de incendios/)
    assert.match(text, title)
  }
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  await act(async () => root.render(createElement(CellDaysHelp)))
  assert.doesNotMatch(host.textContent!, /Para qué sirve|Cómo leer el valor/)
})

test('el detalle del calendario contextualiza el mes y omite meses sin dato utilizable', async t => {
  const records = [row(2020, 1, 10), row(2020, 2, 40), row(2020, 3, 25), row(2020, 4, null, 'missing'), row(2020, 5, 0)]
  const cell = buildCalendar(records, 'PE-UCA', 'MODIS')[0].cells[2] // marzo = 25
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  await act(async () => root.render(createElement(CalendarDetail, { cell, region: 'PE-UCA', sensor: 'MODIS', seriesRecords: records })))
  const text = host.querySelector('.calendar-context')!.textContent!
  assert.match(text, /1 de 4 meses con dato tienen más días-celda que Marzo 2020/) // el mes "missing" no cuenta
  assert.match(text, /El máximo es 40 \(Febrero 2020\)/)
  assert.match(text, /MODIS y VIIRS no son directamente comparables/)
})

test('sin serie disponible o sin dato no se muestra contexto', async t => {
  const records = [row(2020, 1, 10), row(2020, 2, null, 'missing')]
  const cells = buildCalendar(records, 'PE-UCA', 'MODIS')[0].cells
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  await act(async () => root.render(createElement(CalendarDetail, { cell: cells[1], region: 'PE-UCA', sensor: 'MODIS', seriesRecords: records })))
  assert.equal(host.querySelector('.calendar-context'), null)
  await act(async () => root.render(createElement(CalendarDetail, { cell: cells[0], region: 'PE-UCA', sensor: 'MODIS' })))
  assert.equal(host.querySelector('.calendar-context'), null)
})
