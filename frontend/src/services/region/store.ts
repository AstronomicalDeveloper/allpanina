/**
 * Conjunto "Mi región" guardado en el navegador (IndexedDB), para que el Calendario y el Mapa
 * lo lean con la ruta virtual `local:/<archivo>`. Sin IndexedDB (pruebas, modo privado) queda en memoria.
 */
export interface ConjuntoLocal { archivos: Record<string, string>; region_id: string; nombre: string; guardado: string }

const DB = 'allpanina', STORE = 'conjuntos', KEY = 'mi-region'
let memoria: ConjuntoLocal | null = null
let cache: Promise<ConjuntoLocal | null> | null = null

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, mal) => {
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => ok(req.result)
    req.onerror = () => mal(req.error)
  })
}
async function tx<T>(modo: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await abrir()
  return new Promise((ok, mal) => {
    const req = fn(db.transaction(STORE, modo).objectStore(STORE))
    req.onsuccess = () => ok(req.result)
    req.onerror = () => mal(req.error)
  })
}
const hayIdb = () => typeof indexedDB !== 'undefined'

export async function guardarConjunto(c: ConjuntoLocal): Promise<void> {
  memoria = c; cache = Promise.resolve(c)
  if (hayIdb()) { try { await tx('readwrite', s => s.put(c, KEY)) } catch { /* queda en memoria */ } }
}
export function leerConjunto(): Promise<ConjuntoLocal | null> {
  cache ??= (async () => {
    if (memoria || !hayIdb()) return memoria
    try { return (await tx<ConjuntoLocal | undefined>('readonly', s => s.get(KEY))) ?? null } catch { return null }
  })()
  return cache
}
export async function borrarConjunto(): Promise<void> {
  memoria = null; cache = null
  if (hayIdb()) { try { await tx('readwrite', s => s.delete(KEY)) } catch { /* nada */ } }
}
/** Texto de un archivo del conjunto local; error claro si no hay conjunto o falta el archivo. */
export async function leerArchivoLocal(nombre: string): Promise<string> {
  const c = await leerConjunto()
  if (!c) throw new Error('No hay datos de "Mi región" en este navegador. Procesa o sube un resultado en la página Mi región.')
  const t = c.archivos[nombre]
  if (t === undefined) throw new Error(`El resultado de Mi región no tiene ${nombre}`)
  return t
}
