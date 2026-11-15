import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
const dom = new JSDOM('<body></body>', { url: 'http://localhost/' })
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true } })
const { default: AppRoutes } = await import('../src/app/AppRoutes.tsx')

async function open(t: import('node:test').TestContext, url: string) {
  window.history.replaceState(null, '', url)
  const host = document.createElement('div'); document.body.append(host); const root = createRoot(host)
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  await act(async () => root.render(createElement(BrowserRouter, null, createElement(AppRoutes))))
  return host
}
const navLink = (host: HTMLElement, label: string) => [...host.querySelectorAll<HTMLAnchorElement>('header nav a')].find(a => a.textContent === label)!

for (const [path, title, active] of [
  ['/calendar', /^Calendar ·/, 'Calendar'], ['/map', /^Map ·/, 'Map'], ['/method', /^Method ·/, 'Method'],
  ['/my-region', /^My region ·/, 'My region'], ['/about', /^About ·/, 'About'], ['/no-existe', /^Page not found ·/, null],
] as const) {
  test(`acceso directo ${path}: título en inglés, enlace activo y parámetros conservados`, async t => {
    const host = await open(t, `${path}?scope=month&periodYear=2024#detalle`)
    assert.match(document.title, title)
    assert.equal(host.querySelector('header nav [aria-current="page"]')?.textContent ?? null, active)
    assert.equal(window.location.search, '?scope=month&periodYear=2024')
    const map = navLink(host, 'Map')
    assert.equal(new URL(map.href).pathname, '/map'); assert.equal(new URL(map.href).hash, '#detalle')
    await act(async () => map.click())
    assert.equal(window.location.pathname, '/map')
    assert.equal(host.querySelector('header nav [aria-current="page"]')!.textContent, 'Map')
    await act(async () => { window.history.replaceState(null, '', '/method?scope=month'); window.dispatchEvent(new dom.window.PopStateEvent('popstate')) })
    assert.match(document.title, /^Method ·/)
  })
}

for (const [from, to] of [['/calendario', '/calendar'], ['/mapa', '/map'], ['/metodo', '/method'], ['/mi-region', '/my-region']] as const) {
  test(`la ruta antigua ${from} redirige a ${to} conservando consulta y hash`, async t => {
    await open(t, `${from}?data=local&mapRegion=AR-M&periodYear=2024#detalle`)
    assert.equal(window.location.pathname, to)
    assert.equal(window.location.search, '?data=local&mapRegion=AR-M&periodYear=2024')
    assert.equal(window.location.hash, '#detalle')
  })
}

test('la raíz con parámetros antiguos abre el Calendario', async t => {
  await open(t, '/?sensor=VIIRS&periodYear=2024#detalle')
  assert.equal(window.location.pathname, '/calendar')
  assert.equal(window.location.search, '?sensor=VIIRS&periodYear=2024')
})

test('el pie de página aparece en todas las páginas menos el Mapa', async t => {
  let host = await open(t, '/about')
  assert.match(host.querySelector('footer')!.textContent!, /LANCE FIRMS operated by NASA's Earth Science Data and Information System/)
  assert.match(host.querySelector('footer')!.textContent!, /Do not use for tactical decisions/)
  host = await open(t, '/map?data=pilot')
  assert.equal(host.querySelector('footer'), null)
})
