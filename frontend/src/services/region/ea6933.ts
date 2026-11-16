/**
 * EPSG:6933 (WGS 84 / NSIDC EASE-Grid 2.0 Global): cilíndrica de áreas iguales de Lambert,
 * elipsoidal, paralelo estándar 30°. Fórmulas cerradas (Snyder 1987, 10-15 y 3-16), sin pyproj.
 * La malla de 1 km del algoritmo Python usa esta misma proyección (scripts/03_grid_dedupe.py).
 */
const A = 6378137
const F = 1 / 298.257223563
const ES = 2 * F - F * F
const E = Math.sqrt(ES)
const RAD = Math.PI / 180
const SIN_TS = Math.sin(30 * RAD)
const K0 = Math.cos(30 * RAD) / Math.sqrt(1 - ES * SIN_TS * SIN_TS)
export const CELL_SIZE_M = 1000

function qsfn(sinPhi: number): number {
  const con = E * sinPhi
  return (1 - ES) * (sinPhi / (1 - con * con) - (0.5 / E) * Math.log((1 - con) / (1 + con)))
}
const QP = qsfn(1)

/** lon/lat (grados) -> x/y (metros) */
export function forward(lon: number, lat: number): [number, number] {
  return [A * K0 * lon * RAD, (0.5 * A * qsfn(Math.sin(lat * RAD))) / K0]
}

/** x/y (metros) -> lon/lat (grados); latitud por Newton sobre q(φ). */
export function inverse(x: number, y: number): [number, number] {
  const q = (2 * y * K0) / A
  if (Math.abs(Math.abs(q) - QP) < 1e-15) return [x / (A * K0) / RAD, q > 0 ? 90 : -90]
  let phi = Math.asin(Math.max(-1, Math.min(1, q / QP)))
  for (let i = 0; i < 15; i++) {
    const s = Math.sin(phi), c = Math.cos(phi), con = E * s, com = 1 - con * con
    const d = ((com * com) / (2 * c)) * (q / (1 - ES) - s / com + (0.5 / E) * Math.log((1 - con) / (1 + con)))
    phi += d
    if (Math.abs(d) < 1e-15) break
  }
  return [x / (A * K0) / RAD, phi / RAD]
}

/** Índice de la celda de 1 km que contiene el punto. */
export function cellOf(lon: number, lat: number): [number, number] {
  const [x, y] = forward(lon, lat)
  return [Math.floor(x / CELL_SIZE_M), Math.floor(y / CELL_SIZE_M)]
}

/** Límites WGS84 (oeste, sur, este, norte) de la celda (x_km, y_km), sin redondear. */
export function cellBounds(xKm: number, yKm: number, sizeKm = 1): [number, number, number, number] {
  const [w, s] = inverse(xKm * CELL_SIZE_M, yKm * CELL_SIZE_M)
  const [e, n] = inverse((xKm + sizeKm) * CELL_SIZE_M, (yKm + sizeKm) * CELL_SIZE_M)
  return [w, s, e, n]
}
