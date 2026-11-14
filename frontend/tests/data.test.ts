import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { readCsv } from '../src/services/data/csv.ts'
import { loadDemo, loadJson, loadMonthlySeries, safelyLoad } from '../src/services/data/loaders.ts'
import { parseMonthlySeries, parseCalibratedSeries, validateCells, validateManifest, validateMethod, validateValidation } from '../src/services/data/validators.ts'

const header = 'region_id,year,month,sensor,n_detections,indicator,qc_status,source_version,updated_at\n'
const valid = 'PE-DEMO,2024,8,MODIS,12,3,ok,DEMO-v0,2026-11-14'
const fixture = (name: string) => readFile(new URL(`../public/data/demo/${name}`, import.meta.url), 'utf8')

test('CSV conserva nombres del contrato y convierte números, cero y faltante', () => {
  const records = parseMonthlySeries(header + valid + '\nPE-DEMO,2024,9,VIIRS,0,0,ok,DEMO-v0,2026-11-14\nPE-DEMO,2024,10,MODIS,,,insufficient_data,DEMO-v0,2026-11-14')
  assert.deepEqual(records[0], { region_id: 'PE-DEMO', year: 2024, month: 8, sensor: 'MODIS', n_detections: 12, indicator: 3, qc_status: 'ok', source_version: 'DEMO-v0', updated_at: '2026-11-14' })
  assert.equal(records[1].indicator, 0)
  assert.equal(records[2].indicator, null)
  assert.equal(records[2].n_detections, null)
  assert.equal(records[2].qc_status, 'insufficient_data')
  assert.equal(records[1].n_detections, 0)
})
test('no_pass conserva faltantes; no se inventa la semántica de conteos parciales', () => {
  const missing = parseMonthlySeries(header + valid.replace(',12,3,ok,', ',,,no_pass,'))[0]
  assert.equal(missing.qc_status, 'no_pass'); assert.equal(missing.indicator, null)
  const partial = parseMonthlySeries(header + valid.replace(',ok,', ',insufficient_data,'))[0]
  assert.equal(partial.indicator, 3)
  assert.equal(parseMonthlySeries(header + valid.replace(',3,', ',3.5,'))[0].indicator, 3.5)
})
test('catálogo mensual oficial: MODIS/VIIRS; códigos históricos rechazados', () => {
  for (const sensor of ['MODIS', 'VIIRS']) assert.equal(parseMonthlySeries(header + valid.replace('MODIS', sensor))[0].sensor, sensor)
  for (const sensor of ['MODIS_TA', 'VIIRS_SNPP']) assert.throws(() => parseMonthlySeries(header + valid.replace('MODIS', sensor)), /sensor/)
})
test('validation lee methods, métricas oficiales y residuos test sin reinterpretar WAPE', () => {
  const input = { region_id: 'PE-DEMO', methods: { B1: {
    split: 'test', metrics: { mae: 1.2, wape: 0.18, bias: -0.3 }, n_months_matched: 6,
    residuals: [{ month: '2025-08', modis_observed: 10, estimate: 8.5, signed_error: -1.5, absolute_error: 1.5 }],
  } } }
  assert.deepEqual(validateValidation(input), input)
  assert.throws(() => validateValidation({ ...input, methods: { B2: input.methods.B1 } }))
  assert.throws(() => validateValidation({ ...input, methods: { B1: { ...input.methods.B1, split: 'train' } } }), /test/)
  assert.throws(() => validateValidation({ ...input, methods: { B1: { ...input.methods.B1, residuals: [] } } }), /detalle_mensual/)
  assert.throws(() => validateValidation({ ...input, methods: { B1: { ...input.methods.B1, residuals: [{ ...input.methods.B1.residuals[0], month: '2025-13' }] } } }))
})
test('validation admite ausencia declarada de residuos y conserva métricas null', () => {
  const data = { region_id: 'PE-DEMO', methods: { B0: { split: 'test', metrics: { mae: null, wape: null, bias: null }, n_months_matched: 0, detalle_mensual: 'no disponible' } } }
  assert.equal(validateValidation(data).methods.B0?.metrics.mae, null)
})
test('method y manifest leen los ejemplos oficiales sin claves históricas', () => {
  const method = { indicator: 'dias-celda con deteccion', sensors: ['MODIS Terra', 'VIIRS S-NPP'], period_train: '2015-01:2023-12', period_valid: '2024-01:2024-12', period_test: '2025-01:2025-12', calibration: 'Ejemplo estructural B1', limitations: ['DEMO'] }
  assert.deepEqual(validateMethod(method), method)
  assert.throws(() => validateMethod({ ...method, period_test: '2025-13:2025-14' }))
  const manifest = { generated_at: '2026-11-14T18:00:00Z', region: 'DEMO-01', files: [{ name: 'monthly_series.csv', version: 'v0', rows: 24 }] }
  assert.deepEqual(validateManifest(manifest), manifest)
  assert.throws(() => validateManifest({ ...manifest, files: ['monthly_series.csv'] }))
})
for (const [name, row] of [
  ['mes 13', valid.replace(',8,', ',13,')],
  ['mes 0', valid.replace(',8,', ',0,')],
  ['año vacío', valid.replace('2024', '')],
  ['año decimal', valid.replace('2024', '2024.5')],
  ['año fuera de rango', valid.replace('2024', '10000')],
  ['negativo', valid.replace(',3,', ',-1,')],
  ['conteo decimal', valid.replace(',12,', ',1.5,')],
  ['NaN', valid.replace(',3,', ',NaN,')],
  ['Infinity', valid.replace(',3,', ',Infinity,')],
  ['hexadecimal', valid.replace(',3,', ',0x10,')],
  ['sensor desconocido', valid.replace('MODIS', 'OTHER')],
  ['faltante con ok', valid.replace(',3,', ',,')],
  ['estado desconocido', valid.replace(',ok,', ',missing,')],
  ['QC vacío', valid.replace(',ok,', ',,')],
  ['indicator mayor a 31', valid.replace(',3,', ',32,')],
  ['conteo negativo', valid.replace(',12,', ',-1,')],
  ['versión vacía', valid.replace('DEMO-v0', '')],
  ['fecha imposible', valid.replace('2026-11-14', '2026-02-30')],
] as const) test(`CSV rechaza ${name}`, () => assert.throws(() => parseMonthlySeries(header + row)))

test('CSV rechaza columna obligatoria ausente y no acepta nombres del contrato histórico', () => {
  assert.throws(() => parseMonthlySeries((header + valid).replace('sensor', 'sensor_group')), /sensor/)
})
test('CSV rechaza duplicados y filas con ancho incorrecto', () => {
  assert.throws(() => parseMonthlySeries(header + valid + '\n' + valid), /duplicada/)
  assert.throws(() => parseMonthlySeries(header + valid + ',extra'), /cantidad/)
  assert.throws(() => parseMonthlySeries(header.replace('source_version', 'qc_status') + valid), /duplicada/)
})
test('lector CSV acepta BOM, CRLF, comas, saltos y comillas escapadas', () => {
  assert.deepEqual(readCsv('\uFEFFa,b\r\n"uno, dos","tres\n""cuatro"""\r\n'), [['a', 'b'], ['uno, dos', 'tres\n"cuatro"']])
  for (const text of ['', 'a\n"sin cierre', 'a\n"cerrado"texto', 'a\nun"quoted']) assert.throws(() => readCsv(text))
})
test('serie calibrada conserva value, method, split y null; admite decimales', () => {
  const rows = parseCalibratedSeries('region_id,year,month,method,value,split,status,residual\nPE-DEMO,2024,8,B1,2.5,test,ok,-1.5\nPE-DEMO,2024,9,B1,,valid,insufficient_data,')
  assert.equal(rows[0].value, 2.5); assert.equal(rows[0].method, 'B1'); assert.equal(rows[0].split, 'test')
  assert.equal(rows[1].value, null); assert.equal(rows[1].residual, null); assert.equal(rows[0].residual, -1.5)
})
test('serie calibrada exige residual, catálogo de splits oficial y números finitos', () => {
  const csv = 'region_id,year,month,method,value,split,status,residual\nPE-DEMO,2024,8,B1,2.5,test,ok,-1.5'
  assert.throws(() => parseCalibratedSeries(csv.replace('residual', 'error')), /residual/)
  assert.throws(() => parseCalibratedSeries(csv.replace(',test,', ',none,')))
  assert.throws(() => parseCalibratedSeries(csv.replace('-1.5', 'NaN')))
  assert.throws(() => parseCalibratedSeries(csv.replace('2.5', 'NaN')))
})
test('JSON mal formado, HTTP fallido y red caída se convierten en resultados controlados', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response('{bad json'))
  const invalid = await safelyLoad(() => loadJson('/validation.json', validateValidation))
  assert.equal(invalid.ok, false)
  if (!invalid.ok) assert.match(invalid.error, /validation.json.*JSON inválido/)
  t.mock.restoreAll()
  t.mock.method(globalThis, 'fetch', async () => new Response('no', { status: 404 }))
  const http = await safelyLoad(() => loadMonthlySeries('/missing.csv'))
  assert.equal(http.ok, false)
  if (!http.ok) assert.match(http.error, /HTTP 404/)
  t.mock.restoreAll()
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('sin conexión') })
  assert.equal((await safelyLoad(() => loadMonthlySeries('/offline.csv'))).ok, false)
})
test('JSON rechaza estructuras incompletas y números en cadenas', () => {
  for (const validate of [validateValidation, validateMethod, validateManifest, validateCells]) assert.throws(() => validate({}))
  assert.throws(() => validateValidation({ region_id: 'PE-DEMO', methods: { B0: { split: 'test', metrics: { mae: '2', wape: 1, bias: -1 }, n_months_matched: 1, detalle_mensual: 'no disponible' } } }))
})
test('GeoJSON admite Polygon y MultiPolygon; rechaza geometría y propiedades inválidas sin descartar features', async () => {
  const data = JSON.parse(await fixture('cells_PE-DEMO_2024.geojson'))
  assert.equal(validateCells(data).features.length, 4)
  const multi = structuredClone(data)
  multi.features[0].geometry = { type: 'MultiPolygon', coordinates: [data.features[0].geometry.coordinates] }
  assert.equal(validateCells(multi).features[0].geometry.type, 'MultiPolygon')
  for (const mutate of [
    (d: typeof data) => { d.features[0].properties.month = 13 },
    (d: typeof data) => { d.features[0].properties.n_detections = -1 },
    (d: typeof data) => { d.features[0].geometry.coordinates = [] },
    (d: typeof data) => { d.features[0].geometry.coordinates[0][0][0] = 181 },
    (d: typeof data) => { d.features[0].geometry.coordinates[0].pop() },
    (d: typeof data) => { d.features[0].properties.sensor = 'OTHER' },
  ]) { const invalid = structuredClone(data); mutate(invalid); assert.throws(() => validateCells(invalid)) }
})
test('todos los fixtures cumplen el contrato oficial y conservan magnitudes distintas', async () => {
  const monthly = parseMonthlySeries(await fixture('monthly_series.csv'))
  const calibrated = parseCalibratedSeries(await fixture('calibrated_series.csv'))
  const validation = validateValidation(JSON.parse(await fixture('validation.json')))
  const method = validateMethod(JSON.parse(await fixture('method.json')))
  const manifest = validateManifest(JSON.parse(await fixture('manifest.json')))
  const cells = validateCells(JSON.parse(await fixture('cells_PE-DEMO_2024.geojson')))
  assert.equal(manifest.region, 'PE-DEMO')
  assert.match(method.limitations[0], /DEMO/)
  assert.equal(validation.region_id, manifest.region)
  assert.equal(manifest.files.length, 5)
  for (const file of manifest.files) {
    assert.match(file.version, /DEMO/)
    await fixture(file.name)
    if (file.rows !== undefined) assert.equal(file.rows, 6)
  }
  for (const row of monthly) {
    assert.equal(row.region_id, manifest.region)
    assert.match(row.source_version, /DEMO/)
    const matching = cells.features.filter(f => f.properties.year === row.year && f.properties.month === row.month && f.properties.sensor === row.sensor)
    if (row.qc_status !== 'ok') {
      assert.equal(row.indicator, null); assert.equal(row.n_detections, null)
      assert.equal(matching.length, 0)
    } else {
      assert.ok(matching.length > 0)
      assert.equal(matching.reduce((sum, f) => sum + f.properties.n_detections, 0), row.n_detections)
    }
  }
  assert.notEqual(monthly[0].indicator, monthly[0].n_detections)
  for (const feature of cells.features) assert.ok(monthly.some(r => r.year === feature.properties.year && r.month === feature.properties.month && r.sensor === feature.properties.sensor))
  for (const row of calibrated) {
    const viirs = monthly.find(m => m.region_id === row.region_id && m.year === row.year && m.month === row.month && m.sensor === 'VIIRS')
    assert.ok(viirs)
    assert.equal(row.value, row.method === 'B0' ? viirs.indicator : null)
    assert.equal(row.residual, null)
    const period = method[`period_${row.split}`]
    const month = `${row.year}-${String(row.month).padStart(2, '0')}`
    const [start, end] = period.split(':')
    assert.ok(month >= start && month <= end)
  }
  for (const result of Object.values(validation.methods)) {
    assert.deepEqual(result.metrics, { mae: null, wape: null, bias: null })
    assert.equal(result.n_months_matched, 0)
    assert.deepEqual(result.residuals, [])
    assert.equal(result.detalle_mensual, 'no disponible')
  }
})
test('loadDemo carga seis archivos por fetch y aísla errores por archivo', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(await fixture(url.split('/').at(-1)!)))
  const results = await loadDemo('/data/demo/')
  assert.equal(results.length, 6)
  assert.ok(results.every(r => r.ok))
  t.mock.restoreAll()
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('validation.json') ? new Response('oops') : new Response(await fixture(url.split('/').at(-1)!)))
  const partial = await loadDemo('/data/demo')
  assert.equal(partial.filter(r => !r.ok).length, 1)
  assert.equal(partial[2].ok, false)
})
