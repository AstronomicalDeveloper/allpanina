import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { act, createElement, StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import App from '../src/App.tsx'
import MapPage from '../src/components/map/MapPage.tsx'
import { FireMapTest } from '../src/components/map/FireMapTest.tsx'
import type { MapRuntime } from '../src/components/map/mapRuntime.ts'
import type { MapSelection } from '../src/types/selection.ts'
import type { CellsData } from '../src/types/data.ts'
import { cellPopup } from '../src/services/data/map.ts'
import { validateCells, parseMonthlySeries } from '../src/services/data/validators.ts'

const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' })
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true } })
const fixture = (name: string) => readFile(new URL(`../public/data/demo/${name}`, import.meta.url), 'utf8')
const raw = await fixture('cells_PE-DEMO_2024.geojson')
const data = validateCells(JSON.parse(raw))
const initial: MapSelection = { region: 'PE-DEMO', year: 2024, month: 8, sensor: 'MODIS' }

type Listener = (event: { features?: { properties: Record<string, unknown> }[]; lngLat?: unknown; error?: Error }) => void
function fakeRuntime() {
  const maps: FakeMap[] = []
  const popups: FakePopup[] = []
  class FakePopup {
    content: HTMLElement | null = null
    removed = false
    constructor() { popups.push(this) }
    setLngLat() { return this }
    setDOMContent(content: HTMLElement) { this.content = content; return this }
    addTo() { return this }
    remove() { this.removed = true; return this }
  }
  class FakeMap {
    canvas = document.createElement('canvas')
    listeners = new Map<string, Listener[]>()
    sources: Record<string, { data: unknown; setData: (data: unknown) => void }> = {}
    layers: { id: string }[]
    removed = 0
    fitted: unknown = null
    constructor(options: { style: { sources: Record<string, { data?: unknown }>; layers: { id: string }[] } }) {
      this.layers = options.style.layers
      for (const [key, value] of Object.entries(options.style.sources)) this.sources[key] = { data: value.data, setData: data => { this.sources[key].data = data } }
      maps.push(this)
      queueMicrotask(() => this.emit('load'))
    }
    on(name: string, layerOrCallback: string | Listener, callback?: Listener) {
      const key = typeof layerOrCallback === 'string' ? `${name}:${layerOrCallback}` : name
      this.listeners.set(key, [...(this.listeners.get(key) ?? []), callback ?? layerOrCallback as Listener]); return this
    }
    once(name: string, callback: Listener) { return this.on(name, callback) }
    emit(name: string, event = {}) { for (const callback of this.listeners.get(name) ?? []) callback(event) }
    addControl() { return this }
    getCanvas() { return this.canvas }
    getSource(id: string) { return this.sources[id] }
    getLayer(id: string) { return this.layers.find(layer => layer.id === id) }
    isStyleLoaded() { return true }
    setLayoutProperty() {}
    setPaintProperty() {}
    getBounds() { return { getWest: () => -76, getEast: () => -74, getSouth: () => -13, getNorth: () => -11 } }
    getZoom() { return 7 }
    fitBounds(bounds: unknown) { this.fitted = bounds }
    resize() {}
    remove() { this.removed++; this.listeners.clear() }
  }
  const runtime = { Map: FakeMap, Popup: FakePopup, NavigationControl: class {}, ScaleControl: class {} } as unknown as MapRuntime
  return { maps, popups, loader: async () => runtime }
}
async function mount(t: TestContext, element: ReturnType<typeof createElement>) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(element))
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  return { host, root }
}
function button(host: HTMLElement, name: string) {
  const result = [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent?.trim() === name)
  assert.ok(result, `No existe botón ${name}`); return result
}
async function choose(host: HTMLElement, label: string, value: string) {
  const select = host.querySelector<HTMLSelectElement>(`select[aria-label="${label}"]`)
  assert.ok(select)
  await act(async () => { select.value = value; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
}
async function mockFiles(t: TestContext) {
  const files = Object.fromEntries(await Promise.all(['manifest.json', 'monthly_series.csv', 'calibrated_series.csv', 'method.json', 'validation.json', 'cells_PE-DEMO_2024.geojson'].map(async name => [name, await fixture(name)])))
  return t.mock.method(globalThis, 'fetch', async (url: string) => new Response(files[decodeURIComponent(url.split('/').at(-1)!)] ?? 'missing', { status: files[decodeURIComponent(url.split('/').at(-1)!)] ? 200 : 404 }))
}
test('mapa carga datos oficiales, mantiene capas de Juan y selecciona propiedades con clic o teclado', async t => {
  await mockFiles(t)
  const runtime = fakeRuntime()
  const { host } = await mount(t, createElement(MapPage, { dataRoot: '/data/demo', selection: initial, onSelectionChange: () => {}, runtimeLoader: runtime.loader }))
  assert.equal(runtime.maps.length, 1)
  const map = runtime.maps[0]
  assert.equal((map.sources['celdas-observadas'].data as CellsData).features[0].properties.cell_days, 3)
  for (const id of ['celdas-fill', 'celdas-line', 'basemap-blue-marble-layer', 'basemap-firefly-layer', 'basemap-streets-layer', 'basemap-topographic-layer', 'overlay-protected-layer']) assert.ok(map.getLayer(id))
  await act(async () => map.emit('click:celdas-fill', { features: [{ properties: { cell_id: 'DEMO-cell-001' } }] }))
  assert.match(host.textContent!, /3 días-celda/)
  await choose(host, 'Seleccionar celda del mapa', '')
  await choose(host, 'Seleccionar celda del mapa', 'DEMO-cell-001')
  assert.match(host.textContent!, /DEMO-cell-001/)
  assert.ok(map.fitted)
})
test('filtros interactivos actualizan fuente, conservan cero y muestran período sin datos', async t => {
  const runtime = fakeRuntime()
  function Harness() {
    const [selection, setSelection] = useState(initial)
    return createElement(FireMapTest, { demo: true, data, selection, onSelectionChange: setSelection, availableYears: [2024], runtimeLoader: runtime.loader })
  }
  const { host } = await mount(t, createElement(Harness))
  await act(async () => button(host, 'VIIRS').click())
  assert.equal((runtime.maps[0].sources['celdas-observadas'].data as CellsData).features[0].properties.cell_days, 5)
  await choose(host, 'Mes del mapa', '9')
  assert.equal((runtime.maps[0].sources['celdas-observadas'].data as CellsData).features[0].properties.cell_days, 0)
  await choose(host, 'Mes del mapa', '10')
  assert.equal((runtime.maps[0].sources['celdas-observadas'].data as CellsData).features.length, 0)
  assert.match(host.textContent!, /Ausencia de filas no equivale a cero/)
})
test('popup conserva texto potencialmente malicioso sin generar nodos HTML', () => {
  const content = cellPopup({ ...data.features[0].properties, cell_id: '<img src=x onerror="alert(1)">' })
  assert.equal(content.querySelector('img'), null)
  assert.match(content.textContent!, /<img/)
})
test('GeoJSON corrupto muestra error explícito, nunca reemplazo sintético', async t => {
  const manifest = await fixture('manifest.json')
  const broken = structuredClone(data); broken.features[0].properties.month = 13
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(url.endsWith('manifest.json') ? manifest : JSON.stringify(broken)))
  const runtime = fakeRuntime()
  const { host } = await mount(t, createElement(MapPage, { dataRoot: '/data/demo', selection: initial, onSelectionChange: () => {}, runtimeLoader: runtime.loader }))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /month|1–12/)
  assert.equal(runtime.maps.length, 0)
})
test('región o año sin archivo produce ausencia de datos y no hace petición de GeoJSON', async t => {
  const fetch = await mockFiles(t)
  const runtime = fakeRuntime()
  for (const selection of [{ ...initial, year: 2023 }, { ...initial, region: 'OTRA' }]) {
    const { host } = await mount(t, createElement(MapPage, { dataRoot: '/demo', selection, onSelectionChange: () => {}, runtimeLoader: runtime.loader }))
    assert.match(host.textContent!, /No hay GeoJSON disponible/)
  }
  assert.equal(fetch.mock.callCount(), 2)
  assert.equal(runtime.maps.length, 0)
})
test('errores de WebGL, worker y teselas son visibles', async t => {
  const runtime = fakeRuntime()
  const { host } = await mount(t, createElement(FireMapTest, { demo: true, data, selection: initial, availableYears: [2024], onSelectionChange: () => {}, runtimeLoader: runtime.loader }))
  await act(async () => runtime.maps[0].emit('error', { error: new Error('Teselas sin conexión') }))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /Teselas sin conexión/)
  const failing = await mount(t, createElement(FireMapTest, { demo: true, data, selection: initial, availableYears: [2024], onSelectionChange: () => {}, runtimeLoader: async () => { throw new Error('WebGL no soportado') } }))
  assert.match(failing.host.querySelector('[role="alert"]')!.textContent!, /WebGL no soportado/)
  await act(async () => runtime.maps[0].canvas.dispatchEvent(new dom.window.Event('webglcontextlost', { cancelable: true })))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /contexto WebGL/)
})
test('DEMO permanece visible en pantalla completa; el mapa no cambia scroll global', async t => {
  const runtime = fakeRuntime()
  const overflow = document.body.style.overflow
  const { host } = await mount(t, createElement(FireMapTest, { demo: true, data, selection: initial, availableYears: [2024], onSelectionChange: () => {}, runtimeLoader: runtime.loader }))
  const surface = host.querySelector('.fire-map')!
  Object.defineProperty(document, 'fullscreenElement', { value: surface, configurable: true })
  t.after(() => { delete (document as unknown as Record<string, unknown>).fullscreenElement })
  await act(async () => document.dispatchEvent(new dom.window.Event('fullscreenchange')))
  assert.match(host.querySelector('header')!.textContent!, /DATOS DEMO — NO SON OBSERVACIONES REALES/)
  assert.equal(document.body.style.overflow, overflow)
})
test('errores HTTP no crean mapa ni fallback; la carga de datos se puede reintentar', async t => {
  const manifest = await fixture('manifest.json')
  let available = false
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('manifest.json') ? new Response(manifest) : available ? new Response(raw) : new Response('missing', { status: 404 }))
  const runtime = fakeRuntime()
  const { host } = await mount(t, createElement(MapPage, { dataRoot: '/demo', selection: initial, onSelectionChange: () => {}, runtimeLoader: runtime.loader }))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /HTTP 404/)
  assert.equal(runtime.maps.length, 0)
  available = true
  await act(async () => button(host, 'Reintentar datos').click())
  assert.equal(runtime.maps.length, 1)
})
test('enlace directo recupera los filtros compartidos del mapa', async t => {
  window.history.replaceState(null, '', '/?view=map&mapRegion=PE-DEMO&periodYear=2024&periodMonth=9&sensor=VIIRS')
  await mockFiles(t)
  const runtime = fakeRuntime()
  const { host } = await mount(t, createElement(App, { dataRoot: '/data/demo', mapRuntimeLoader: runtime.loader }))
  assert.equal(host.querySelector<HTMLSelectElement>('[aria-label="Mes del mapa"]')!.value, '9')
  assert.equal((runtime.maps[0].sources['celdas-observadas'].data as CellsData).features[0].properties.cell_days, 0)
  window.history.replaceState(null, '', '/')
})
test('desmontar en StrictMode libera mapa y popup; resolver runtime tarde no crea mapa', async t => {
  const runtime = fakeRuntime()
  const mounted = await mount(t, createElement(StrictMode, null, createElement(FireMapTest, { demo: true, data, selection: initial, availableYears: [2024], onSelectionChange: () => {}, runtimeLoader: runtime.loader })))
  await act(async () => mounted.root.unmount())
  assert.ok(runtime.maps.every(map => map.removed === 1))
  assert.ok(runtime.popups.every(popup => popup.removed))
  let resolve!: (runtime: MapRuntime) => void
  const late = fakeRuntime()
  const pending = await mount(t, createElement(FireMapTest, { demo: true, data, selection: initial, availableYears: [2024], onSelectionChange: () => {}, runtimeLoader: () => new Promise<MapRuntime>(done => { resolve = done }) }))
  await act(async () => pending.root.unmount())
  await act(async () => resolve(await late.loader()))
  assert.equal(late.maps.length, 0)
})
test('Calendario/Mapa comparten región, año, mes y sensor; regreso mantiene contexto y CSV exporta todos los meses', async t => {
  window.history.replaceState(null, '', '/')
  await mockFiles(t)
  const runtime = fakeRuntime()
  const { host } = await mount(t, createElement(App, { dataRoot: '/data/demo', mapRuntimeLoader: runtime.loader }))
  const month = host.querySelector<HTMLButtonElement>('[aria-label="Agosto 2024, MODIS, 3"]')!
  await act(async () => month.click())
  const link = (text: string) => [...host.querySelectorAll<HTMLAnchorElement>('nav a')].find(a => a.textContent === text)!
  await act(async () => link('Mapa').click())
  assert.match(window.location.search, /view=map/)
  assert.equal(host.querySelector<HTMLSelectElement>('[aria-label="Mes del mapa"]')!.value, '8')
  await act(async () => button(host, 'VIIRS').click())
  await choose(host, 'Mes del mapa', '9')
  await act(async () => link('Calendario').click())
  assert.equal(host.querySelector<HTMLSelectElement>('#calendar-sensor')!.value, 'VIIRS')
  assert.equal(host.querySelector('[aria-pressed="true"]')?.getAttribute('aria-label'), 'Septiembre 2024, VIIRS, 0 · válido')
  let blob: Blob | null = null
  t.mock.method(URL, 'createObjectURL', (value: Blob) => { blob = value; return 'blob:csv' })
  t.mock.method(URL, 'revokeObjectURL', () => {})
  t.mock.method(dom.window.HTMLAnchorElement.prototype, 'click', () => {})
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => button(host, 'Descargar CSV').click())
  assert.ok(blob)
  assert.equal(parseMonthlySeries(await (blob as Blob).text()).length, 3)
  t.mock.timers.tick(1000)
})


test('GeoJSON científico anual llega al mapa de Juan sin estimaciones ni avisos DEMO', async t => {
  const real = (name: string) => readFile(new URL(`../public/data/${name}`, import.meta.url), 'utf8')
  const names = ['manifest.json', 'cells_PE-UCA_2024.geojson']
  const files = Object.fromEntries(await Promise.all(names.map(async n => [n, await real(n)])))
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(files[url.split('/').at(-1)!]))
  const runtime = fakeRuntime()
  const { host } = await mount(t, createElement(MapPage, { dataRoot: '/data', selection: { region: 'PE-UCA', year: 2024, month: 9, sensor: 'MODIS' }, onSelectionChange: () => {}, runtimeLoader: runtime.loader }))
  const source = runtime.maps[0].sources['celdas-observadas'].data as CellsData
  assert.ok(source.features.length > 1)
  assert.equal(source.features.reduce((sum, f) => sum + f.properties.cell_days, 0), 2323)
  assert.doesNotMatch(host.textContent!, /DEMO/)
  await choose(host, 'Seleccionar celda del mapa', source.features[0].properties.cell_id)
  assert.match(host.textContent!, /días-celda/)
  assert.match(host.textContent!, /No aplica el factor regional B1/)
  for (const id of ['basemap-blue-marble-layer', 'basemap-firefly-layer', 'basemap-streets-layer', 'basemap-topographic-layer', 'celdas-fill']) assert.ok(runtime.maps[0].getLayer(id))
})
