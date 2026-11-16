import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import MapPage from '../src/pages/map/MapPage'
import CalendarPage from '../src/features/calendar/CalendarPage'
import TopBar from '../src/shell/TopBar'
import type { MapRuntime } from '../src/pages/map/cartography/mapRuntime'
import type { MapCells } from '../src/services/data/mapExploration'
const dom = new JSDOM('<body></body>', { url: 'http://localhost/map' })
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true } })
const files: Record<string, string> = {}
for (const prefix of ['', 'demo/']) for (const name of ['manifest.json', 'monthly_series.csv', 'method.json', 'calibrated_series.csv', ...(prefix ? ['cells_PE-DEMO_2024.geojson'] : ['cells_PE-UCA_2024.geojson','cells_PE-UCA_2026.geojson'])]) files[`/data/${prefix}${name}`] = await readFile(new URL(`../public/data/${prefix}${name}`, import.meta.url), 'utf8')
function mockFiles(t: TestContext) { return t.mock.method(globalThis, 'fetch', async (url: string) => new Response(files[url] ?? 'Missing', { status: files[url] === undefined ? 404 : 200 })) }
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
    images = new Map<string, unknown>()
    hasImage(id: string) { return this.images.has(id) }
    addImage(id: string, image: unknown) { this.images.set(id,image) }
    addControl() { return this }
    getCanvas() { return this.canvas }
    getSource(id: string) { return this.sources[id] }
    getLayer(id: string) { return this.layers.find(layer => layer.id === id) }
    isStyleLoaded() { return true }
    layouts: Record<string, unknown> = {}
    setLayoutProperty(id: string, key: string, value: unknown) { this.layouts[`${id}:${key}`] = value }
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

async function setup(t: TestContext, query = '?periodYear=2024&periodMonth=9&scope=month&calendarSeries=VIIRS&mapSensor=MODIS') {
  const url=new URL(`/map${query}`,'http://localhost');if(!url.searchParams.has('data'))url.searchParams.set('data','pilot')
  window.history.replaceState(null,'',url.pathname+url.search+url.hash)
  const runtime = fakeRuntime()
  const { host, root } = await mount(t, createElement(BrowserRouter, null, createElement(TopBar), createElement(Routes, null,
    createElement(Route, { path: '/map', element: createElement(MapPage, { runtimeLoader: runtime.loader }) }),
    createElement(Route, { path: '/calendar', element: createElement(CalendarPage) }))))
  return { host, root, runtime }
}
function observations(runtime: ReturnType<typeof fakeRuntime>) { return runtime.maps.at(-1)!.sources['celdas-observadas'].data as MapCells }
function total(runtime: ReturnType<typeof fakeRuntime>) { return observations(runtime).features.reduce((sum, feature) => sum + feature.properties.cell_days, 0) }
async function history(direction: 'back' | 'forward') {
  await act(async () => new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('No llegó popstate')), 1500)
    window.addEventListener('popstate', () => { clearTimeout(timeout); resolve() }, { once: true })
    window.history[direction]()
  }))
}

test('Mapa v2 real: septiembre 2024, capas conservadas, percentiles, clic seguro y sensor independiente', async t => {
  mockFiles(t); const { host, runtime } = await setup(t)
  assert.equal(total(runtime), 2323)
  assert.doesNotMatch(host.textContent!, /DEMO DATA/)
  assert.equal(host.querySelector('header nav [aria-current="page"]')!.textContent, 'Map')
  for (const id of ['basemap-firefly-layer', 'basemap-streets-layer', 'basemap-topographic-layer', 'overlay-protected-layer', 'celdas-fill']) assert.ok(runtime.maps[0].getLayer(id))
  const cell = observations(runtime).features[0].properties
  await act(async () => runtime.maps[0].emit('click:celdas-fill', { features: [{ properties: { cell_id: cell.cell_id } }] }))
  assert.match(host.querySelector('.map-cell-detail')!.textContent!, new RegExp(`${cell.cell_days} ${cell.cell_days === 1 ? 'day' : 'days'} with thermal detections`))
  await act(async () => button(host, 'VIIRS').click())
  assert.equal(total(runtime), 5581)
  assert.equal(new URLSearchParams(window.location.search).get('calendarSeries'), 'VIIRS')
  assert.equal(host.querySelector('.map-cell-detail'), null)
  assert.ok(runtime.maps[0].fitted)
  assert.equal(runtime.maps.length, 1, 'sensor changes reuse the map')
})

test('Mapa v2 anual: suma real, desglose por celda y cobertura parcial 2026 hasta julio', async t => {
  mockFiles(t); const { host, runtime } = await setup(t, '?periodYear=2026&scope=year')
  assert.match(host.querySelector('.map-observed')!.textContent!, /Partial year.*7\/12/)
  assert.match(host.querySelector('.map-observed')!.textContent!, /August: not published/)
  const raw = JSON.parse(files['/data/cells_PE-UCA_2026.geojson']) as MapCells
  assert.equal(total(runtime), raw.features.filter(f => f.properties.sensor_group === 'MODIS').reduce((sum, f) => sum + f.properties.cell_days, 0))
  await choose(host, 'Select map cell', observations(runtime).features[0].properties.cell_id)
  assert.equal(host.querySelectorAll('.map-month-bars tbody tr').length, 12)
  await act(async () => button(host, 'Monthly').click())
  await choose(host, 'Map month', '8')
  assert.equal(observations(runtime).features.length, 0)
  assert.match(host.querySelector('.map-observed')!.textContent!, /Period not published/)
  assert.equal(host.querySelector('.map-cell-detail'), null)
})

test('Mapa v2 distingue cero válido, missing y no publicado en modo DEMO explícito', async t => {
  mockFiles(t); const { host } = await setup(t, '?data=demo&periodYear=2024&periodMonth=9&scope=month')
  assert.match(host.textContent!, /DEMO DATA/)
  assert.match(host.querySelector('.map-observed')!.textContent!, /Valid zero/)
  await choose(host, 'Map month', '10')
  assert.match(host.querySelector('.map-observed')!.textContent!, /No usable data/)
  await choose(host, 'Map month', '11')
  assert.match(host.querySelector('.map-observed')!.textContent!, /Period not published/)
})

test('F5b: pestañas Explore/Layers/Information conservan estado; panel plegable; hoja móvil de tres alturas', async t => {
  mockFiles(t); const { host, runtime } = await setup(t, '')
  const tabs = [...host.querySelectorAll<HTMLButtonElement>('.map-sidebar [role="tab"]')]
  assert.deepEqual(tabs.map(b => b.textContent), ['Explore', 'Layers', 'Information'])
  const panel = (name: string) => host.querySelector<HTMLElement>(`.map-tab--${name}`)!
  const sheet = host.querySelector<HTMLButtonElement>('.map-sheet-handle')!
  assert.equal(sheet.getAttribute('aria-expanded'), 'false'); assert.match(sheet.getAttribute('aria-label')!, /minimized/)
  assert.equal(panel('explore').hidden, false); assert.equal(panel('layers').hidden, true); assert.equal(panel('information').hidden, true)
  await choose(host, 'Select map cell', observations(runtime).features[0].properties.cell_id)
  await act(async () => tabs[1].click())
  assert.equal(panel('layers').hidden, false); assert.equal(panel('explore').hidden, true); assert.equal(tabs[1].getAttribute('aria-selected'), 'true')
  await act(async () => tabs[1].dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  assert.equal(panel('information').hidden, false)
  await act(async () => tabs[0].click())
  assert.ok(host.querySelector('.map-cell-detail'), 'the inspector keeps the selected cell after switching tabs')
  const relief = [...host.querySelectorAll<HTMLButtonElement>('.map-basemaps button')].find(b => b.textContent!.startsWith('Topographic'))!
  await act(async () => relief.click())
  assert.equal(runtime.maps[0].layouts['basemap-topographic-layer:visibility'], 'visible')
  assert.equal(runtime.maps[0].layouts['basemap-blue-marble-layer:visibility'], 'none')
  const hide = host.querySelector<HTMLButtonElement>('.map-sidebar-collapse')!
  assert.equal(hide.getAttribute('aria-label'), 'Hide panel')
  await act(async () => hide.click())
  assert.equal(host.querySelector<HTMLElement>('.map-sidebar')!.hidden, true)
  assert.ok(host.querySelector('.map-workspace--collapsed'))
  await act(async () => button(host, 'Show panel').click())
  assert.equal(host.querySelector<HTMLElement>('.map-sidebar')!.hidden, false)
  assert.equal(sheet.getAttribute('aria-expanded'), 'true'); assert.match(sheet.getAttribute('aria-label')!, /half height/)
  await act(async () => sheet.click()); assert.ok(host.querySelector('.map-workspace--sheet-full'))
  await act(async () => sheet.click()); assert.ok(host.querySelector('.map-workspace--sheet-peek')); assert.equal(sheet.getAttribute('aria-expanded'), 'false')
  await act(async () => sheet.click()); assert.ok(host.querySelector('.map-workspace--sheet-half')); assert.equal(sheet.getAttribute('aria-expanded'), 'true')
  await act(async () => button(host, 'VIIRS').click())
  assert.equal(runtime.maps.length, 1)
})

test('F5b: línea de tiempo con años, mes y año completo; barras relativas a la serie publicada', async t => {
  mockFiles(t); const { host } = await setup(t, '?periodYear=2024&periodMonth=9&scope=month&mapSensor=MODIS')
  const bar = host.querySelector<HTMLElement>('.map-timebar')!
  assert.equal(bar.getAttribute('aria-label'), 'Timeline')
  const months = [...bar.querySelectorAll<HTMLButtonElement>('.map-timebar-month')]
  assert.equal(months.length, 12)
  assert.equal(months[8].getAttribute('aria-pressed'), 'true')
  assert.match(months[8].getAttribute('aria-label')!, /^September 2024: [\d,]+ cell-days \(MODIS, published monthly series\)$/)
  for (const m of months) assert.match(m.getAttribute('aria-label')!, /cell-days|valid zero|no usable data|not published/)
  await act(async () => months[7].click())
  assert.equal(new URLSearchParams(window.location.search).get('periodMonth'), '8')
  assert.equal(new URLSearchParams(window.location.search).get('scope'), 'month')
  await act(async () => [...bar.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Whole year')!.click())
  assert.equal(new URLSearchParams(window.location.search).get('scope'), 'year')
  const years = [...bar.querySelectorAll<HTMLButtonElement>('.map-timebar-years button')]
  assert.ok(years.some(b => b.textContent === '2024' && b.getAttribute('aria-pressed') === 'true'))
})

test('Mapa v2 URL e historial: período compartido, sensores independientes y regreso al Calendario', async t => {
  mockFiles(t); const { host, runtime } = await setup(t, '?periodYear=2024&periodMonth=9&scope=month&calendarSeries=MODIS&mapSensor=MODIS&extra=keep#periodo')
  await act(async () => button(host, 'VIIRS').click())
  assert.equal(new URLSearchParams(window.location.search).get('calendarSeries'), 'MODIS')
  assert.equal(window.location.hash, '#periodo')
  assert.equal(new URLSearchParams(window.location.search).get('extra'), 'keep')
  await act(async () => button(host, 'Copy link').click())
  const shared = host.querySelector('.map-feedback')!.textContent!
  assert.match(shared, /\/map\?/)
  assert.match(shared, /calendarSeries=MODIS/)
  assert.match(shared, /mapSensor=VIIRS/)
  assert.doesNotMatch(shared, /view=map/)
  await history('back'); assert.equal(total(runtime), 2323)
  await history('forward'); assert.equal(total(runtime), 5581)
  await choose(host, 'Map month', '8')
  const calendar = [...host.querySelectorAll<HTMLAnchorElement>('nav a')].find(a => a.textContent === 'Calendar')!
  await act(async () => calendar.click())
  assert.equal(host.querySelector('[aria-label="Series"] button[aria-pressed="true"]')!.textContent, 'MODIS')
  assert.equal(new URLSearchParams(window.location.search).get('periodMonth'), '8')
  assert.equal(new URLSearchParams(window.location.search).get('mapSensor'), 'VIIRS')
  assert.equal(runtime.maps[0].removed, 1)
  const mapLink = host.querySelector<HTMLAnchorElement>('.calendar-map-action')!
  await act(async () => mapLink.click())
  assert.equal(window.location.pathname, '/map')
  assert.equal(new URLSearchParams(window.location.search).get('scope'), 'month')
  assert.equal(new URLSearchParams(window.location.search).get('mapSensor'), 'VIIRS')
})

test('Mapa v2 archivo no publicado conserva filtros sin mostrar un cero', async t => {
  mockFiles(t); const { host } = await setup(t, '?periodYear=2030')
  assert.match(host.querySelector('.map-observed')!.textContent!, /No GeoJSON is published/)
  assert.equal(host.querySelector('.map-observed-value'), null)
  await choose(host, 'Map year', '2024')
  assert.ok(host.querySelector('.map-observed-value'))
})

test('Mapa v2 error real de archivo y reintento sin fallback DEMO', async t => {
  let fail = true; const urls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => { urls.push(url); return new Response(fail && url.endsWith('.geojson') ? 'missing' : files[url], { status: fail && url.endsWith('.geojson') ? 404 : 200 }) })
  const { host, runtime } = await setup(t)
  assert.match(host.querySelector('.map-page-v2 [role="alert"]')!.textContent!, /The observations could not be loaded/)
  assert.equal(runtime.maps.length, 0); assert.ok(urls.every(url => !url.includes('demo')))
  fail = false; await act(async () => button(host, 'Retry data').click())
  assert.equal(total(runtime), 2323)
})

test('Mapa v2 error de proveedor no sustituye observaciones y limpia recursos al desmontar', async t => {
  mockFiles(t); const { host, root, runtime } = await setup(t)
  await act(async () => runtime.maps[0].emit('error', { error: new Error('Proveedor sin conexión') }))
  assert.match(host.querySelector('.map-page-v2 [role="alert"]')!.textContent!, /Proveedor sin conexión/)
  assert.equal(total(runtime), 2323)
  await act(async () => root.render(null))
  assert.equal(runtime.maps[0].removed, 1)
  assert.equal(runtime.popups[0].removed, true)
})


test('Mapa v2 aborta el año pendiente y no presenta datos antiguos ni respuestas tardías', async t => {
  let release: ((response: Response) => void) | undefined
  let pendingSignal: AbortSignal | undefined
  t.mock.method(globalThis, 'fetch', async (url: string, options?: RequestInit) => {
    if (url.endsWith('cells_PE-UCA_2026.geojson')) {
      pendingSignal = options?.signal ?? undefined
      return new Promise<Response>(resolve => { release = resolve })
    }
    return new Response(files[url] ?? '', { status: files[url] === undefined ? 404 : 200 })
  })
  const { host, runtime } = await setup(t)
  await choose(host, 'Map year', '2026')
  assert.match(host.querySelector('[role="status"]')!.textContent!, /Loading observations/)
  assert.equal(host.querySelector('.map-observed-value'), null)
  assert.equal(runtime.maps[0].removed, 1)
  assert.ok(pendingSignal)
  await history('back')
  assert.equal(pendingSignal.aborted, true)
  assert.equal(total(runtime), 2323)
  await act(async () => release!(new Response(files['/data/cells_PE-UCA_2026.geojson'])))
  assert.equal(total(runtime), 2323)
  assert.match(host.querySelector('.map-observed h3')!.textContent!, /September 2024/)
})

test('Mapa v2 detecta discrepancias entre GeoJSON y serie regional antes de dibujar', async t => {
  const inconsistent = JSON.parse(files['/data/cells_PE-UCA_2024.geojson']) as MapCells
  inconsistent.features[0].properties.cell_days += 1
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(url.endsWith('.geojson') ? JSON.stringify(inconsistent) : files[url]))
  const { host, runtime } = await setup(t)
  assert.match(host.querySelector('.map-page-v2 [role="alert"]')!.textContent!, /no coinciden/)
  assert.equal(runtime.maps.length, 0)
})


test('Mapa v2 sin archivos anuales publicados muestra vacío sin inventar un año', async t => {
  const manifest = JSON.parse(files['/data/manifest.json'])
  manifest.files = manifest.files.filter((name: string) => !name.endsWith('.geojson'))
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(url.endsWith('manifest.json') ? JSON.stringify(manifest) : files[url]))
  const { host, runtime } = await setup(t, '')
  assert.match(host.querySelector('[role="status"]')!.textContent!, /has no published map years/)
  assert.equal(runtime.maps.length, 0)
  assert.equal(host.querySelector('.map-observed-value'), null)
})


test('aviso de copia se reinicia, desaparece a los cuatro segundos y admite cierre manual', async t => {
  mockFiles(t)
  const descriptor = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
  let fail = false
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { if (fail) throw new Error('denegado') } } })
  t.after(() => { if (descriptor) Object.defineProperty(navigator, 'clipboard', descriptor); else Reflect.deleteProperty(navigator, 'clipboard') })
  const { host } = await setup(t, '?data=demo&periodYear=2024')
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => button(host, 'Copy link').click())
  assert.match(host.querySelector('.map-feedback--share')!.textContent!, /copied/)
  await act(async () => t.mock.timers.tick(3000))
  await act(async () => button(host, 'Copy link').click())
  await act(async () => t.mock.timers.tick(1000))
  assert.ok(host.querySelector('.map-feedback--share'))
  await act(async () => t.mock.timers.tick(3000))
  assert.equal(host.querySelector('.map-feedback--share'), null)
  fail = true
  await act(async () => button(host, 'Copy link').click())
  await act(async () => t.mock.timers.tick(5000))
  assert.match(host.querySelector('.map-feedback--share')!.textContent!, /Copy this link/)
  await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Close link notice"]')!.click())
  assert.equal(host.querySelector('.map-feedback--share'), null)
})


test('herramientas móviles abren, cierran con Escape y al ejecutar una acción', async t => {
  mockFiles(t); const { host, runtime } = await setup(t, '?data=demo&periodYear=2024')
  const toggle = host.querySelector<HTMLButtonElement>('[aria-label="Map tools"]')!
  assert.equal(toggle.getAttribute('aria-expanded'), 'false')
  await act(async () => toggle.click())
  assert.equal(toggle.getAttribute('aria-expanded'), 'true')
  assert.equal(toggle.getAttribute('aria-controls'), 'map-view-actions')
  await act(async () => host.querySelector('.map-view-tools')!.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.equal(toggle.getAttribute('aria-expanded'), 'false')
  assert.equal(document.activeElement, toggle)
  await act(async () => toggle.click())
  await act(async () => button(host, 'Zoom to scope').click())
  assert.ok(runtime.maps[0].fitted)
  assert.equal(toggle.getAttribute('aria-expanded'), 'false')
  assert.equal(document.activeElement, toggle)
})
