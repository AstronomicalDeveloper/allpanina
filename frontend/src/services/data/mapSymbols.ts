import type { FeatureCollection, Point } from 'geojson'
import type { MapCells } from './mapExploration'
import type { MapSelection } from '../../types/selection'
export type SummaryPeriod = Pick<MapSelection, 'region' | 'year' | 'month' | 'sensor' | 'scope'>
export type SummaryPoints = FeatureCollection<Point, {
  cell_id: string; cell_days: number; region_id: string; year: number; month: number | null; sensor_group: string; scope: string
}>
/** Find an interior point using a horizontal scan through the outer ring.
 * Ring intersections partition the scan; exclude holes and choose the widest interior interval.
 * Derived positions locate symbols only and never replace source geometries.
 */
export function representativePoint(geometry: MapCells['features'][number]['geometry']): [number, number] {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  let best: [number, number] | null = null, widest = -1
  for (const rings of polygons) {
    const outer = rings[0]
    const south = Math.min(...outer.map(p => p[1])), north = Math.max(...outer.map(p => p[1]))
    // Avoid a scan coincident with a vertex, including concave rings and holes.
    const ys = [...new Set(rings.flatMap(ring => ring.map(p => p[1])))].sort((a,b)=>a-b)
    const middle = (south+north)/2
    let y = middle
    if (ys.includes(y)) {
      const intervals = ys.slice(1).map((v,i)=>[ys[i],v]).filter(([low,high])=>high>low)
      intervals.sort((a,b)=>Math.abs((a[0]+a[1])/2-middle)-Math.abs((b[0]+b[1])/2-middle))
      if (!intervals.length) continue
      y = (intervals[0][0]+intervals[0][1])/2
    }
    const intersections: number[] = []
    for (const ring of rings) for (let i=1;i<ring.length;i++) {
      const [x1,y1]=ring[i-1], [x2,y2]=ring[i]
      if ((y1>y)!==(y2>y)) intersections.push(x1+(y-y1)*(x2-x1)/(y2-y1))
    }
    intersections.sort((a,b)=>a-b)
    for (let i=0;i+1<intersections.length;i+=2) {
      const width=intersections[i+1]-intersections[i]
      if (width>widest && width>0) {widest=width;best=[(intersections[i]+intersections[i+1])/2,y]}
    }
  }
  if (!best) throw new Error('No se pudo localizar un punto interior de la celda')
  return best
}
/** One interior location per unique cell; values and original geometry are unchanged. */
export function prepareSummaryPoints(cells: MapCells, period: SummaryPeriod): SummaryPoints {
  const seen = new Set<string>()
  return { type: 'FeatureCollection', features: cells.features.map(feature => {
    const p = feature.properties
    if (seen.has(p.cell_id)) throw new Error(`Celda repetida en resumen: ${p.cell_id}`)
    seen.add(p.cell_id)
    if (p.year !== period.year || p.sensor_group !== period.sensor || ((period.scope ?? 'year') === 'month' && p.month !== period.month)) throw new Error('El resumen no puede mezclar períodos o sensores')
    if (!Number.isFinite(p.cell_days) || p.cell_days < 0) throw new Error('Días-celda inválidos en resumen')
    return { type: 'Feature', geometry: { type: 'Point', coordinates: representativePoint(feature.geometry) }, properties: {
      cell_id: p.cell_id, cell_days: p.cell_days, region_id: period.region, year: p.year,
      month: period.scope === 'month' ? period.month : null, sensor_group: p.sensor_group, scope: period.scope ?? 'year',
    } }
  }) }
}
