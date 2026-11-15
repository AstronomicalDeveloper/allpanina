/** Países y regiones de primer nivel (archivos estáticos de public/cartography/world, script 11). */
export interface Pais { iso3: string; iso2: string | null; nombre: string; archivo: string; regiones: number }
export interface IndiceMundo { fuente: string; licencia: string; paises: Pais[] }
export interface RegionMundo { id: string; nombre: string; zona_horaria: string | null; geometry: unknown; bbox: [number, number, number, number] }

const base = () => `${import.meta.env?.BASE_URL ?? '/'}cartography/world`
const nombres = (() => { try { return new Intl.DisplayNames(['es'], { type: 'region' }) } catch { return null } })()

export function nombrePais(p: Pick<Pais, 'iso2' | 'nombre'>): string {
  try { return (p.iso2 && nombres?.of(p.iso2)) || p.nombre } catch { return p.nombre }
}

export async function cargarIndice(signal?: AbortSignal): Promise<IndiceMundo> {
  const r = await fetch(`${base()}/index.json`, { signal })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const v = await r.json() as IndiceMundo
  if (!Array.isArray(v?.paises)) throw new Error('índice de países inválido')
  return v
}

export async function cargarRegiones(pais: Pais, signal?: AbortSignal): Promise<RegionMundo[]> {
  const r = await fetch(`${base()}/${encodeURIComponent(pais.archivo)}`, { signal })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const fc = await r.json() as { features: { properties: { id: string; nombre: string; zona_horaria: string | null; bbox: [number, number, number, number] }; geometry: unknown }[] }
  return fc.features.map(f => ({ ...f.properties, geometry: f.geometry }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
}
