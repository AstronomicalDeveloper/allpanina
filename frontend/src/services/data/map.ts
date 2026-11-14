import type { CellsData, Manifest } from '../../types/data.ts'
import type { MapSelection } from '../../types/selection.ts'

export function cellsFile(manifest: Manifest, selection: Pick<MapSelection, 'region' | 'year'>): string | null {
  if (manifest.region_id !== selection.region || selection.year === null) return null
  const name = `cells_${selection.region}_${selection.year}.geojson`
  return manifest.files.includes(name) ? name : null
}

export function filterCells(data: CellsData, selection: MapSelection): CellsData {
  return { type: 'FeatureCollection', features: data.features.filter(({ properties: p }) => p.year === selection.year && p.month === selection.month && p.sensor_group === selection.sensor) }
}

/** DOM text only: GeoJSON identifiers must never be interpolated as HTML. */
export function cellPopup(properties: CellsData['features'][number]['properties']): HTMLElement {
  const content = document.createElement('div')
  content.textContent = `Celda: ${properties.cell_id} · ${properties.sensor_group} · ${properties.month}/${properties.year} · ${properties.cell_days} días-celda`
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
