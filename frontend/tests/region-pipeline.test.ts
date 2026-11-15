/**
 * Mi región (algoritmo en el navegador): mismas reglas que allpanina/region.py.
 * La paridad completa con el piloto de Ucayali tarda ~1 min: ALLPANINA_LENTO=1 npm test.
 */
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { test } from 'node:test'
import { cellBounds, cellOf } from '../src/services/region/ea6933.ts'
import { procesarRegion, zonaPorLongitud } from '../src/services/region/pipeline.ts'
import { pyFloat, round5 } from '../src/services/region/pyformat.ts'
import { escribirZip, leerZip } from '../src/services/region/zip.ts'
import { tramos } from '../src/services/region/descarga.ts'
import { parseCalibratedSeries, parseMonthlySeries, validateCells, validateManifest, validateValidation } from '../src/services/data/validators.ts'
import { validateMethodDocument } from '../src/services/data/peruValidators.ts'

const ROOT = new URL('../../', import.meta.url)
const CAB = 'latitude,longitude,brightness,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_t31,frp,daynight,type'
const MENDOZA = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[-69.5, -33.5], [-68, -33.5], [-68, -32], [-69.5, -32], [-69.5, -33.5]]] } }] }
const DENTRO: [number, number] = [-32.9, -68.8], FUERA: [number, number] = [-34.6, -58.4]
type F = [[number, number], string, string]
const csv = (filas: F[], sensor: 'MODIS' | 'VIIRS') => ({ nombre: `${sensor}.csv`, texto: [CAB, ...filas.map(([[lat, lon], fecha, hora]) =>
  `${lat},${lon},320,1,1,${fecha},${hora},${sensor === 'MODIS' ? 'Aqua' : 'N'},${sensor},${sensor === 'MODIS' ? 80 : 'n'},${sensor === 'MODIS' ? '61.03' : '2'},300,10,N,0`)].join('\n') + '\n' })

test('formatos de Python', () => {
  assert.equal(pyFloat(55), '55.0'); assert.equal(pyFloat(16.130964311399836), '16.130964311399836')
  assert.equal(pyFloat(1e-5), '1e-05'); assert.equal(pyFloat(-74), '-74.0'); assert.equal(round5(-8.123456), -8.12346)
  assert.equal(zonaPorLongitud(-68.8), 'Etc/GMT+5'); assert.equal(zonaPorLongitud(120), 'Etc/GMT-8')
})

test('EPSG:6933 reproduce las celdas publicadas del piloto (pyproj)', () => {
  const fc = JSON.parse(readFileSync(new URL('frontend/public/data/cells_PE-UCA_2024.geojson', ROOT), 'utf8'))
  for (const feat of fc.features.slice(0, 500)) {
    const [x, y] = feat.properties.cell_id.split('_').map(Number)
    const [w, s, e, n] = cellBounds(x, y).map(round5)
    assert.deepEqual(feat.geometry.coordinates[0][0], [w, s]); assert.deepEqual(feat.geometry.coordinates[0][2], [e, n])
    assert.deepEqual(cellOf((w + e) / 2, (s + n) / 2), [x, y])
  }
})

test('Mendoza: día local, polígono, sin κ con pocos datos, y archivos válidos para la web', async () => {
  // 2020-10-01 02:00 UTC todavía es 30 de setiembre en Mendoza (UTC-3).
  const filas: F[] = [[DENTRO, '2015-09-10', '1500'], [DENTRO, '2020-10-01', '0200'], [FUERA, '2020-09-10', '1500']]
  const r = await procesarRegion([csv(filas, 'MODIS')], [csv(filas, 'VIIRS')], { region_id: 'AR-M', nombre: 'Mendoza', poligono: MENDOZA, zona_horaria: 'America/Argentina/Mendoza', actualizado: '2026-11-15' })
  assert.deepEqual(r.resumen.periodo, { desde: '2015-09', hasta: '2020-09' })
  assert.equal(r.resumen.b1_disponible, false); assert.equal(r.resumen.celda_mapa_km, 1)
  const serie = parseMonthlySeries(r.archivos['monthly_series.csv'])
  assert.equal(serie.find(x => x.year === 2020 && x.month === 9 && x.sensor_group === 'MODIS')!.cell_days, 1)
  const cal = parseCalibratedSeries(r.archivos['calibrated_series.csv'])
  assert.ok(cal.filter(x => x.method === 'B1').every(x => x.status === 'missing'))
  const manifest = validateManifest(JSON.parse(r.archivos['manifest.json']))
  assert.equal(manifest.contract_version, '1.0-region'); assert.ok(manifest.files.includes('cells_AR-M_2020.geojson'))
  const method = validateMethodDocument(JSON.parse(r.archivos['method.json']))
  assert.ok(!('contract_version' in method)); assert.equal(method.kappa, null)
  validateValidation(JSON.parse(r.archivos['validation.json']))
  validateCells(JSON.parse(r.archivos['cells_AR-M_2020.geojson']))
  assert.ok(r.resumen.advertencias.some(a => a.includes('No se ofrece B1')))
})

test('κ local solo con train y evaluación fuera de muestra', async () => {
  const fm: F[] = [], fv: F[] = []
  for (let y = 2013; y <= 2024; y++) for (let d = 1; d <= 4; d++) {
    const p: [number, number] = [-32.5 - 0.05 * d, -68.8]
    fv.push([p, `${y}-08-0${d}`, '1500']); if (d <= 2) fm.push([p, `${y}-08-0${d}`, '1500'])
  }
  const r = await procesarRegion([csv(fm, 'MODIS')], [csv(fv, 'VIIRS')], { region_id: 'AR-M', poligono: MENDOZA, zona_horaria: 'America/Argentina/Mendoza', umbral_viirs: 1, umbral_modis: 1 })
  assert.equal(r.resumen.kappa, 0.5)
  const b1 = parseCalibratedSeries(r.archivos['calibrated_series.csv']).find(x => x.method === 'B1' && x.year === 2023 && x.month === 8)!
  assert.equal(b1.value, 2); assert.equal(b1.split, 'valid')
  assert.equal(JSON.parse(r.archivos['method.json']).kappa_inputs.meses_train, 10)
})

test('rechaza NRT, NOAA-20 y región vacía', async () => {
  const ok = csv([[DENTRO, '2020-09-10', '1500']], 'MODIS')
  await assert.rejects(procesarRegion([{ nombre: 'nrt.csv', texto: 'latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,version\n-32.9,-68.8,2020-09-10,1500,Aqua,MODIS,80,6.1NRT\n' }], [ok], { region_id: 'X', poligono: MENDOZA, zona_horaria: 'UTC' }), /NRT/)
  const n20 = { nombre: 'n20.csv', texto: csv([[DENTRO, '2020-09-10', '1500']], 'VIIRS').texto.replace(',N,VIIRS,', ',N20,VIIRS,') }
  await assert.rejects(procesarRegion([ok], [n20], { region_id: 'X', poligono: MENDOZA, zona_horaria: 'UTC' }), /N20/)
  await assert.rejects(procesarRegion([ok], [ok], { region_id: 'mal id', poligono: MENDOZA, zona_horaria: 'UTC' }), /código/)
  await assert.rejects(procesarRegion([ok], [ok], { region_id: 'X', poligono: MENDOZA, zona_horaria: 'Marte/Olympus' }), /Zona horaria/)
})

test('zip: ida y vuelta; tramos de FIRMS de 10 días', async () => {
  const z = await leerZip(await escribirZip({ 'a.csv': 'hola,ñandú\n', 'b.json': '{}' }).arrayBuffer())
  assert.equal(new TextDecoder().decode(z['a.csv']), 'hola,ñandú\n'); assert.equal(new TextDecoder().decode(z['b.json']), '{}')
  assert.deepEqual(tramos('2020-01-01', '2020-01-25'), [['2020-01-01', 10], ['2020-01-11', 10], ['2020-01-21', 5]])
})

test('paridad con el piloto publicado de Ucayali (serie, B0/B1 y 14 mapas byte a byte)', { skip: process.env.ALLPANINA_LENTO !== '1' || !existsSync(new URL('docs/DL_FIRE_M-C61_848370.zip', ROOT)) }, async () => {
  const leer = async (z: string) => { const f = await leerZip(readFileSync(new URL(`docs/${z}`, ROOT)).buffer as ArrayBuffer); const k = Object.keys(f).find(n => n.startsWith('fire_archive'))!; return { nombre: k, texto: new TextDecoder().decode(f[k]) } }
  const [m, v] = await Promise.all([leer('DL_FIRE_M-C61_848370.zip'), leer('DL_FIRE_SV-C2_848371.zip')])
  const pub = (n: string) => readFileSync(new URL(`frontend/public/data/${n}`, ROOT), 'utf8')
  const stamp = pub('monthly_series.csv').split('\n')[1].split(',').at(-1)!
  const r = await procesarRegion([m], [v], { region_id: 'PE-UCA', poligono: JSON.parse(readFileSync(new URL('docs/region/ucayali_inei_2023.geojson', ROOT), 'utf8')), zona_horaria: 'America/Lima', celda_mapa_km: 1, hasta: '2026-07', actualizado: stamp })
  assert.equal(r.resumen.kappa, 0.2936037257560573)
  for (const n of ['monthly_series.csv', 'calibrated_series.csv', ...Array.from({ length: 14 }, (_, i) => `cells_PE-UCA_${2013 + i}.geojson`)]) assert.ok(r.archivos[n] === pub(n), n)
})
