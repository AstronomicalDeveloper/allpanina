/** Países y regiones de primer nivel (archivos estáticos de public/cartography/world, script 11). */
export interface Pais { iso3: string; iso2: string | null; nombre: string; archivo: string; regiones: number }
export interface IndiceMundo { fuente: string; licencia: string; paises: Pais[] }
export interface RegionMundo { id: string; nombre: string; zona_horaria: string | null; geometry: unknown; bbox: [number, number, number, number] }

const base = () => `${import.meta.env?.BASE_URL ?? '/'}cartography/world`
const nombres = (() => { try { return new Intl.DisplayNames(['en'], { type: 'region' }) } catch { return null } })()

export function nombrePais(p: Pick<Pais, 'iso2' | 'nombre'>): string {
  try { return (p.iso2 && nombres?.of(p.iso2)) || p.nombre } catch { return p.nombre }
}

/** Lee JSON estático. Un 404, o el index.html que devuelve un servidor SPA para archivos que no existen, se informan como "no publicado". */
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
async function leerJson(ruta: string, que: string, signal?: AbortSignal): Promise<unknown> {
  let r: Response
  try { r = await fetch(ruta, { signal }) }
  catch (e) { if (signal?.aborted) throw e; throw new Error(`Could not connect to read ${que}.`, { cause: e }) }
  if (!r.ok) throw new Error(r.status === 404 ? `Not found on this server: ${que} (${ruta}).` : `${cap(que)}: the server answered HTTP ${r.status}.`)
  const texto = await r.text()
  try { return JSON.parse(texto) }
  catch { throw new Error(texto.trimStart().startsWith("<") ? `Not found on this server: ${que} (${ruta}).` : `${cap(que)}: damaged file, not valid JSON.`) }
}

export async function cargarIndice(signal?: AbortSignal): Promise<IndiceMundo> {
  const v = await leerJson(`${base()}/index.json`, 'the country list', signal) as IndiceMundo
  if (!Array.isArray(v?.paises) || v.paises.some(p => typeof p?.iso3 !== 'string' || typeof p?.archivo !== 'string')) throw new Error('The country list has an invalid format.')
  return v
}

export async function cargarRegiones(pais: Pais, signal?: AbortSignal): Promise<RegionMundo[]> {
  const fc = await leerJson(`${base()}/${encodeURIComponent(pais.archivo)}`, `the boundaries of ${nombrePais(pais)}`, signal) as { features?: { properties?: Partial<RegionMundo>; geometry?: unknown }[] }
  if (!Array.isArray(fc?.features)) throw new Error(`The boundaries of ${nombrePais(pais)} have an invalid format.`)
  const regiones = fc.features.filter(f => f?.properties?.id && f.properties.nombre && f.geometry)
    .map(f => ({ id: String(f.properties!.id), nombre: String(f.properties!.nombre), zona_horaria: f.properties!.zona_horaria ?? null, bbox: f.properties!.bbox as RegionMundo['bbox'], geometry: f.geometry }))
  if (!regiones.length) throw new Error(`The boundaries of ${nombrePais(pais)} contain no regions.`)
  return regiones.sort((a, b) => a.nombre.localeCompare(b.nombre, 'en'))
}
