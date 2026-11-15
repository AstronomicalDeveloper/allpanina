import type { CellsData, MonthlyRecord, Sensor } from '../../types/data.ts'
import type { MapSelection } from '../../types/selection.ts'

export type MapCellProperties = Omit<CellsData['features'][number]['properties'], 'month'> & { month?: number }
export interface MapCells {
  type: 'FeatureCollection'
  features: { type: 'Feature'; properties: MapCellProperties; geometry: CellsData['features'][number]['geometry'] }[]
}
export interface CoveredMonth {
  month: number
  status: 'ok' | 'missing' | 'unpublished' | 'unknown'
}
export interface CellMonth extends CoveredMonth { value: number | null }
export interface MapYear {
  annual: Record<Sensor, MapCells>
  coverage: Record<Sensor, CoveredMonth[]>
  activity: Map<string, Map<number, number>>
}
const cellKey = (sensor: Sensor, id: string) => JSON.stringify([sensor, id])

/** UI sums only; source features and scientific files remain unchanged. O(features). */
export function buildMapYear(data: CellsData, period: Pick<MapSelection, 'region' | 'year'>, records?: MonthlyRecord[]): MapYear {
  const coverage = {} as MapYear['coverage']
  const sums: Record<Sensor, number[]> = { MODIS: Array(12).fill(0), VIIRS: Array(12).fill(0) }
  for (const sensor of ['MODIS', 'VIIRS'] as const) {
    const rows = records?.filter(r => r.region_id === period.region && r.year === period.year && r.sensor_group === sensor)
    const months = new Map(rows?.map(r => [r.month, r]))
    if (rows && months.size !== rows.length) throw new Error('Cobertura mensual duplicada para región/año/sensor')
    coverage[sensor] = Array.from({ length: 12 }, (_, i) => ({ month: i + 1,
      status: records === undefined ? 'unknown' : months.get(i + 1)?.status ?? 'unpublished' }))
  }
  const annual: MapYear['annual'] = { MODIS: { type: 'FeatureCollection', features: [] }, VIIRS: { type: 'FeatureCollection', features: [] } }
  const groups = new Map<string, MapCells['features'][number]>()
  const activity: MapYear['activity'] = new Map()
  const geometries = new Map<string, string>()
  const seen = new Set<string>()
  for (const feature of data.features) {
    const p = feature.properties
    if (p.year !== period.year) continue
    const uniqueKey = JSON.stringify([p.cell_id, p.year, p.month, p.sensor_group])
    if (seen.has(uniqueKey)) throw new Error(`Registro geográfico duplicado: ${uniqueKey}`)
    seen.add(uniqueKey)
    const geometry = JSON.stringify(feature.geometry)
    if (geometries.has(p.cell_id) && geometries.get(p.cell_id) !== geometry) throw new Error(`Geometrías incompatibles para cell_id ${p.cell_id}`)
    geometries.set(p.cell_id, geometry)
    if (records !== undefined && coverage[p.sensor_group][p.month - 1].status !== 'ok') throw new Error(`GeoJSON con actividad en mes sin cobertura utilizable: ${p.year}-${p.month} ${p.sensor_group}`)
    sums[p.sensor_group][p.month - 1] += p.cell_days
    const key = cellKey(p.sensor_group, p.cell_id)
    let group = groups.get(key)
    if (!group) {
      group = { type: 'Feature', geometry: feature.geometry, properties: { cell_id: p.cell_id, year: p.year, sensor_group: p.sensor_group, cell_days: 0 } }
      groups.set(key, group); annual[p.sensor_group].features.push(group); activity.set(key, new Map())
    }
    group.properties.cell_days += p.cell_days
    activity.get(key)!.set(p.month, p.cell_days)
  }
  // A complete sparse export plus usable regional rows permits interpreting an
  // absent cell record as zero observed activity. Never infer sensor/cloud coverage.
  for (const r of records ?? []) {
    if (r.region_id === period.region && r.year === period.year && r.status === 'ok' && sums[r.sensor_group][r.month - 1] !== r.cell_days) {
      throw new Error(`GeoJSON y monthly_series.csv no coinciden: ${r.year}-${r.month} ${r.sensor_group}`)
    }
  }
  return { annual, coverage, activity }
}

export function cellMonthlyActivity(model: MapYear, cell: MapCellProperties): CellMonth[] {
  const activity = model.activity.get(cellKey(cell.sensor_group, cell.cell_id))
  return model.coverage[cell.sensor_group].map(m => ({ ...m, value: activity?.get(m.month) ?? (m.status === 'ok' ? 0 : null) }))
}
