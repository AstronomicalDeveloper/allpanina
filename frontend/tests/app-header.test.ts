import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import AppHeader from '../src/components/AppHeader.tsx'
import App from '../src/App.tsx'

const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' })
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true },
})
const file = (name: string) => readFile(new URL(`../public/data/${name}`, import.meta.url), 'utf8')
const manifest = JSON.parse(await file('manifest.json'))
const method = JSON.parse(await file('method.json'))

async function mount(t: TestContext, element: ReturnType<typeof createElement>) {
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(element))
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  return { host, root }
}

test('cabecera: nombre, período, producto y generación proceden de los archivos reales', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(JSON.stringify(url.endsWith('method.json') ? method : manifest)))
  const { host } = await mount(t, createElement(AppHeader, { dataRoot: '/data', children: null }))
  assert.match(host.textContent!, /Departamento de Ucayali, Perú \(PE-UCA\)/)
  assert.match(host.textContent!, /2013-01 — 2026-07/)
  assert.ok(host.textContent!.includes(manifest.producto))
  assert.ok(host.textContent!.includes(manifest.generated_at))
  assert.equal(host.querySelector('details summary')!.textContent, 'Acerca de / Fuentes')
  assert.equal(host.querySelector('a[href="/data/manifest.json"]')!.textContent, 'manifest.json')
  assert.doesNotMatch(host.textContent!, /DEMO|Región piloto por confirmar/)
  assert.equal(host.querySelector('select'), null)
})

test('metadatos fallidos no inventan región, período ni fallback; reintento recupera el contexto', async t => {
  let fail = true
  const urls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => {
    urls.push(url)
    return fail ? new Response('inaccesible', { status: 404 }) : new Response(JSON.stringify(url.endsWith('method.json') ? method : manifest))
  })
  const { host } = await mount(t, createElement(AppHeader, { dataRoot: '/data', children: null }))
  assert.match(host.textContent!, /Contexto de región y período no disponible/)
  assert.doesNotMatch(host.textContent!, /Ucayali|2026-07|DEMO/)
  assert.ok(urls.every(url => url.startsWith('/data/') && !url.includes('/demo/')))
  fail = false
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  assert.match(host.textContent!, /Ucayali/)
  assert.equal(host.querySelector('button'), null)
})

test('el nombre descriptivo de otra región nunca se combina con el manifest actual', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(JSON.stringify(url.endsWith('method.json') ? { ...method, region_id: 'OTRA', region: 'Región ajena' } : manifest)))
  const { host } = await mount(t, createElement(AppHeader, { dataRoot: '/data', children: null }))
  assert.match(host.querySelector('.app-region-context')!.textContent!, /PE-UCA/)
  assert.doesNotMatch(host.textContent!, /Región ajena|Ucayali/)
})

test('navegación común conserva enlaces, parámetros, hash e historial sin roles de pestañas', async t => {
  const names = ['manifest.json', 'method.json', 'validation.json', 'monthly_series.csv', 'calibrated_series.csv']
  const files = Object.fromEntries(await Promise.all(names.map(async name => [name, await file(name)])))
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(files[url.split('/').at(-1)!]))
  window.history.replaceState(null, '', '/?view=calendar&mapRegion=PE-UCA&periodYear=2024&periodMonth=9&sensor=VIIRS#detalle')
  t.after(() => window.history.replaceState(null, '', '/'))
  const { host } = await mount(t, createElement(App))
  const header = host.querySelector('.app-header')!
  const links = [...header.querySelectorAll<HTMLAnchorElement>('nav a')]
  assert.deepEqual(links.map(a => a.textContent), ['Calendario', 'Mapa', 'Método'])
  for (const a of links) {
    const url = new URL(a.href)
    assert.equal(url.searchParams.get('periodYear'), '2024')
    assert.equal(url.searchParams.get('periodMonth'), '9')
    assert.equal(url.searchParams.get('sensor'), 'VIIRS')
    assert.equal(url.hash, '#detalle')
    assert.equal(a.getAttribute('role'), null)
  }
  assert.equal(header.querySelector('[role="tablist"]'), null)
  assert.equal(host.querySelector('.app-skip-link')!.getAttribute('href'), '#app-content')
  // Modified clicks retain the browser's open-in-new-tab behavior.
  const modified = new dom.window.MouseEvent('click', { button: 0, ctrlKey: true, bubbles: true, cancelable: true })
  links[1].dispatchEvent(modified)
  assert.equal(modified.defaultPrevented, false)
  assert.match(window.location.search, /view=calendar/)
  await act(async () => links[2].click())
  assert.equal(host.querySelector('.app-header'), header)
  assert.equal(header.querySelector('[aria-current="page"]')!.textContent, 'Método')
  assert.equal(host.querySelector('h1')!.textContent, 'Método y evaluación')
  await act(async () => {
    window.history.replaceState(null, '', '/?view=calendar&mapRegion=PE-UCA&periodYear=2024&periodMonth=9&sensor=VIIRS')
    window.dispatchEvent(new dom.window.PopStateEvent('popstate'))
  })
  assert.equal(header.querySelector('[aria-current="page"]')!.textContent, 'Calendario')
  assert.equal(host.querySelector<HTMLSelectElement>('#calendar-sensor')!.value, 'VIIRS')
  assert.equal(host.querySelector('button[aria-label="Septiembre 2024, VIIRS, 5581"]')!.getAttribute('aria-pressed'), 'true')
})

test('los colores de texto, navegación y superficies comunes cumplen contraste AA', async () => {
  const css = await readFile(new URL('../src/index.css', import.meta.url), 'utf8')
  const token = (name: string) => css.match(new RegExp(`--${name}: (#[0-9A-Fa-f]{6})`))![1]
  function luminance(hex: string) {
    const rgb = hex.slice(1).match(/../g)!.map(n => parseInt(n, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4)
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722
  }
  for (const [foreground, background] of [
    [token('text-primary'), token('surface-page')],
    [token('text-primary'), token('surface-soft')],
    [token('brand-forest'), token('surface-page')],
    ['#FFFFFF', token('brand-forest')],
  ]) {
    const [a, b] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
    assert.ok((a + .05) / (b + .05) >= 4.5, `${foreground} sobre ${background}`)
  }
})
