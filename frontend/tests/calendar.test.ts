import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { MONTHS, buildCalendar, cellLabel } from '../src/services/data/calendar.ts'
import { parseMonthlySeries } from '../src/services/data/validators.ts'

const csv = await readFile(new URL('../public/data/demo/monthly_series.csv', import.meta.url), 'utf8')
const records = parseMonthlySeries(csv)

test('calendario ordena años y genera los doce meses sin inventar registros', () => {
  const input = [records[0], { ...records[0], year: 2023 }, { ...records[0], region_id: 'OTRA', year: 2022 }]
  const years = buildCalendar(input, 'PE-DEMO', 'MODIS')
  assert.deepEqual(years.map(row => row.year), [2023, 2024])
  assert.equal(MONTHS.length, 12)
  assert.deepEqual(years[0].cells.map(cell => cell.month), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  assert.equal(years[0].cells[0].record, null)
  assert.equal(years[0].cells[7].record?.year, 2023)
  assert.equal(input.length, 3)
})
test('calendario distingue valor, cero, insuficiente, sin paso y ausente', () => {
  const modis = buildCalendar(records, 'PE-DEMO', 'MODIS')[0].cells
  const viirs = buildCalendar(records, 'PE-DEMO', 'VIIRS')[0].cells
  assert.equal(modis[7].status, 'value'); assert.equal(modis[7].record.cell_days, 3)
  assert.equal(viirs[7].record.cell_days, 5)
  assert.equal(modis[8].status, 'zero'); assert.equal(modis[8].record.cell_days, 0)
  assert.equal(modis[9].status, 'missing'); assert.equal(modis[9].record.cell_days, null)
  assert.equal(viirs[9].status, 'missing')
  assert.equal(modis[0].status, 'absent'); assert.equal(modis[0].record, null)
  assert.equal(cellLabel(modis[8]), '0 · válido')
  assert.equal(cellLabel(modis[9]), 'Sin datos')
})
test('un estado insuficiente prevalece sobre un conteo parcial o cero', () => {
  const partial = { ...records[0], status: 'missing' as const, cell_days: null }
  const cell = buildCalendar([partial], 'PE-DEMO', 'MODIS')[0].cells[7]
  assert.equal(cell.status, 'missing')
  assert.equal(cell.record.cell_days, null)
})
test('serie vacía y sensor ausente conservan estados comprensibles', () => {
  assert.deepEqual(buildCalendar([], 'PE-DEMO', 'MODIS'), [])
  assert.deepEqual(buildCalendar(records, 'OTRA', 'MODIS'), [])
  const missingSensor = buildCalendar([records[0]], 'PE-DEMO', 'VIIRS')
  assert.equal(missingSensor.length, 1)
  assert.ok(missingSensor[0].cells.every(cell => cell.status === 'absent'))
})
