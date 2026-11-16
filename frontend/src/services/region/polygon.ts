/** Polígonos GeoJSON (WGS84): punto dentro (centro de celda) con índice por franjas, caja y área. */
import { forward } from './ea6933.ts'

type Ring = number[][]
export type Geometry = { type: 'Polygon'; coordinates: Ring[] } | { type: 'MultiPolygon'; coordinates: Ring[][] }
export type Bbox = [number, number, number, number]

export class RegionShape {
  readonly bbox: Bbox
  readonly area_km2: number
  private edges: Float64Array            // x1, y1, x2, y2 por arista
  private bands: Uint32Array[]
  private y0: number
  private dy: number
  private nb: number

  constructor(polygons: Ring[][]) {
    const all: number[] = []
    let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity, area = 0
    for (const rings of polygons) {
      if (!Array.isArray(rings) || !rings.length) throw new Error('Empty or invalid polygon.')
      rings.forEach((ring, k) => {
        if (!Array.isArray(ring) || ring.length < 4) throw new Error('Each ring needs at least four positions.')
        for (const point of ring) {
          if (!Array.isArray(point) || point.length < 2 || !Number.isFinite(point[0]) || !Number.isFinite(point[1]) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90) throw new Error('Invalid coordinates: use WGS84 longitude and latitude.')
        }
        if (ring[0][0] !== ring.at(-1)![0] || ring[0][1] !== ring.at(-1)![1]) throw new Error('The polygon ring must be closed.')
        let a = 0
        for (let i = 0; i < ring.length - 1; i++) {
          const [x1, y1] = ring[i], [x2, y2] = ring[i + 1]
          all.push(x1, y1, x2, y2)
          w = Math.min(w, x1); e = Math.max(e, x1); s = Math.min(s, y1); n = Math.max(n, y1)
          const [px1, py1] = forward(x1, y1), [px2, py2] = forward(x2, y2)
          a += px1 * py2 - px2 * py1
        }
        area += (k === 0 ? 1 : -1) * Math.abs(a) / 2
      })
    }
    if (!all.length) throw new Error('The region polygon is empty.')
    if (!Number.isFinite(area) || area <= 0) throw new Error('The polygon must have a positive area.')
    this.bbox = [w, s, e, n]
    this.area_km2 = area / 1e6
    this.edges = Float64Array.from(all)
    const count = this.edges.length / 4
    const nb = Math.max(1, Math.min(4096, Math.ceil(count / 8)))
    this.y0 = s; this.dy = (n - s) / nb || 1; this.nb = nb
    const lists: number[][] = Array.from({ length: nb }, () => [])
    for (let i = 0; i < count; i++) {
      const ya = this.edges[4 * i + 1], yb = this.edges[4 * i + 3]
      const a = this.band(Math.min(ya, yb)), b = this.band(Math.max(ya, yb))
      for (let j = a; j <= b; j++) lists[j].push(i)
    }
    this.bands = lists.map(l => Uint32Array.from(l))
  }

  private band(y: number) { return Math.max(0, Math.min(this.nb - 1, Math.floor((y - this.y0) / this.dy))) }

  /** Par/impar sobre todos los anillos (igual que shapely.contains_xy fuera del borde exacto). */
  contains(x: number, y: number): boolean {
    const [w, s, e, n] = this.bbox
    if (x < w || x > e || y < s || y > n) return false
    const list = this.bands[this.band(y)], ed = this.edges
    let inside = false
    for (let k = 0; k < list.length; k++) {
      const i = 4 * list[k], x1 = ed[i], y1 = ed[i + 1], x2 = ed[i + 2], y2 = ed[i + 3]
      if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) inside = !inside
    }
    return inside
  }

  static fromGeoJson(value: unknown): RegionShape {
    const polygons: Ring[][] = []
    const add = (g: unknown) => {
      const geom = g as Geometry | null
      if (!geom || typeof geom !== 'object') return
      if (geom.type === 'Polygon') polygons.push(geom.coordinates)
      else if (geom.type === 'MultiPolygon') polygons.push(...geom.coordinates)
    }
    const v = value as { type?: string; features?: { geometry: unknown }[]; geometry?: unknown }
    if (v?.type === 'FeatureCollection') v.features?.forEach(f => add(f.geometry))
    else if (v?.type === 'Feature') add(v.geometry)
    else add(v)
    if (!polygons.length) throw new Error('The file has no polygons (expected GeoJSON with Polygon or MultiPolygon).')
    return new RegionShape(polygons)
  }

  static fromBbox([w, s, e, n]: Bbox): RegionShape {
    if (!(w >= -180 && w < e && e <= 180 && s >= -90 && s < n && n <= 90)) throw new Error('Invalid box: the order is west, south, east, north.')
    return new RegionShape([[[[w, s], [e, s], [e, n], [w, n], [w, s]]]])
  }
}
