import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import type { TestContext } from 'node:test'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import AppRoutes from '../src/app/AppRoutes'
import type { MapRuntime } from '../src/pages/map/cartography/mapRuntime'
export const dom = new JSDOM('<body></body>', { url: 'http://localhost/calendario' })
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true } })
export const files: Record<string, string> = {}
for (const prefix of ['', 'demo/']) for (const name of ['method.json', 'validation.json', 'manifest.json', 'monthly_series.csv', 'calibrated_series.csv', ...(prefix ? ['cells_PE-DEMO_2024.geojson'] : ['cells_PE-UCA_2024.geojson','cells_PE-UCA_2026.geojson'])]) files[`/data/${prefix}${name}`] = await readFile(new URL(`../public/data/${prefix}${name}`, import.meta.url), 'utf8')
for (const name of ['manifest.json','method.json','monthly_series.csv','calibrated_series.csv','validation.json']) files[`/data/peru/${name}`] = await readFile(new URL(`../public/data/peru/${name}`, import.meta.url), 'utf8')
files['/cartography/departamentos_inei_2023.navigation.geojson']=await readFile(new URL('../public/cartography/departamentos_inei_2023.navigation.geojson',import.meta.url),'utf8')
export function mockFiles(t: TestContext, overrides: Record<string, string> = {}) { return t.mock.method(globalThis, 'fetch', async (url: string) => new Response(overrides[url] ?? files[url] ?? '', { status: files[url] === undefined && overrides[url] === undefined ? 404 : 200 })) }
export async function mount(t: TestContext, url = '/calendario', element = createElement(AppRoutes), mode: 'pilot'|'peru' = 'pilot') {
 const pilotUrl=new URL(url,'http://localhost');if(mode==='pilot'&&!pilotUrl.searchParams.has('data'))pilotUrl.searchParams.set('data','pilot')
 window.history.replaceState(null,'',pilotUrl.pathname+pilotUrl.search+pilotUrl.hash)
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 await act(async()=>root.render(createElement(BrowserRouter,null,element)))
 t.after(async()=>{await act(async()=>root.unmount());host.remove();window.sessionStorage.clear()})
 return {host,root}
}
export async function click(host: HTMLElement, label: string) {
 const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === label || b.getAttribute('aria-label') === label)
 assert.ok(button,label); await act(async()=>button.click())
}
export async function choose(host: HTMLElement, selector: string, value: string) {
 const select=host.querySelector<HTMLSelectElement>(selector)!;assert.ok(select,selector)
 await act(async()=>{select.value=value;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}))})
}
/** Serie del Calendario (conmutador «Series»): 'MODIS', 'VIIRS' o 'Estimate (B1)'. */
export async function chooseSeries(host: HTMLElement, label: string) {
 const button=[...host.querySelectorAll<HTMLButtonElement>('[role="group"][aria-label="Series"] button')].find(b=>b.textContent===label)
 assert.ok(button,`serie ${label}`); await act(async()=>button.click())
}
/** Serie elegida en el conmutador del Calendario. */
export function currentSeries(host: HTMLElement) {
 return host.querySelector('[role="group"][aria-label="Series"] button[aria-pressed="true"]')?.textContent ?? null
}
export async function navigate(path: string) {
 const url=new URL(path,'http://localhost');if(!url.searchParams.has('data'))url.searchParams.set('data','pilot');path=url.pathname+url.search+url.hash
 await act(async()=>{window.history.pushState(null,'',path);window.dispatchEvent(new dom.window.PopStateEvent('popstate'))})
}
type Listener = (event: { features?: { properties: Record<string, unknown> }[]; lngLat?: unknown; error?: Error }) => void
export function fakeRuntime() {
  const maps: FakeMap[] = []
  const popups: FakePopup[] = []
  class FakePopup {
    element = document.createElement('div')
    getElement() { return this.element }
    content: HTMLElement | null = null
    removed = false
    constructor() { popups.push(this) }
    setLngLat() { return this }
    setDOMContent(content: HTMLElement) { this.content = content; return this }
    addTo() { this.removed = false; return this }
    remove() { this.removed = true; return this }
  }
  class FakeMap {
    canvas = document.createElement('canvas')
    listeners = new Map<string, Listener[]>()
    sources: Record<string, { data: unknown; setData: (data: unknown) => void }> = {}
    style: unknown
    layers: { id: string }[]
    removed = 0
    fitted: unknown = null
    fits: unknown[] = []
    constructor(options: { style: { sources: Record<string, { data?: unknown }>; layers: { id: string }[] } }) {
      this.style = options.style
      this.layers = options.style.layers
      for (const [key, value] of Object.entries(options.style.sources)) this.sources[key] = { data: value.data, setData: data => { this.sources[key].data = data } }
      maps.push(this)
      queueMicrotask(() => this.emit('load'))
    }
    on(name: string, layerOrCallback: string | Listener, callback?: Listener) {
      const key = typeof layerOrCallback === 'string' ? `${name}:${layerOrCallback}` : name
      this.listeners.set(key, [...(this.listeners.get(key) ?? []), callback ?? layerOrCallback as Listener]); return this
    }
    off(name: string, callback: Listener) { this.listeners.set(name,(this.listeners.get(name) ?? []).filter(listener=>listener!==callback)); return this }
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
    zoom = 7
    getZoom() { return this.zoom }
    eased: unknown = null
    easeTo(options: { zoom: number }) { this.eased = options; this.zoom = options.zoom; this.emit('zoomend') }
    fitBounds(bounds: unknown) { this.fitted = bounds; this.fits.push(bounds) }
    resize() {}
    remove() { this.removed++; this.listeners.clear() }
  }
  const runtime = { Map: FakeMap, Popup: FakePopup, NavigationControl: class {}, ScaleControl: class {} } as unknown as MapRuntime
  return { maps, popups, loader: async () => runtime }
}
