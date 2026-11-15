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
    if (Object.hasOwn(archivos, nombre)) throw new Error(`Nombre de archivo duplicado: ${nombre}`)
    archivos[nombre] = dec.decode(bytes)
  }
  if (!archivos['manifest.json']) throw new Error('El .zip no tiene manifest.json: no parece un resultado de AllpaNina.')
  const manifest = validateManifest(JSON.parse(archivos['manifest.json']))
  if (manifest.contract_version === '1.1') throw new Error('Este es el conjunto nacional de Perú; ya está publicado en la web.')
  const requeridos = ['monthly_series.csv', 'calibrated_series.csv', 'method.json', 'validation.json']
  for (let y = Number(manifest.periodo.desde.slice(0, 4)); y <= Number(manifest.periodo.hasta.slice(0, 4)); y++) requeridos.push(`cells_${manifest.region_id}_${y}.geojson`)
  for (const n of requeridos) if (!manifest.files.includes(n)) throw new Error(`Falta ${n} en el manifiesto.`)
  for (const n of manifest.files) {
    if (archivos[n] === undefined) throw new Error(`Falta ${n} dentro del .zip.`)
    const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(archivos[n]))
    const hex = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
    if (manifest.hash[n] !== `sha256:${hex}`) throw new Error(`${n} no coincide con su hash del manifiesto.`)
  }
  const mensual = parseMonthlySeries(archivos['monthly_series.csv'])
  const calibrada = parseCalibratedSeries(archivos['calibrated_series.csv'])
  const metodo = validateMethodDocument(JSON.parse(archivos['method.json']))
  const evaluacion = validateValidation(JSON.parse(archivos['validation.json']))
  if (!mensual.length || !calibrada.length) throw new Error('Las series del resultado están vacías.')
  if ([metodo.region_id, evaluacion.region_id, ...mensual.map(r => r.region_id), ...calibrada.map(r => r.region_id)].some(id => id !== manifest.region_id)) throw new Error('Los archivos declaran regiones diferentes.')
  const enPeriodo = (r: { year: number; month: number }) => {
    const mes = `${r.year}-${String(r.month).padStart(2, '0')}`
    if (mes < manifest.periodo.desde || mes > manifest.periodo.hasta) throw new Error('Hay datos fuera del período del manifiesto.')
  }
  mensual.forEach(enPeriodo); calibrada.forEach(enPeriodo)
  for (const n of manifest.files.filter(n => n.endsWith('.geojson'))) {
    const fc = validateCells(JSON.parse(archivos[n]))
    for (const f of fc.features) {
      enPeriodo(f.properties)
      if (n !== `cells_${manifest.region_id}_${f.properties.year}.geojson`) throw new Error('El año del mapa no coincide con su archivo.')
    }
  }
  return { archivos, region_id: manifest.region_id, nombre: metodo.region || manifest.region_id, guardado: new Date().toISOString() }
}
