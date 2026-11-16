import type { CellsData, Manifest } from '../../types/data.ts'
import type { MapSelection } from '../../types/selection.ts'
import type { MapCellProperties } from './mapExploration.ts'
const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', timeZone: 'UTC' })
const MONTH_NAMES_EN = Array.from({ length: 12 }, (_, i) => monthName.format(new Date(Date.UTC(2024, i, 1))))

export function cellsFile(manifest: Manifest, selection: Pick<MapSelection, 'region' | 'year'>): string | null {
  if (manifest.region_id !== selection.region || selection.year === null) return null
  const name = `cells_${selection.region}_${selection.year}.geojson`
  return manifest.files.includes(name) ? name : null
}

export function filterCells(data: CellsData, selection: MapSelection): CellsData {
  return { type: 'FeatureCollection', features: data.features.filter(({ properties: p }) => p.year === selection.year && p.month === selection.month && p.sensor_group === selection.sensor) }
}

/** DOM text only: GeoJSON identifiers must never be interpolated as HTML. */
export function cellPopup(properties: MapCellProperties, options: { coveredMonths?: number; national?: boolean } = {}): HTMLElement {
  const content = document.createElement('div')
  content.className = 'cell-observation-popup'
  const append = (tag: string, text: string, className?: string) => {
    const node = document.createElement(tag); node.textContent = text
    if (className) node.className = className
    content.append(node)
  }
  const annual = properties.month === undefined
  append('h3', 'Satellite observation')
  append('p', `${annual ? `Year ${properties.year}` : `${MONTH_NAMES_EN[properties.month! - 1]} ${properties.year}`} · ${properties.sensor_group}`)
  if (options.national) append('p', '10 km national grid square · Peru context. A border square may include observations from neighbouring territories. On-screen clipping keeps the full original value, with no proportional split.')
  append('strong', `${new Intl.NumberFormat('en-US', { useGrouping: false }).format(properties.cell_days)} ${options.national ? '1 km cell-days' : properties.cell_days === 1 ? 'day' : 'days'}`, 'cell-observation-value')
  append('p', options.national ? `Sum of 1 km cell-day pairs inside this square during ${annual ? 'the available months of the year' : 'the selected month'}. They are not distinct days of the 10 km square nor a department total.` : properties.cell_days === 0 ? 'No thermal detections recorded in this cell during the usable period.'
    : annual ? 'Sum of the days with thermal detections in this cell over the available months of the year. They need not be consecutive.'
    : 'With thermal detections recorded in this cell during the selected month.')
  if (annual) append('p', options.coveredMonths === undefined ? 'Monthly availability not available.' : `${options.coveredMonths === 12 ? 'Complete year' : 'Partial year'} · ${options.coveredMonths}/12 usable months.`)
  append('p', properties.cell_days === 0 ? 'A recorded zero does not prove there was no fire.' : 'This is not a number of fires.', 'cell-observation-note')
  append('small', `Cell identifier: ${properties.cell_id}`)
  return content
}

export function cellsBounds(data: CellsData): [[number, number], [number, number]] | null {
  let west = Infinity, south = Infinity, east = -Infinity, north = -Infinity
  for (const { geometry } of data.features) {
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
    for (const rings of polygons) for (const ring of rings) for (const [lon, lat] of ring) {
      west = Math.min(west, lon); east = Math.max(east, lon)
      south = Math.min(south, lat); north = Math.max(north, lat)
    }
  }
  return Number.isFinite(west) ? [[west, south], [east, north]] : null
}
