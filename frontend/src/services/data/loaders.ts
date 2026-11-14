import { parseCalibratedSeries, parseMonthlySeries, validateCells, validateManifest, validateMethod, validateValidation } from './validators.ts'

export type LoadResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function readText(url: string, signal?: AbortSignal): Promise<string> {
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}
async function load<T>(url: string, parse: (text: string) => T, signal?: AbortSignal): Promise<T> {
  try { return parse(await readText(url, signal)) }
  catch (error) { throw new Error(`${url}: ${error instanceof Error ? error.message : 'Error de lectura'}`, { cause: error }) }
}
export function loadJson<T>(url: string, validate: (value: unknown) => T, signal?: AbortSignal): Promise<T> {
  return load(url, text => {
    let value: unknown
    try { value = JSON.parse(text) }
    catch { throw new Error('JSON inválido') }
    return validate(value)
  }, signal)
}
export const loadMonthlySeries = (url: string, signal?: AbortSignal) => load(url, parseMonthlySeries, signal)
export const loadCalibratedSeries = (url: string, signal?: AbortSignal) => load(url, parseCalibratedSeries, signal)
export const loadManifest = (url: string, signal?: AbortSignal) => loadJson(url, validateManifest, signal)
export const loadMethod = (url: string, signal?: AbortSignal) => loadJson(url, validateMethod, signal)
export const loadValidation = (url: string, signal?: AbortSignal) => loadJson(url, validateValidation, signal)
export const loadCells = (url: string, signal?: AbortSignal) => loadJson(url, validateCells, signal)

export async function safelyLoad<T>(operation: () => Promise<T>): Promise<LoadResult<T>> {
  try { return { ok: true, data: await operation() } }
  catch (error) { return { ok: false, error: error instanceof Error ? error.message : 'Error de carga' } }
}

/** Official Aldo contract. Explicit opt-in DEMO; loaders also accept real-file URLs. */
export function loadDemo(baseUrl: string, signal?: AbortSignal) {
  const root = baseUrl.replace(/\/$/, '')
  return Promise.all([
    safelyLoad(() => loadMonthlySeries(`${root}/monthly_series.csv`, signal)),
    safelyLoad(() => loadCalibratedSeries(`${root}/calibrated_series.csv`, signal)),
    safelyLoad(() => loadValidation(`${root}/validation.json`, signal)),
    safelyLoad(() => loadMethod(`${root}/method.json`, signal)),
    safelyLoad(() => loadCells(`${root}/cells_PE-DEMO_2024.geojson`, signal)),
    safelyLoad(() => loadManifest(`${root}/manifest.json`, signal)),
  ])
}
