import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToStaticMarkup } from 'react-dom/server'
import { JSDOM } from 'jsdom'
import App from '../src/App.tsx'
import MethodPage from '../src/components/method/MethodPage.tsx'
import MethodMetrics from '../src/components/method/MethodMetrics.tsx'
import MethodErrors from '../src/components/method/MethodErrors.tsx'
import MethodComparison from '../src/components/method/MethodComparison.tsx'
import type { ValidationResult } from '../src/types/data.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true },
})
const fixture = (name: string) => readFile(new URL(`../public/data/demo/${name}`, import.meta.url), 'utf8')
const methodJson = await fixture('method.json')
const validationJson = await fixture('validation.json')
const monthlyCsv = await fixture('monthly_series.csv')

async function mount(t: TestContext, element: ReturnType<typeof createElement>) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(element))
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  return host
}
function mockFiles(t: TestContext) {
  return t.mock.method(globalThis, 'fetch', async (url: string) => {
    if (url.endsWith('method.json')) return new Response(methodJson)
    if (url.endsWith('validation.json')) return new Response(validationJson)
    if (url.endsWith('monthly_series.csv')) return new Response(monthlyCsv)
    throw new Error(`Archivo inesperado: ${url}`)
  })
}
test('carga method y validation por loaders L3 y presenta textos, períodos y DEMO sin cifras inventadas', async t => {
  const fetch = mockFiles(t)
  const host = await mount(t, createElement(MethodPage, { dataRoot: '/data/demo/' }))
  assert.equal(fetch.mock.callCount(), 2)
  assert.match(host.textContent!, /DATOS DEMO — NO SON OBSERVACIONES REALES/)
  assert.match(host.textContent!, /dias-celda con deteccion/)
  assert.match(host.textContent!, /MODIS \(DEMO\), VIIRS \(DEMO\)/)
  for (const period of ['2024-08:2024-08', '2024-09:2024-09', '2024-10:2024-10']) assert.ok(host.textContent!.includes(period))
  assert.ok(host.textContent!.includes(JSON.parse(methodJson).calibration))
  assert.match(host.textContent!, /Sin resultados de métricas disponibles/)
  assert.match(host.textContent!, /Detalle mensual no disponible/)
  assert.equal(host.querySelector('[role="alert"]'), null)
  for (const article of host.querySelectorAll('article')) {
    assert.deepEqual([...article.querySelectorAll('dd')].map(dd => dd.textContent), ['No disponible', 'No disponible', 'No disponible', '0'])
  }
})
test('métricas disponibles conservan cero, signo, WAPE y split; un método ausente queda explícito', async t => {
  const data: ValidationResult = { region_id: 'TEST-ONLY', methods: {
    B1: { split: 'valid', metrics: { mae: 0, wape: 0.18, bias: -1.5 }, n_months_matched: 2, detalle_mensual: 'no disponible' },
  } }
  const host = await mount(t, createElement(MethodMetrics, { validation: data }))
  const b1 = host.querySelector('[aria-label="Métricas B1"]')!
  assert.match(b1.textContent!, /valid · validación/)
  assert.deepEqual([...b1.querySelectorAll('dd')].map(dd => dd.textContent), ['0', '0.18', '-1.5', '2'])
  assert.doesNotMatch(b1.textContent!, /18%/)
  assert.match(host.querySelector('[aria-label="Métricas B0"]')!.textContent!, /No disponible/)
})
test('comparación separa train, valid y test sin atribuir métricas a otro split', async t => {
  const data: ValidationResult = { region_id: 'TEST-ONLY', methods: {
    B0: { split: 'train', metrics: { mae: 1, wape: 0, bias: 0 }, n_months_matched: 4 },
    B1: { split: 'valid', metrics: { mae: 2, wape: 0, bias: 0 }, n_months_matched: 2 },
  } }
  const host = await mount(t, createElement(MethodComparison, { validation: data }))
  const rows = [...host.querySelectorAll('tbody tr')].map(row => [...row.querySelectorAll('td')].map(td => td.textContent))
  assert.deepEqual(rows, [['Métricas recibidas · 4 meses emparejados', 'No disponible'], ['No disponible', 'Métricas recibidas · 2 meses emparejados'], ['No disponible', 'No disponible']])
})
test('tabla de errores usa solo residuos test, ordena y limita a cinco filas', async t => {
  const residuals = [1, 7, 2, 9, 4, 3].map((n, i) => ({ month: `2024-0${i + 1}`, modis_observed: 10, estimate: 10 - n, signed_error: -n, absolute_error: n }))
  const data: ValidationResult = { region_id: 'TEST-ONLY', methods: {
    B0: { split: 'test', metrics: { mae: null, wape: null, bias: null }, n_months_matched: 6, residuals },
    B1: { split: 'valid', metrics: { mae: null, wape: null, bias: null }, n_months_matched: 6, residuals },
  } }
  const host = await mount(t, createElement(MethodErrors, { validation: data }))
  const rows = [...host.querySelectorAll('tbody tr')]
  assert.equal(rows.length, 5)
  assert.deepEqual(rows.map(row => row.lastElementChild!.textContent), ['9', '7', '4', '3', '2'])
  assert.deepEqual([...rows[0].children].map(cell => cell.textContent), ['2024-04', 'B0', '10', '1', '-9', '9'])
})
test('página informa carga y muestra cada archivo tan pronto como está disponible', async t => {
  let completeValidation!: (response: Response) => void
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('method.json') ? new Response(methodJson) : new Promise<Response>(resolve => { completeValidation = resolve }))
  const host = await mount(t, createElement(MethodPage, { dataRoot: '/demo' }))
  assert.match(host.querySelector('[role="status"]')!.textContent!, /Cargando/)
  assert.ok(host.querySelector('#method-explanation-title'))
  await act(async () => completeValidation(new Response(validationJson)))
  assert.ok(host.querySelector('#method-metrics-title'))
  assert.doesNotMatch(host.textContent!, /Cargando archivos/)
})
test('archivo inválido no impide presentar el otro; reintentar recupera lectura', async t => {
  let method = '{JSON incorrecto'
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(url.endsWith('method.json') ? method : validationJson))
  const host = await mount(t, createElement(MethodPage, { dataRoot: '/demo' }))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /method.json.*JSON inválido/)
  assert.match(host.textContent!, /Resultados parciales/)
  assert.ok(host.querySelector('#method-metrics-title'))
  method = methodJson
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  assert.ok(host.querySelector('#method-explanation-title'))
  assert.equal(host.querySelector('[role="alert"]'), null)
})
test('validation inaccesible o mal formado conserva la explicación y muestra error controlado', async t => {
  let response = () => new Response('no encontrado', { status: 404 })
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('method.json') ? new Response(methodJson) : response())
  const host = await mount(t, createElement(MethodPage, { dataRoot: '/demo' }))
  assert.ok(host.querySelector('#method-explanation-title'))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /validation.json.*HTTP 404/)
  response = () => new Response('{"region_id":"TEST-ONLY","methods":{"B1":{}}}')
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /validation.json.*valor permitido/)
  assert.equal(host.querySelector('#method-metrics-title'), null)
})
test('resultados parciales permiten mostrar métricas de un único método y conservar null', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(url.endsWith('method.json') ? methodJson : JSON.stringify({ region_id: 'TEST-ONLY', methods: { B0: { split: 'test', metrics: { mae: 0, wape: null, bias: null }, n_months_matched: 1, detalle_mensual: 'no disponible' } } })))
  const host = await mount(t, createElement(MethodPage, { dataRoot: '/demo' }))
  assert.match(host.textContent!, /Resultados parciales/)
  assert.doesNotMatch(host.textContent!, /Sin resultados de métricas disponibles/)
  assert.deepEqual([...host.querySelectorAll('[aria-label="Métricas B0"] dd')].map(dd => dd.textContent), ['0', 'No disponible', 'No disponible', '1'])
})
test('navegación cambia Calendario/Método, admite enlace directo y popstate', async t => {
  window.history.replaceState(null, '', '/?view=method')
  mockFiles(t)
  const host = await mount(t, createElement(App, { dataRoot: '/data/demo' }))
  assert.equal(host.querySelector('h1')!.textContent, 'Método y evaluación')
  assert.equal(host.querySelector('[aria-current="page"]')!.textContent, 'Método')
  const link = (text: string) => [...host.querySelectorAll<HTMLAnchorElement>('nav a')].find(a => a.textContent === text)!
  await act(async () => link('Calendario').click())
  assert.equal(host.querySelector('h1')!.textContent, 'Calendario histórico')
  assert.ok(host.querySelector('.calendar-table'))
  assert.match(window.location.search, /view=calendar/)
  await act(async () => link('Método').click())
  assert.equal(host.querySelector('h1')!.textContent, 'Método y evaluación')
  assert.match(window.location.search, /view=method/)
  await act(async () => {
    window.history.replaceState(null, '', '/?view=calendar')
    window.dispatchEvent(new dom.window.PopStateEvent('popstate'))
  })
  assert.equal(host.querySelector('h1')!.textContent, 'Calendario histórico')
})
test('?demo=1 conserva el inspector L3 incluso con view=method', () => {
  window.history.replaceState(null, '', '/?demo=1&view=method')
  const html = renderToStaticMarkup(createElement(App, { dataRoot: '/data/demo' }))
  assert.match(html, /Comprobación temporal de datos L3/)
  assert.doesNotMatch(html, /Navegación principal/)
  window.history.replaceState(null, '', '/')
})
