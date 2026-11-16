import { parseCalibratedSeries, parseMonthlySeries, validateCells, validateManifest, validateValidation } from '../data/validators'
import { validateMethodDocument } from '../data/peruValidators'
import type { ConjuntoLocal } from './store'
import { leerZip } from './zip'

/** Valida antes de reemplazar el conjunto local. Los hashes prueban integridad, no autoría. */
export async function importarResultado(file: Pick<File, 'arrayBuffer'>): Promise<ConjuntoLocal> {
  const dentro = await leerZip(await file.arrayBuffer()), dec = new TextDecoder()
  const archivos: Record<string, string> = {}
  for (const [ruta, bytes] of Object.entries(dentro)) {
    const nombre = ruta.split('/').pop()!
    if (Object.hasOwn(archivos, nombre)) throw new Error(`Duplicate file name: ${nombre}`)
    archivos[nombre] = dec.decode(bytes)
  }
  if (!archivos['manifest.json']) throw new Error('The .zip has no manifest.json: it does not look like an AllpaNina result.')
  const manifest = validateManifest(JSON.parse(archivos['manifest.json']))
  if (manifest.contract_version === '1.1') throw new Error('This is the national Peru data set; it is already published on this site.')
  const requeridos = ['monthly_series.csv', 'calibrated_series.csv', 'method.json', 'validation.json']
  for (let y = Number(manifest.periodo.desde.slice(0, 4)); y <= Number(manifest.periodo.hasta.slice(0, 4)); y++) requeridos.push(`cells_${manifest.region_id}_${y}.geojson`)
  for (const n of requeridos) if (!manifest.files.includes(n)) throw new Error(`${n} is missing from the manifest.`)
  for (const n of manifest.files) {
    if (archivos[n] === undefined) throw new Error(`${n} is missing inside the .zip.`)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(archivos[n]))
    const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
    if (manifest.hash[n] !== `sha256:${hex}`) throw new Error(`${n} does not match its manifest hash.`)
  }
  const mensual = parseMonthlySeries(archivos['monthly_series.csv'])
  const calibrada = parseCalibratedSeries(archivos['calibrated_series.csv'])
  const metodo = validateMethodDocument(JSON.parse(archivos['method.json']))
  const evaluacion = validateValidation(JSON.parse(archivos['validation.json']))
  if (!mensual.length || !calibrada.length) throw new Error('The series in the result are empty.')
  if ([metodo.region_id, evaluacion.region_id, ...mensual.map(r => r.region_id), ...calibrada.map(r => r.region_id)].some(id => id !== manifest.region_id)) throw new Error('The files declare different regions.')
  const enPeriodo = (r: { year: number; month: number }) => {
    const mes = `${r.year}-${String(r.month).padStart(2, '0')}`
    if (mes < manifest.periodo.desde || mes > manifest.periodo.hasta) throw new Error('There are data outside the manifest period.')
  }
  mensual.forEach(enPeriodo); calibrada.forEach(enPeriodo)
  for (const n of manifest.files.filter(n => n.endsWith('.geojson'))) {
    const fc = validateCells(JSON.parse(archivos[n]))
    for (const f of fc.features) {
      enPeriodo(f.properties)
      if (n !== `cells_${manifest.region_id}_${f.properties.year}.geojson`) throw new Error('The map year does not match its file.')
    }
  }
  return { archivos, region_id: manifest.region_id, nombre: metodo.region || manifest.region_id, guardado: new Date().toISOString() }
}
