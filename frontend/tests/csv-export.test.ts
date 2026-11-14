import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { readCsv } from '../src/services/data/csv.ts'
import { buildCalendar, filterCalendarRecords } from '../src/services/data/calendar.ts'
import { MONTHLY_COLUMNS, calendarCsvFilename, serializeCsv, serializeMonthlySeries } from '../src/services/data/csvExport.ts'
import { parseMonthlySeries } from '../src/services/data/validators.ts'

const records = parseMonthlySeries(await readFile(new URL('../public/data/demo/monthly_series.csv', import.meta.url), 'utf8'))
const header = 'region_id,year,month,sensor,n_detections,indicator,qc_status,source_version,updated_at'

test('CSV mensual conserva exactamente las nueve columnas y los valores oficiales', () => {
  assert.equal(MONTHLY_COLUMNS.join(','), header)
  assert.equal(serializeMonthlySeries([records[0]]), `${header}\r\nPE-DEMO,2024,8,MODIS,12,3,ok,DEMO-MODIS-v0,2026-11-14\r\n`)
  assert.deepEqual(parseMonthlySeries(serializeMonthlySeries([records[0]])), [records[0]])
})
test('exportación filtra región y sensor, ordena años/meses y no altera el arreglo original', () => {
  const input = [records[4], { ...records[0], year: 2023 }, records[3], { ...records[0], region_id: 'OTRA' }, records[0], records[2]]
  const before = structuredClone(input)
  const selected = filterCalendarRecords(input, 'PE-DEMO', 'MODIS')
  const rows = parseMonthlySeries(serializeMonthlySeries(selected))
  assert.deepEqual(rows.map(row => [row.year, row.month]), [[2023, 8], [2024, 8], [2024, 9], [2024, 10]])
  assert.ok(rows.every(row => row.region_id === 'PE-DEMO' && row.sensor === 'MODIS'))
  assert.deepEqual(input, before)
})
test('CSV conserva ceros, nulos y qc_status, sin exportar meses que solo existen en la cuadrícula', () => {
  for (const sensor of ['MODIS', 'VIIRS'] as const) {
    const selected = filterCalendarRecords(records, 'PE-DEMO', sensor)
    const csv = serializeMonthlySeries(selected)
    const rows = parseMonthlySeries(csv)
    assert.equal(buildCalendar(records, 'PE-DEMO', sensor)[0].cells.length, 12)
    assert.equal(rows.length, 3)
    assert.deepEqual(rows.map(row => row.month), [8, 9, 10])
    assert.equal(rows[1].indicator, 0); assert.equal(rows[1].n_detections, 0)
    assert.equal(rows[1].qc_status, 'ok')
    assert.equal(rows[2].indicator, null); assert.equal(rows[2].n_detections, null)
    assert.equal(rows[2].qc_status, sensor === 'MODIS' ? 'insufficient_data' : 'no_pass')
    assert.match(csv, new RegExp(`${sensor},,,${rows[2].qc_status}`))
  }
})
test('serializador escapa comas, comillas y saltos de línea conservando Unicode', () => {
  const source = 'versión "ñ", Perú\nsegunda línea'
  const csv = serializeCsv([[source, 'a\rb', 'a\r\nb', null, 0, 3.5]])
  assert.equal(csv, '"versión ""ñ"", Perú\nsegunda línea","a\rb","a\r\nb",,0,3.5\r\n')
  assert.equal(readCsv(serializeCsv([[source]]))[0][0], source)
})
test('textos con fórmulas y prefijos de espacios/control se neutralizan antes del escape CSV', () => {
  for (const value of ['=1+1', '+SUM(1,2)', '-1+2', '@SUM(1)', '  =1', '\t=1', '\r=1', '\n=1', '\u0000=1', '＝1', '＋1', '－1', '＠SUM(1)']) {
    assert.equal(readCsv(serializeCsv([[value]]))[0][0], `'${value}`)
  }
  assert.equal(readCsv(serializeCsv([['\ttexto', '\rtexto', '\ntexto']]))[0][0], "'\ttexto")
  assert.equal(serializeCsv([[-1, 0, 1.5]]), '-1,0,1.5\r\n')
})
test('textos ordinarios se conservan y datos no finitos producen error', () => {
  assert.deepEqual(readCsv(serializeCsv([['PE-DEMO', 'VIIRS', 'insufficient_data', 'no_pass']])), [['PE-DEMO', 'VIIRS', 'insufficient_data', 'no_pass']])
  for (const value of [NaN, Infinity, -Infinity]) assert.throws(() => serializeCsv([[value]]), /no finito/)
})
test('CSV sin registros tiene solo cabecera, sin ceros ni filas inventadas', () => {
  assert.equal(serializeMonthlySeries([]), `${header}\r\n`)
  assert.deepEqual(parseMonthlySeries(serializeMonthlySeries([])), [])
})
test('nombre incluye región, sensor y demo y sanitiza rutas/caracteres no válidos', () => {
  assert.equal(calendarCsvFilename('PE-DEMO', 'MODIS'), 'allpanina_PE-DEMO_MODIS_demo.csv')
  assert.equal(calendarCsvFilename('Perú', 'VIIRS'), 'allpanina_Perú_VIIRS_demo.csv')
  const filename = calendarCsvFilename('../../DEMO:01\\*?\n', 'VIIRS')
  assert.match(filename, /^allpanina_[\p{L}\p{N}_-]+_VIIRS_demo\.csv$/u)
  assert.doesNotMatch(filename, /[\\/:*?\r\n]/)
  assert.equal(calendarCsvFilename('', 'MODIS'), 'allpanina_region_MODIS_demo.csv')
})
