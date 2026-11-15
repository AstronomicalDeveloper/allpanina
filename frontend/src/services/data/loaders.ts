import { leerArchivoLocal } from '../region/store.ts'
import { validateMethodDocument, validateValidationDocument } from './peruValidators'
import { parseCalibratedSeries, parseMonthlySeries, validateCells, validateManifest, validateMethod, validateValidation } from './validators.ts'

export type LoadResult<T> = { ok: true; data: T } | { ok: false; error: string }

async function readText(url: string, signal?: AbortSignal): Promise<string> {
  if (url.startsWith('local:')) return leerArchivoLocal(decodeURIComponent(url.slice('local:'.length).replace(/^\/+/, '')))
  const response = await fetch(url, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.text()
}
/**
 * Cache of published files (PLAN_REDISENO T5): moving between Calendar, Map and Method does not download
 * the same file again. Only the text of files that parsed and validated is kept, so "Retry" after an
 * error always fetches again; each use re-parses, so no page can alter another page's data.
 * Local results (local:) are never cached: they change when the user imports a new result.
 */
const MAX_CACHE_CHARS = 40_000_000
const textCache = new Map<string, string>()
let cachedChars = 0
function remember(url: string, text: string) {
  forget(url)
  if (text.length > MAX_CACHE_CHARS) return
  textCache.set(url, text); cachedChars += text.length
  for (const [oldest, value] of textCache) {
    if (cachedChars <= MAX_CACHE_CHARS) break
    textCache.delete(oldest); cachedChars -= value.length
  }
}
function forget(url: string) {
  const old = textCache.get(url)
  if (old !== undefined) { textCache.delete(url); cachedChars -= old.length }
}
/** Empties the cache (tests, or after publishing new files). */
export function clearDataCache() { textCache.clear(); cachedChars = 0 }

async function load<T>(url: string, parse: (text: string) => T, signal?: AbortSignal): Promise<T> {
  const local = url.startsWith('local:')
  try {
    const cached = local ? undefined : textCache.get(url)
    if (cached !== undefined) { textCache.delete(url); textCache.set(url, cached) }   // most recently used last
    const text = cached ?? await readText(url, signal)
    const value = parse(text)
    if (!local && cached === undefined) remember(url, text)
    return value
  } catch (error) {
    forget(url)
    throw new Error(`${url}: ${error instanceof Error ? error.message : 'Error de lectura'}`, { cause: error })
  }
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

export const loadMethodDocument = (url: string, signal?: AbortSignal) => loadJson(url, validateMethodDocument, signal)
export const loadValidationDocument = (url: string, signal?: AbortSignal) => loadJson(url, validateValidationDocument, signal)
