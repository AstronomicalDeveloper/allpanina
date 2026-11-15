import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, createElement } from 'react'
import TopBar from '../src/shell/TopBar'
import { guardarConjunto, borrarConjunto } from '../src/services/region/store'
import { dom, files, mockFiles, mount, navigate, choose } from './uiHarness'

const links = (host: HTMLElement) => [...host.querySelectorAll<HTMLAnchorElement>('header nav a')]

test('barra superior: inglés, seis destinos, URL y hash conservados, sin roles de pestaña', async t => {
  mockFiles(t)
  const { host } = await mount(t, '/calendar?scope=month&periodYear=2024#detalle', createElement(TopBar))
  assert.deepEqual(links(host).map(a => a.textContent), ['Home', 'Calendar', 'Map', 'Method', 'My region', 'About'])
  for (const link of links(host)) { assert.ok(link.href.includes('periodYear=2024')); assert.equal(new URL(link.href).hash, '#detalle') }
  assert.equal(host.querySelector('[role="tab"]'), null)
  assert.equal(host.querySelector('header nav [aria-current="page"]')!.textContent, 'Calendar')
  await act(async () => links(host).find(a => a.textContent === 'Method')!.click())
  assert.equal(window.location.pathname, '/method')
  assert.equal(host.querySelector('header nav [aria-current="page"]')!.textContent, 'Method')
  await navigate('/map?periodYear=2024'); assert.ok(host.querySelector('.topbar--map'))
  await navigate('/calendar'); assert.equal(host.querySelector('.topbar--map'), null)
  assert.equal(new URL(host.querySelector<HTMLAnchorElement>('a.brand')!.href).pathname, '/')
})

test('ámbito en la barra: Perú y 25 departamentos con nombres; viaja en la URL y conserva la página', async t => {
  mockFiles(t)
  const { host } = await mount(t, '/map?mapRegion=PE&periodYear=2024', createElement(TopBar), 'peru')
  await act(async () => { await new Promise(r => setTimeout(r, 20)) })
  const select = host.querySelector<HTMLSelectElement>('[aria-label="Scope"]')!
  assert.equal(select.options.length, 26); assert.equal(select.options[0].text, 'Peru'); assert.equal(select.value, 'PE')
  assert.ok([...select.options].every(o => !/^PE-/.test(o.text)), 'nombres, nunca códigos')
  await choose(host, '[aria-label="Scope"]', 'PE-25')
  assert.equal(window.location.pathname, '/map'); assert.equal(new URLSearchParams(window.location.search).get('mapRegion'), 'PE-25')
  assert.equal(new URLSearchParams(window.location.search).get('periodYear'), '2024')
  await navigate('/about?mapRegion=PE-25'); await choose(host, '[aria-label="Scope"]', 'PE-08')
  assert.equal(window.location.pathname, '/calendar', 'desde una página sin datos, el ámbito abre el Calendario')
})

test('ámbito: piloto, DEMO y Mi región (local) se muestran sin romper sus conjuntos', async t => {
  mockFiles(t)
  const { host } = await mount(t, '/calendar?data=pilot&mapRegion=PE-UCA', createElement(TopBar))
  await act(async () => { await new Promise(r => setTimeout(r, 20)) })
  const select = () => host.querySelector<HTMLSelectElement>('[aria-label="Scope"]')!
  assert.equal(select().value, 'PE-UCA'); assert.match(select().selectedOptions[0].text, /Ucayali pilot/)
  await navigate('/map?data=demo'); assert.match(select().selectedOptions[0].text, /Demo data/)
  await guardarConjunto({ archivos: {}, region_id: 'AR-M', nombre: 'Mendoza, Argentina', guardado: new Date().toISOString() })
  t.after(() => borrarConjunto())
  await navigate('/calendar?data=local&mapRegion=AR-M'); await act(async () => { await new Promise(r => setTimeout(r, 20)) })
  assert.match(select().selectedOptions[0].text, /My region · Mendoza, Argentina \(exploratory\)/)
  await choose(host, '[aria-label="Scope"]', 'PE')
  assert.equal(new URLSearchParams(window.location.search).get('data'), null, 'elegir Perú sale del conjunto local')
  assert.equal(new URLSearchParams(window.location.search).get('mapRegion'), 'PE')
})

test('ámbito: si falla la lista lo dice y permite reintentar', async t => {
  let fail = true
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(fail && url.endsWith('peru/method.json') ? '{}' : files[url] ?? '', { status: files[url] ? 200 : 404 }))
  const { host } = await mount(t, '/calendar', createElement(TopBar), 'peru')
  await act(async () => { await new Promise(r => setTimeout(r, 20)) })
  const retry = [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Retry')!
  assert.ok(retry); fail = false
  await act(async () => { retry.click(); await new Promise(r => setTimeout(r, 20)) })
  assert.equal(host.querySelector<HTMLSelectElement>('[aria-label="Scope"]')!.options.length, 26)
})

test('menú móvil: botón accesible, foco al primer enlace, Tab no escapa, Escape cierra y devuelve el foco', async t => {
  mockFiles(t)
  const { host } = await mount(t, '/calendar', createElement(TopBar))
  const button = host.querySelector<HTMLButtonElement>('[aria-controls="mobile-menu"]')!
  assert.equal(button.getAttribute('aria-expanded'), 'false'); assert.equal(button.getAttribute('aria-label'), 'Open menu')
  await act(async () => button.click())
  const dialog = host.querySelector<HTMLElement>('#mobile-menu')!
  assert.equal(dialog.getAttribute('role'), 'dialog'); assert.equal(dialog.getAttribute('aria-modal'), 'true')
  assert.equal(button.getAttribute('aria-expanded'), 'true')
  const items = [...dialog.querySelectorAll<HTMLAnchorElement>('a')]
  assert.equal(items.length, 6); assert.equal(document.activeElement, items[0])
  assert.equal(document.body.style.overflow, 'hidden')
  items.at(-1)!.focus()
  await act(async () => dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })))
  assert.equal(document.activeElement, items[0])
  await act(async () => dialog.dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })))
  assert.equal(host.querySelector('#mobile-menu'), null); assert.equal(document.activeElement, button)
  assert.equal(document.body.style.overflow, '')
  await act(async () => button.click())
  await act(async () => host.querySelector<HTMLAnchorElement>('#mobile-menu a[href^="/about"]')!.click())
  assert.equal(window.location.pathname, '/about'); assert.equal(host.querySelector('#mobile-menu'), null)
})
