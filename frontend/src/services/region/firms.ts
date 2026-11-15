/** Lectura y validación de CSV estándar de NASA FIRMS (mismas reglas que allpanina/algoritmo.py). */
export type Sensor = 'MODIS' | 'VIIRS'
export const COLUMNAS_FIRMS = ['latitude', 'longitude', 'acq_date', 'acq_time', 'satellite', 'confidence', 'version', 'type'] as const
export const SATELITES: Record<Sensor, string[]> = { MODIS: ['Terra', 'Aqua', 'T', 'A'], VIIRS: ['SNPP', 'N'] }
export const MODIS_MIN_CONFIDENCE = 30
export const VIIRS_CONFIDENCE = ['n', 'h']

export class ErrorDeEntrada extends Error { constructor(message: string) { super(message); this.name = 'ErrorDeEntrada' } }

export interface Entrada {
  archivo: string; sha256: string; sensor: Sensor; filas: number
  primera_fecha: string | null; ultima_fecha: string | null; versiones: string[]
}

export interface Fila { sensor: Sensor; lon: number; lat: number; utcMs: number; version: string | null }

const num = (s: string | undefined) => (s === undefined || s.trim() === '' ? NaN : Number(s))

/** Recorre las líneas de un texto sin copiarlo entero en un arreglo. */
function* lineas(texto: string): Generator<string> {
  let i = texto.charCodeAt(0) === 0xfeff ? 1 : 0
  while (i < texto.length) {
    let j = texto.indexOf('\n', i)
    if (j < 0) j = texto.length
    const l = texto.charCodeAt(j - 1) === 13 ? texto.slice(i, j - 1) : texto.slice(i, j)
    if (l.trim()) yield l
    i = j + 1
  }
}

/** Sensor por la columna instrument o, si falta, por los satélites. */
export function detectarSensor(texto: string, archivo: string): Sensor {
  const it = lineas(texto)
  const cab = (it.next().value ?? '').split(',').map(s => s.trim())
  const iInst = cab.indexOf('instrument'), iSat = cab.indexOf('satellite')
  for (let k = 0; k < 50; k++) {
    const r = it.next()
    if (r.done) break
    const c = r.value.split(',')
    const inst = iInst >= 0 ? c[iInst]?.trim().toUpperCase() : ''
    if (inst === 'MODIS' || inst === 'VIIRS') return inst
    const sat = iSat >= 0 ? c[iSat]?.trim() : ''
    if (SATELITES.MODIS.includes(sat)) return 'MODIS'
    if (sat) return 'VIIRS'
  }
  throw new ErrorDeEntrada(`${archivo}: no se reconoce si es MODIS o VIIRS (faltan las columnas instrument o satellite).`)
}

/**
 * Valida el CSV completo (como validar_csv) y entrega las filas que pasan los filtros de calidad
 * (type = 0, confianza, coordenadas y fecha válidas). Los duplicados exactos no cambian las
 * celda-días (caen en la misma celda y el mismo día), así que no hace falta buscarlos.
 */
export function leerFirms(texto: string, archivo: string, sensor: Sensor, alAceptar: (f: Fila) => void): Omit<Entrada, 'sha256'> {
  const it = lineas(texto)
  const primera = it.next()
  if (primera.done) throw new ErrorDeEntrada(`${archivo}: el archivo está vacío.`)
  const cab = primera.value.split(',').map(s => s.trim())
  if (!cab.includes('type')) throw new ErrorDeEntrada(`${archivo}: no tiene la columna 'type'. Parece un CSV NRT (casi tiempo real) de FIRMS; solo se acepta el archivo estándar (fire_archive_*.csv).`)
  const faltan = COLUMNAS_FIRMS.filter(c => !cab.includes(c))
  if (faltan.length) throw new ErrorDeEntrada(`${archivo}: faltan columnas de FIRMS: ${faltan.join(', ')}.`)
  const [iLat, iLon, iDate, iTime, iSat, iConf, iVer, iType] = COLUMNAS_FIRMS.map(c => cab.indexOf(c))
  const sats = new Set<string>(), versiones = new Set<string>()
  let filas = 0, minFecha = '', maxFecha = ''
  for (const linea of it) {
    const c = linea.split(',')
    filas++
    const sat = (c[iSat] ?? '').trim()
    if (sat) sats.add(sat)
    const ver = c[iVer] ?? ''
    if (ver !== '') versiones.add(ver)
    const fecha = (c[iDate] ?? '').trim()
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha)
    const hhmm = (c[iTime] ?? '').trim().padStart(4, '0')
    let utc = NaN
    if (m && /^\d{4}$/.test(hhmm)) {
      const y = +m[1], mo = +m[2], d = +m[3], h = +hhmm.slice(0, 2), mi = +hhmm.slice(2)
      const t = Date.UTC(y, mo - 1, d, h, mi)
      const dt = new Date(t)
      if (h < 24 && mi < 60 && dt.getUTCFullYear() === y && dt.getUTCMonth() === mo - 1 && dt.getUTCDate() === d) {
        utc = t
        if (!minFecha || fecha < minFecha) minFecha = fecha
        if (fecha > maxFecha) maxFecha = fecha
      }
    }
    const lat = num(c[iLat]), lon = num(c[iLon])
    if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) || Number.isNaN(utc)) continue
    const tipo = num(c[iType])
    if (!Number.isNaN(tipo) && tipo !== 0) continue
    const conf = (c[iConf] ?? '').trim().toLowerCase()
    if (sensor === 'MODIS' ? !(num(conf) >= MODIS_MIN_CONFIDENCE) : !VIIRS_CONFIDENCE.includes(conf)) continue
    alAceptar({ sensor, lon, lat, utcMs: utc, version: ver === '' ? null : ver })
  }
  if (!filas) throw new ErrorDeEntrada(`${archivo}: no tiene filas.`)
  const vers = [...versiones].sort()
  if (vers.some(v => v.toUpperCase().includes('NRT'))) throw new ErrorDeEntrada(`${archivo}: trae datos NRT (versión ${vers.join(', ')}); solo se acepta el archivo estándar.`)
  const otros = [...sats].filter(s => !SATELITES[sensor].includes(s)).sort()
  if (otros.length) throw new ErrorDeEntrada(`${archivo}: satélite ${otros.join(', ')} no válido para ${sensor}; se espera ${sensor === 'MODIS' ? 'Terra o Aqua' : "Suomi NPP ('SNPP' o 'N')"}. Para NOAA-20 o NOAA-21 haría falta otra calibración.`)
  return { archivo, sensor, filas, primera_fecha: minFecha || null, ultima_fecha: maxFecha || null, versiones: vers }
}
