import { MONTHS } from './calendar.ts'
import type { CellsData, Manifest } from '../../types/data.ts'
import type { MapSelection } from '../../types/selection.ts'
import type { MapCellProperties } from './mapExploration.ts'

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
  append('h3', 'Observación satelital')
  append('p', `${annual ? `Año ${properties.year}` : `${MONTHS[properties.month! - 1]} de ${properties.year}`} · ${properties.sensor_group}`)
  if (options.national) append('p', 'Cuadrícula nacional de 10 km · contexto Perú. Una celda fronteriza puede incluir observaciones de territorios vecinos. El recorte visual conserva el valor original completo, sin reparto proporcional.')
  append('strong', `${new Intl.NumberFormat('es-PE', { useGrouping: false }).format(properties.cell_days)} ${options.national ? 'días-celda de 1 km' : properties.cell_days === 1 ? 'día' : 'días'}`, 'cell-observation-value')
  append('p', options.national ? `Suma de pares celda-día de 1 km dentro de esta cuadrícula durante ${annual?'los meses disponibles del año':'el mes seleccionado'}. No son días distintos de la celda de 10 km ni un total departamental.` : properties.cell_days === 0 ? 'Sin detecciones térmicas registradas en esta celda durante el período utilizable.'
    : annual ? 'Suma de días con detecciones térmicas en esta celda durante los meses disponibles del año. No tienen que ser consecutivos.'
    : 'Con detecciones térmicas registradas en esta celda durante el mes seleccionado.')
  if (annual) append('p', options.coveredMonths === undefined ? 'Disponibilidad mensual no disponible.' : `${options.coveredMonths === 12 ? 'Año completo' : 'Año parcial'} · ${options.coveredMonths}/12 meses utilizables.`)
  append('p', properties.cell_days === 0 ? 'Cero registrado no demuestra ausencia de fuego.' : 'No equivale a ese número de incendios.', 'cell-observation-note')
  append('small', `Identificador de celda: ${properties.cell_id}`)
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
