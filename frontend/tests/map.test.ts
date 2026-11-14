import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { cellsBounds, cellsFile, filterCells } from '../src/services/data/map.ts'
import { validateCells, validateManifest } from '../src/services/data/validators.ts'

const data = validateCells(JSON.parse(await readFile(new URL('../public/data/demo/cells_PE-DEMO_2024.geojson', import.meta.url), 'utf8')))
const manifest = validateManifest(JSON.parse(await readFile(new URL('../public/data/demo/manifest.json', import.meta.url), 'utf8')))
test('GeoJSON oficial conserva sus cuatro features y el nombre cell_days', () => {
  assert.equal(data.features.length, 4)
  assert.equal(data.features[0].properties.cell_id, 'DEMO-cell-001')
  assert.equal(data.features[0].properties.cell_days, 3)
  assert.deepEqual(cellsBounds(data), [[-75.1, -12.1], [-75, -12]])
})
test('filtros espaciales preservan cero y no generan datos para períodos ausentes', () => {
  const input = { region: 'PE-DEMO', year: 2024, month: 8, sensor: 'MODIS' as const }
  assert.equal(filterCells(data, input).features[0].properties.cell_days, 3)
  assert.equal(filterCells(data, { ...input, sensor: 'VIIRS' }).features[0].properties.cell_days, 5)
  assert.equal(filterCells(data, { ...input, month: 9 }).features[0].properties.cell_days, 0)
  assert.equal(filterCells(data, { ...input, month: 10 }).features.length, 0)
  assert.equal(filterCells(data, { ...input, year: 2023 }).features.length, 0)
  assert.equal(data.features.length, 4)
})
test('solo se solicitan archivos declarados para región/año; no hay fallback DEMO', () => {
  assert.equal(cellsFile(manifest, { region: 'PE-DEMO', year: 2024 }), 'cells_PE-DEMO_2024.geojson')
  assert.equal(cellsFile(manifest, { region: 'OTRA', year: 2024 }), null)
  assert.equal(cellsFile(manifest, { region: 'PE-DEMO', year: 2023 }), null)
})
test('validador compartido rechaza explícitamente features corruptas sin descartarlas', () => {
  for (const mutate of [
    (d: typeof data) => { d.features[0].properties.month = 13 },
    (d: typeof data) => { d.features[0].properties.cell_days = -1 },
    (d: typeof data) => { d.features[0].properties.cell_days = Infinity },
    (d: typeof data) => { d.features[0].properties.year = NaN },
    (d: typeof data) => { d.features[0].geometry.coordinates = [] },
  ]) { const broken = structuredClone(data); mutate(broken); assert.throws(() => validateCells(broken)) }
  const old = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: { id: 'old', sensor: 'MODIS_TA', year: 2024, month: 8, cell_days: 4 }, geometry: data.features[0].geometry }] }
  assert.throws(() => validateCells(old), /cell_id/)
})
