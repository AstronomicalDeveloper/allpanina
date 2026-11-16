/**
 * Descarga de NASA FIRMS desde el navegador (API de área, producto estándar), como allpanina/descarga.py.
 * La base se puede cambiar a un proxy propio (VITE_FIRMS_BASE=/firms) si FIRMS bloquea CORS.
 */
export const FUENTES = { MODIS: 'MODIS_SP', VIIRS: 'VIIRS_SNPP_SP' } as const
export const MAX_DIAS = 5
const VENTANA_MS = 600_000, MAX_TX = 4000

export class ErrorDeDescarga extends Error { constructor(m: string) { super(m); this.name = 'ErrorDeDescarga' } }

export function tramos(desde: string, hasta: string, dias = MAX_DIAS): [string, number][] {
  for (const fecha of [desde, hasta]) {
    const ms = Date.parse(`${fecha}T00:00:00Z`)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(ms) || new Date(ms).toISOString().slice(0, 10) !== fecha) throw new ErrorDeDescarga('Invalid date: use YYYY-MM-DD.')
  }
  if (!Number.isInteger(dias) || dias < 1 || dias > MAX_DIAS) throw new ErrorDeDescarga(`Each request accepts 1 to ${MAX_DIAS} days.`)
  let d = Date.parse(`${desde}T00:00:00Z`)
  const h = Date.parse(`${hasta}T00:00:00Z`)
  if (!(h >= d)) throw new ErrorDeDescarga('The end date is before the start date.')
  const out: [string, number][] = []
  while (d <= h) {
    const n = Math.min(dias, Math.round((h - d) / 864e5) + 1)
    out.push([new Date(d).toISOString().slice(0, 10), n])
    d += n * 864e5
  }
  return out
}

export interface OpcionesDescarga {
  mapKey: string; bbox: [number, number, number, number]; desde: string; hasta: string
  base?: string; progreso?: (sensor: string, i: number, n: number, filas: number) => void
  fetcher?: typeof fetch; dormir?: (ms: number) => Promise<void>; signal?: AbortSignal
}

export async function descargarFirms(op: OpcionesDescarga): Promise<{ MODIS: string; VIIRS: string; pedidos: number }> {
  if (!/^[0-9A-Za-z]{32}$/.test(op.mapKey)) throw new ErrorDeDescarga('The FIRMS MAP_KEY must have 32 characters. Request one for free at firms.modaps.eosdis.nasa.gov/api/map_key/')
  const [w, s, e, n] = op.bbox
  if (!(w >= -180 && w < e && e <= 180 && s >= -90 && s < n && n <= 90)) throw new ErrorDeDescarga('Invalid box: the order is west, south, east, north.')
  const area = op.bbox.map(v => String(Math.round(v * 1e4) / 1e4)).join(',')
  const base = (op.base ?? 'https://firms.modaps.eosdis.nasa.gov').replace(/\/$/, '')
  const pedir = op.fetcher ?? fetch, dormir = op.dormir ?? (ms => new Promise(r => setTimeout(r, ms)))
  const partes = tramos(op.desde, op.hasta)
  const hist: [number, number][] = []
  let pedidos = 0
  const out = { MODIS: '', VIIRS: '' }
  for (const sensor of ['MODIS', 'VIIRS'] as const) {
    let cab: string | null = null, filas = 0
    const lineas: string[] = []
    for (const [i, [dia, k]] of partes.entries()) {
      for (;;) {                                         // tope de transacciones por 10 minutos
        const ahora = Date.now()
        while (hist.length && ahora - hist[0][0] >= VENTANA_MS) hist.shift()
        if (hist.reduce((a, [, t]) => a + t, 0) + k <= MAX_TX) { hist.push([ahora, k]); break }
        await dormir(VENTANA_MS - (ahora - hist[0][0]) + 500)
      }
      const url = `${base}/api/area/csv/${op.mapKey}/${FUENTES[sensor]}/${area}/${k}/${dia}`
      let texto: string
      for (let intento = 0; ; intento++) {
        let r: Response
        try { r = await pedir(url, { signal: op.signal }) }
        catch (err) {
          if (op.signal?.aborted) throw err
          if (intento < 2) { await dormir(5000 * (intento + 1)); continue }
          throw new ErrorDeDescarga('The browser could not connect to FIRMS (possibly blocked by CORS, or no network). Download the CSV files from FIRMS and upload them with "I have the files".')
        }
        if ([429, 500, 502, 503, 504].includes(r.status) && intento < 3) { await dormir(30000 * (intento + 1)); continue }
        if (!r.ok) throw new ErrorDeDescarga(`FIRMS answered HTTP ${r.status}. Check the MAP_KEY and the region.`)
        texto = await r.text()
        const c = texto.trimStart().slice(0, 200).toLowerCase()
        if (c.startsWith('latitude')) break
        if (c.includes('limit') && intento < 3) { await dormir(VENTANA_MS); continue }
        throw new ErrorDeDescarga(`FIRMS returned no data: ${texto.trim().slice(0, 160)}`)
      }
      pedidos++
      const ls = texto.split(/\r?\n/).filter(l => l.trim())
      if (cab === null) cab = ls[0]
      else if (ls[0] !== cab) throw new ErrorDeDescarga(`${FUENTES[sensor]}: FIRMS changed the columns between requests.`)
      for (let j = 1; j < ls.length; j++) lineas.push(ls[j])
      filas += ls.length - 1
      op.progreso?.(sensor, i + 1, partes.length, filas)
    }
    out[sensor] = [cab ?? '', ...lineas].join('\n') + '\n'
  }
  return { ...out, pedidos }
}
