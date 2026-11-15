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
    const transaction = db.transaction(STORE, modo)
    const req = fn(transaction.objectStore(STORE))
    transaction.oncomplete = () => { db.close(); ok(req.result) }
    transaction.onabort = () => { db.close(); mal(transaction.error ?? new Error('Transacción cancelada')) }
    transaction.onerror = () => { db.close(); mal(transaction.error) }
  })
}
const hayIdb = () => typeof indexedDB !== 'undefined'

export async function guardarConjunto(c: ConjuntoLocal): Promise<string | null> {
  memoria = c; cache = Promise.resolve(c)
  if (hayIdb()) {
    try { await tx('readwrite', s => s.put(c, KEY)); return null } catch { /* queda en memoria */ }
  }
  return 'No se pudo guardar de forma persistente. El resultado queda en memoria durante esta sesión; descarga el .zip antes de cerrar o recargar.'
}
export function leerConjunto(): Promise<ConjuntoLocal | null> {
  cache ??= (async () => {
    if (memoria || !hayIdb()) return memoria
    try { return (await tx<ConjuntoLocal | undefined>('readonly', s => s.get(KEY))) ?? null } catch { return null }
  })()
  return cache
}
export async function borrarConjunto(): Promise<void> {
  if (hayIdb()) await tx('readwrite', s => s.delete(KEY))
  memoria = null; cache = null
}
/** Texto de un archivo del conjunto local; error claro si no hay conjunto o falta el archivo. */
export async function leerArchivoLocal(nombre: string): Promise<string> {
  const c = await leerConjunto()
  if (!c) throw new Error('No hay datos de "Mi región" en este navegador. Procesa o sube un resultado en la página Mi región.')
  const t = c.archivos[nombre]
  if (t === undefined) throw new Error(`El resultado de Mi región no tiene ${nombre}`)
  return t
}
