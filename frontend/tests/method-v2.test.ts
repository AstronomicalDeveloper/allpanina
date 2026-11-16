import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import MethodPage from '../src/pages/method/MethodPage'
const dom = new JSDOM('<body></body>', { url: 'http://localhost/metodo' })
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true } })
const files: Record<string, string> = {}
for (const prefix of ['', 'demo/']) for (const name of ['method.json', 'validation.json', 'manifest.json']) files[`/data/${prefix}${name}`] = await readFile(new URL(`../public/data/${prefix}${name}`, import.meta.url), 'utf8')
for (const name of ['manifest.json','method.json']) files[`/data/peru/${name}`] = await readFile(new URL(`../public/data/peru/${name}`, import.meta.url), 'utf8')
function mockFiles(t: TestContext, overrides: Record<string, string> = {}) {
  return t.mock.method(globalThis, 'fetch', async (url: string) => new Response(overrides[url] ?? files[url] ?? '', { status: overrides[url] === 'FAIL' ? 503 : files[url] === undefined ? 404 : 200 }))
}
async function mount(t: TestContext, url = '/metodo') {
  const pilotUrl=new URL(url,'http://localhost');if(!pilotUrl.searchParams.has('data'))pilotUrl.searchParams.set('data','pilot')
  window.history.replaceState(null,'',pilotUrl.pathname+pilotUrl.search+pilotUrl.hash)
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  await act(async () => root.render(createElement(BrowserRouter, null, createElement(MethodPage))))
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  return { host, root }
}
async function click(host: HTMLElement, label: string) {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === label)
  assert.ok(button, label); await act(async () => button.click())
}

test('Método v2 real: alcance, factor, etapas y métricas precisas sin DEMO ni influencia de filtros', async t => {
  const fetch = mockFiles(t)
  const { host } = await mount(t, '/metodo?periodYear=2030&mapSensor=VIIRS&calendarSeries=MODIS')
  assert.equal(host.querySelector('h1')!.textContent, 'Method and evaluation')
  assert.match(host.querySelector('.method-scope')!.textContent!, /PE-UCA.*2013-01.*2026-07/)
  assert.match(host.querySelector('.method-scope')!.textContent!, /Ucayali/)
  assert.doesNotMatch(host.textContent!, /DEMO DATA/)
  assert.equal(host.querySelector('.method-formula strong')!.textContent, '0.2936037')
  assert.equal(host.querySelector('.method-formula strong')!.getAttribute('title'), '0.2936037257560573')
  assert.equal(host.querySelectorAll('.method-timeline li').length, 3)
  assert.equal(host.querySelector('.method-wape--B0 strong')!.textContent, '321.6%')
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, '30.8%')
  assert.equal(host.querySelector('.method-wape--B1 strong')!.getAttribute('title'), '0.30828088935210907')
  assert.match(host.querySelector('[aria-label="All published metrics"]')!.textContent!, /29.7/)
  await click(host, 'Validation')
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, '17.8%')
  assert.match(host.querySelector('.method-wape--B1')!.textContent!, /24 matched months.*method.json/)
  await click(host, 'Training')
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, 'Not available')
  assert.ok(fetch.mock.calls.every(call => !String(call.arguments[0]).includes('demo')))
})

test('F4: Método en inglés; los textos científicos publicados se citan en español y marcados', async t => {
  mockFiles(t)
  const { host } = await mount(t, '/method')
  assert.deepEqual([...host.querySelectorAll('.method-section h2')].map(h => h.textContent).slice(0, 4), ['From signal to indicator', 'Comparing instruments needs context', 'Separate periods to evaluate', 'What changes with calibration'])
  assert.deepEqual([...host.querySelectorAll('.method-index a')].map(a => a.getAttribute('href')), ['#observations', '#evaluation', '#limits'])
  for (const id of ['observations', 'evaluation', 'limits']) assert.ok(host.querySelector(`#${id}`), id)
  assert.equal(host.querySelector('[lang=es]'), null)
  assert.doesNotMatch(host.textContent!, /DECISIONS|aprobado por|P11|P15|T29/)
  assert.deepEqual([...host.querySelectorAll('.method-switch button')].map(b => b.textContent), ['Training', 'Validation', 'Test'])
  for (const el of host.querySelectorAll('.method-v2 :is(h1, h2, h3, h4, summary, th, button, dt)')) if (!el.closest('[lang="es"]')) assert.doesNotMatch(el.textContent!, /(ción|Método|Prueba|Meses|Sesgo|Fuente|días)/, el.textContent!)
})

test('Método v2 permite examinar errores de B1 y B0 conservando valores y signo', async t => {
  mockFiles(t); const { host } = await mount(t)
  const region = host.querySelector('[aria-label="Monthly test errors"]')!
  assert.equal(region.querySelectorAll('tbody tr').length, 5)
  assert.match(region.querySelector('tbody tr')!.textContent!, /2025-09.*472.0.*656.8.*184.8/)
  const details = region.closest('details')!
  await act(async () => { details.open = true; details.dispatchEvent(new dom.window.Event('toggle')) })
  assert.equal(details.open, true)
  const select = host.querySelector<HTMLSelectElement>('[aria-label="Method for the errors"]')!
  await act(async () => { select.value = 'B0'; select.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
  assert.match(host.querySelector('[aria-label="Monthly test errors"] tbody tr')!.textContent!, /2237.0.*1765.0/)
  assert.match(host.querySelector('.method-limitations')!.textContent!, /B1.*individual map cells/)
  assert.equal(host.querySelectorAll('.method-hashes > div').length, 18)
  assert.ok(host.querySelector('a[href="/data/validation.json"]'))
})

test('Método v2 conserva null, cero y métodos ausentes sin inventar métricas', async t => {
  const validation = JSON.parse(files['/data/validation.json'])
  validation.methods.B1.metrics = { mae: 0, wape: null, bias: -2 }
  delete validation.methods.B0
  mockFiles(t, { '/data/validation.json': JSON.stringify(validation) })
  const { host } = await mount(t)
  assert.equal(host.querySelector('.method-wape--B0 strong')!.textContent, 'Not available')
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, 'Not available')
  const table = host.querySelector('[aria-label="All published metrics"]')!
  assert.match(table.textContent!, /0.0Not available-2.0/)
})

test('Método v2 archivo inválido permite lectura parcial y reintento sin fallback', async t => {
  let fail = true
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(fail && url.endsWith('validation.json') ? '{}' : files[url]))
  const { host } = await mount(t)
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /validation.json/)
  assert.ok(host.querySelector('.method-definition'))
  await click(host, 'Validation')
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, '17.8%')
  fail = false; await click(host, 'Retry loading')
  assert.equal(host.querySelector('[role="alert"]'), null)
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, '30.8%')
  assert.doesNotMatch(host.textContent!, /DEMO DATA/)
})

test('Método v2 no combina resultados de regiones incompatibles', async t => {
  const validation = JSON.parse(files['/data/validation.json']); validation.region_id = 'OTRA-REGION'
  mockFiles(t, { '/data/validation.json': JSON.stringify(validation) })
  const { host } = await mount(t)
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /different regions/)
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, 'Not available')
  assert.equal(host.querySelectorAll('[aria-label="All published metrics"] tbody tr').length, 0)
})

test('Método v2 DEMO explícito no publica métricas reales como resultados sintéticos', async t => {
  mockFiles(t); const { host } = await mount(t, '/metodo?data=demo')
  assert.match(host.textContent!, /DEMO DATA/)
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, 'Not available')
  assert.equal(host.querySelector('.method-formula strong'), null)
  assert.ok(host.querySelector('a[href="/data/demo/method.json"]'))
  assert.doesNotMatch(host.textContent!, /321.6%|30.8%|17.8%/)
})

test('Método v2 cancela solicitudes pendientes al abandonar la página', async t => {
  const signals: AbortSignal[] = []
  t.mock.method(globalThis, 'fetch', (_url: string, options?: RequestInit) => {
    signals.push(options!.signal!); return new Promise<Response>(() => {})
  })
  const { host, root } = await mount(t)
  assert.match(host.querySelector('[role="status"]')!.textContent!, /Loading/)
  assert.equal(signals.length, 3)
  await act(async () => root.render(null))
  assert.ok(signals.every(signal => signal.aborted))
})
