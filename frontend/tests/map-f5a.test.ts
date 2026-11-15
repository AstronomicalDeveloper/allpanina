/** F5a: base map fallback, reference layers that fail, names instead of codes and English interface. */
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { act, createElement } from 'react'
import { files, mockFiles, mount, fakeRuntime } from './uiHarness'
import MapPage from '../src/pages/map/MapPage'
import { BASEMAP_FALLBACK, OBSERVATION_COLORS, paletteFor, percentileColorExpression } from '../src/pages/map/cartography/juanLayers'
import { PROVIDER_FAILURES } from '../src/pages/map/useJuanMap'
import { cellPopup } from '../src/services/data/map'

for (const year of [2024]) files[`/data/peru/cells_PE_${year}.geojson`] = await readFile(new URL(`../public/data/peru/cells_PE_${year}.geojson`, import.meta.url), 'utf8')

async function open(t: TestContext, url = '/map?periodYear=2024&periodMonth=9&scope=month&mapSensor=MODIS', mode: 'pilot' | 'peru' = 'pilot') {
  const runtime = fakeRuntime()
  const result = await mount(t, url, createElement(MapPage, { runtimeLoader: runtime.loader }), mode)
  await act(async () => { await new Promise(r => setTimeout(r, 30)) })
  return { ...result, runtime }
}
const visible = (map: { layouts: Record<string, unknown> }, layer: string) => map.layouts[`${layer}:visibility`]
const fail = async (map: { emit: (name: string, event?: object) => void }, sourceId: string, times = PROVIDER_FAILURES) => {
  for (let i = 0; i < times; i++) await act(async () => map.emit('error', { sourceId, error: new Error(`tile ${sourceId} failed`) }))
}

test('si GIBS falla, el mapa pasa a otro fondo, avisa sin error y conserva las observaciones', async t => {
  mockFiles(t); const { host, runtime } = await open(t)
  const map = runtime.maps[0]
  const before = JSON.stringify(map.sources['celdas-observadas'].data)
  assert.ok((map.sources['celdas-observadas'].data as { features: unknown[] }).features.length > 0)
  await fail(map, 'basemap-blue-marble', PROVIDER_FAILURES - 1)
  assert.equal(visible(map, 'basemap-blue-marble-layer'), 'visible', 'one or two missing tiles do not switch the base map')
  await fail(map, 'basemap-blue-marble', 1)
  assert.equal(visible(map, 'basemap-firefly-layer'), 'visible'); assert.equal(visible(map, 'basemap-blue-marble-layer'), 'none')
  assert.match(host.querySelector('.map-feedback--notice')!.textContent!, /Satellite base map is not available; showing Dark satellite/)
  assert.equal(host.querySelector('[role="alert"]'), null, 'a provider problem that was worked around is not an error')
  assert.equal(JSON.stringify(map.sources['celdas-observadas'].data), before, 'observations unchanged')
  await fail(map, 'basemap-firefly'); assert.equal(visible(map, 'basemap-topographic-layer'), 'visible')
  await fail(map, 'basemap-topographic')
  for (const layer of ['basemap-blue-marble-layer', 'basemap-firefly-layer', 'basemap-topographic-layer', 'basemap-streets-layer']) assert.equal(visible(map, layer), 'none')
  assert.match(host.querySelector('.map-feedback--notice')!.textContent!, /plain background/)
  assert.equal(JSON.stringify(map.sources['celdas-observadas'].data), before)
  assert.equal(runtime.maps.length, 1, 'the map is not rebuilt')
})

test('una capa de referencia que falla se apaga y se avisa; otros errores siguen ofreciendo reintentar', async t => {
  mockFiles(t); const { host, runtime } = await open(t)
  const box = [...host.querySelectorAll<HTMLLabelElement>('.map-overlays label')].find(l => /Protected natural areas/.test(l.textContent!))!.querySelector('input')!
  await act(async () => box.click()); assert.equal(box.checked, true)
  await fail(runtime.maps[0], 'overlay-protected')
  assert.equal(box.checked, false)
  assert.match(host.querySelector('.map-feedback--notice')!.textContent!, /Protected natural areas.*turned off/)
  await act(async () => runtime.maps[0].emit('error', { error: new Error('style broke') }))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /Retry map/)
})

test('colores del sistema visual: escala oscura sobre satélite y clara sobre fondos claros, mismos cortes', () => {
  assert.deepEqual(BASEMAP_FALLBACK, { 'blue-marble': 'firefly', firefly: 'topographic', streets: 'topographic', topographic: 'none', none: null })
  assert.equal(paletteFor('blue-marble'), 'dark'); assert.equal(paletteFor('none'), 'dark'); assert.equal(paletteFor('topographic'), 'light')
  const dark = percentileColorExpression(1, 2, 3), light = percentileColorExpression(1, 2, 3, 'light')
  assert.deepEqual(dark.filter(v => typeof v === 'string' && v.startsWith('#')), [...OBSERVATION_COLORS.dark])
  assert.deepEqual(light.filter(v => typeof v === 'string' && v.startsWith('#')), [...OBSERVATION_COLORS.light])
  assert.deepEqual(dark.filter(v => typeof v !== 'string'), light.filter(v => typeof v !== 'string'))
})

test('nombres en lugar de códigos: departamento nacional y piloto', async t => {
  mockFiles(t)
  const national = await open(t, '/map?mapRegion=PE-25&periodYear=2024&periodMonth=9&scope=month', 'peru')
  assert.equal(national.host.querySelector('.map-context strong')!.textContent, 'Ucayali')
  assert.doesNotMatch(national.host.querySelector('.map-geographic-context')!.textContent!, /PE-25/)
  const pilot = await open(t)
  assert.equal(pilot.host.querySelector('.map-context strong')!.textContent, 'Ucayali (pilot)')
})

test('la interfaz del mapa y el popup están en inglés', async t => {
  mockFiles(t); const { host } = await open(t)
  const spanish = /[¿¡ñ]|\b(?:de|del|las|los|con|sin|celdas?|cuadrícula|mapa|año|mes|días?|período|capas?|fondo|enlace|reintentar)\b/i
  const text = host.querySelector('.map-workspace')!.textContent!.replace(/Ucayali|MCD14ML v6\.1 \/ VNP14IMGML v2/g, '')
  assert.doesNotMatch(text, spanish)
  const popup = cellPopup({ cell_id: '1_2', year: 2024, month: 9, sensor_group: 'MODIS', cell_days: 3 })
  assert.doesNotMatch(popup.textContent!, spanish); assert.match(popup.textContent!, /September 2024 · MODIS/)
})
