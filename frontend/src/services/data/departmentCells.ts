import {territorialClip} from './territorialClip'
import type { DepartmentFeature } from '../../types/departmentNavigation'
import type { MapCells } from './mapExploration'
import { representativePoint } from './mapSymbols'

type Geometry = MapCells['features'][number]['geometry']
const clipped = new WeakMap<Geometry, WeakMap<DepartmentFeature, Geometry | null>>()
const polygons = (geometry: Geometry) => geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
const clippers = new WeakMap<DepartmentFeature, ReturnType<typeof territorialClip>>()
function clipper(department: DepartmentFeature) {
 let clip=clippers.get(department)
 if(!clip){clip=territorialClip(department.geometry);clippers.set(department,clip)}
 return clip
}
const empty = (): MapCells => ({ type: 'FeatureCollection', features: [] })

/** Display-only intersection. Properties, including cell_days, retain their original identity. */
export function clipDepartmentCells(cells: MapCells, department: DepartmentFeature): MapCells {
  const bounds = department.properties.bounds
  return { type: 'FeatureCollection', features: cells.features.flatMap(feature => {
    let cache = clipped.get(feature.geometry)
    if (!cache) { cache = new WeakMap(); clipped.set(feature.geometry, cache) }
    if (!cache.has(department)) {
      const coords = polygons(feature.geometry).flat(2)
      const xs = coords.map(p => p[0]), ys = coords.map(p => p[1])
      const outside = Math.max(...xs) < bounds[0] || Math.min(...xs) > bounds[2] || Math.max(...ys) < bounds[1] || Math.min(...ys) > bounds[3]
      cache.set(department, outside ? null : clipper(department)(feature.geometry))
    }
    const geometry = cache.get(department)
    return geometry ? [{ ...feature, geometry }] : []
  }) }
}

/** Pixel-sized location squares, clipped to the navigation boundary, never scientific area. */
export function departmentSquares(cells: MapCells, department: DepartmentFeature, zoom: number): MapCells {
  if (zoom >= 9) return empty()
  const world = 512 * 2 ** zoom
  const half = (zoom <= 3 ? 6 : zoom >= 8 ? 9 : 6 + (zoom - 3) * .6) / 2
  const projectY = (lat: number) => (1 - Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360)) / Math.PI) / 2 * world
  const latitude = (y: number) => Math.atan(Math.sinh(Math.PI * (1 - 2 * y / world))) * 180 / Math.PI
  return { type: 'FeatureCollection', features: cells.features.flatMap(feature => {
    const [lon, lat] = representativePoint(feature.geometry)
    const x = (lon + 180) / 360 * world, y = projectY(lat)
    const west = (x - half) / world * 360 - 180, east = (x + half) / world * 360 - 180
    const south = latitude(y + half), north = latitude(y - half)
    const intersection = clipper(department)({type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]})
    return intersection ? [{ ...feature, geometry: intersection }] : []
  }) }
}
