import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { CellsData, MonthlyRecord, Sensor } from '../src/types/data.ts'
import { buildMapYear, cellMonthlyActivity } from '../src/services/data/mapExploration.ts'

const geometry: CellsData['features'][number]['geometry'] = { type: 'Polygon', coordinates: [[[-75, -10], [-74.99, -10], [-74.99, -9.99], [-75, -9.99], [-75, -10]]] }
const feature = (cell_id: string, month: number, sensor_group: Sensor, cell_days: number): CellsData['features'][number] => ({
  type: 'Feature', geometry, properties: { cell_id, year: 2026, month, sensor_group, cell_days },
})
const row = (month: number, sensor_group: Sensor, cell_days: number | null): MonthlyRecord => ({
  region_id: 'REGION', year: 2026, month, sensor_group, cell_days, status: cell_days === null ? 'missing' : 'ok', source_version: '2', updated_at: '2026-11-14',
})
const source: CellsData = { type: 'FeatureCollection', features: [feature('A', 1, 'MODIS', 2), feature('A', 2, 'MODIS', 3), feature('B', 2, 'MODIS', 4), feature('A', 1, 'VIIRS', 9)] }
const records = [row(1, 'MODIS', 2), row(2, 'MODIS', 7), row(3, 'MODIS', 0), row(4, 'MODIS', null), row(1, 'VIIRS', 9), row(2, 'VIIRS', 0)]
const period = { region: 'REGION', year: 2026 }

test('anual agrupa una celda/sensor, conserva geometría y fuente y coincide con sumas mensuales', () => {
  const before = structuredClone(source)
  const model = buildMapYear(source, period, [...records, { ...records[0], region_id: 'OTRA', cell_days: 999 }])
  assert.deepEqual(model.annual.MODIS.features.map(f => [f.properties.cell_id, f.properties.cell_days]), [['A', 5], ['B', 4]])
  assert.equal(model.annual.VIIRS.features[0].properties.cell_days, 9)
  assert.equal(model.annual.MODIS.features[0].properties.month, undefined)
  assert.equal(model.annual.MODIS.features[0].geometry, geometry)
  for (const sensor of ['MODIS', 'VIIRS'] as const) {
    assert.equal(model.annual[sensor].features.reduce((sum, f) => sum + f.properties.cell_days, 0), records.filter(r => r.sensor_group === sensor).reduce((sum, r) => sum + (r.cell_days ?? 0), 0))
  }
  assert.deepEqual(source, before)
})

test('cobertura distingue cero observado, sin dato y no publicado; no presupone doce meses', () => {
  const model = buildMapYear(source, period, records)
  const months = cellMonthlyActivity(model, model.annual.MODIS.features[0].properties)
  assert.deepEqual(months.slice(0, 5), [
    { month: 1, status: 'ok', value: 2 }, { month: 2, status: 'ok', value: 3 },
    { month: 3, status: 'ok', value: 0 }, { month: 4, status: 'missing', value: null }, { month: 5, status: 'unpublished', value: null },
  ])
  assert.equal(model.coverage.MODIS.filter(m => m.status === 'ok').length, 3)
  assert.equal(cellMonthlyActivity(model, model.annual.VIIRS.features[0].properties)[1].value, 0)
  const unknown = buildMapYear(source, period)
  assert.equal(cellMonthlyActivity(unknown, unknown.annual.MODIS.features[0].properties)[2].value, null)
})

test('duplicados, geometrías incompatibles y totales inconsistentes son errores explícitos', () => {
  assert.throws(() => buildMapYear({ ...source, features: [...source.features, source.features[0]] }, period, records), /duplicado/)
  const changed = structuredClone(source)
  changed.features[1].geometry = { type: 'Polygon', coordinates: [[[-74, -10], [-73.99, -10], [-73.99, -9.99], [-74, -9.99], [-74, -10]]] }
  assert.throws(() => buildMapYear(changed, period, records), /Geometrías incompatibles.*A/)
  assert.throws(() => buildMapYear(source, period, records.map(r => r.sensor_group === 'MODIS' && r.month === 1 ? { ...r, cell_days: 0 } : r)), /no coinciden/)
  assert.throws(() => buildMapYear(source, period, records.filter(r => !(r.sensor_group === 'MODIS' && r.month === 1))), /sin cobertura utilizable/)
})
