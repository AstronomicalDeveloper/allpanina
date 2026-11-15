import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { act, createElement } from 'react'
import { dom, files, mockFiles, mount, choose, navigate, fakeRuntime, click } from './uiHarness'
import { guardarConjunto, borrarConjunto } from '../src/services/region/store'
import MapPage from '../src/pages/map/MapPage'
import EvaluationSection from '../src/pages/method/sections/EvaluationSection'
import type { ValidationResult } from '../src/types/data'

const mundo = (archivo: string) => readFile(new URL(`../public/cartography/world/${archivo}`, import.meta.url), 'utf8')
const indice = JSON.parse(await mundo('index.json')) as { paises: { iso3: string; archivo: string; regiones: number }[] }
async function cartografia(...iso3: string[]) {
  const out: Record<string, string> = { '/cartography/world/index.json': await mundo('index.json') }
  for (const iso of iso3) out[`/cartography/world/${iso}.geojson`] = await mundo(`${iso}.geojson`)
  return out
}
const espera = () => act(async () => { await new Promise(r => setTimeout(r, 30)) })
async function selector(host: HTMLElement) {
  await espera()
  const [pais, region] = host.querySelectorAll('select')
  pais.id = 'test-pais'; region.id = 'test-region'
  return { pais, region }
}
async function subir(input: HTMLInputElement, ...lista: File[]) {
  Object.defineProperty(input, 'files', { value: lista, configurable: true })
  await act(async () => { input.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
  await espera()
}
const csv = (sensor: 'MODIS' | 'VIIRS') => new File([`latitude,longitude,acq_date,acq_time,satellite,instrument,confidence,version,type\n-8.4,-74.5,2020-09-10,1500,${sensor === 'MODIS' ? 'Aqua' : 'N'},${sensor},80,2,0\n`], `${sensor}.csv`, { type: 'text/csv' })
const procesar = (host: HTMLElement) => [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => /Procesar/.test(b.textContent ?? ''))!

test('catálogo mundial: todos los países publicados y sus regiones (Perú, Argentina, Brasil, EE. UU.)', async t => {
  mockFiles(t, await cartografia('PER', 'ARG', 'BRA', 'USA'))
  const { host } = await mount(t, '/mi-region')
  const { pais, region } = await selector(host)
  assert.equal(pais.options.length, indice.paises.length + 1)
  assert.ok(indice.paises.length > 100, 'el índice publicado trae el catálogo mundial')
  const etiquetas = [...pais.options].map(o => o.textContent)
  for (const nombre of ['Perú', 'Argentina', 'Brasil', 'Estados Unidos']) assert.ok(etiquetas.includes(nombre), nombre)
  for (const iso of ['PER', 'ARG', 'BRA', 'USA']) {
    await choose(host, '#test-pais', iso); await espera()
    const esperado = indice.paises.find(p => p.iso3 === iso)!.regiones
    assert.equal(region.options.length, esperado + 1, iso)
    assert.equal(region.value, '', `${iso}: al cambiar de país se limpia la región`)
  }
  await choose(host, '#test-pais', 'ARG'); await espera()
  const mendoza = [...region.options].find(o => o.textContent === 'Mendoza')!
  await choose(host, '#test-region', mendoza.value)
  assert.equal(host.querySelector<HTMLInputElement>('#zona')!.value, 'America/Argentina/Mendoza')
  assert.match(host.querySelector('.region-facts')!.textContent!, /AR-M/)
})

test('cartografía faltante o devuelta como HTML: error claro, reintento y alternativa de polígono', async t => {
  const base = await cartografia('PER')
  mockFiles(t, { ...base, '/cartography/world/BRA.geojson': '<!doctype html><html><body>SPA</body></html>' })
  const { host } = await mount(t, '/mi-region')
  await selector(host)
  await choose(host, '#test-pais', 'ARG'); await espera()
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /no se encontró en este servidor/)
  assert.ok([...host.querySelectorAll('button')].some(b => b.textContent === 'Reintentar'))
  await choose(host, '#test-pais', 'BRA'); await espera()
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /Brasil no se encontró/)
  await choose(host, '#test-pais', 'PER'); await espera()
  assert.equal(host.querySelector('[role="alert"]'), null)
  assert.equal(host.querySelectorAll('select')[1].options.length, 26)
})

test('región con contorno dañado en la fuente: aviso claro y el paso de datos sigue bloqueado', async t => {
  mockFiles(t, await cartografia('NAM'))
  const { host } = await mount(t, '/mi-region')
  const { region } = await selector(host)
  await choose(host, '#test-pais', 'NAM'); await espera()
  await choose(host, '#test-region', 'NA-CNN')
  assert.equal(region.value, 'NA-CNN')
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /contorno de esta región/)
  assert.equal(host.querySelector<HTMLFieldSetElement>('.region-fieldset')!.disabled, true)
})

test('sin índice publicado: lo dice y ofrece el polígono propio', async t => {
  mockFiles(t, {})
  const { host } = await mount(t, '/mi-region')
  await espera()
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /lista de países/)
})

test('pasos bloqueados de verdad: sin región no se aceptan archivos (input ni arrastrar) ni se procesa', async t => {
  mockFiles(t, await cartografia('PER'))
  const { host } = await mount(t, '/mi-region')
  await selector(host)
  const fieldset = host.querySelector<HTMLFieldSetElement>('.region-fieldset')!
  assert.equal(fieldset.disabled, true)
  assert.match(host.textContent!, /Primero elige un país y una región/)
  const input = fieldset.querySelector<HTMLInputElement>('input[type="file"]')!
  assert.ok(input.matches(':disabled'))
  await subir(input, csv('MODIS'), csv('VIIRS'))
  const drop = new dom.window.Event('drop', { bubbles: true, cancelable: true })
  Object.defineProperty(drop, 'dataTransfer', { value: { files: [csv('MODIS')], dropEffect: '' } })
  await act(async () => { host.querySelector('.region-drop')!.dispatchEvent(drop) })
  await espera()
  assert.equal(host.querySelectorAll('.region-files li').length, 0, 'no se agregó ningún archivo')
  assert.equal(procesar(host).disabled, true)
  assert.match(host.textContent!, /Completa el paso 1/)
})

test('desbloqueo inmediato: región -> archivos (MODIS y VIIRS) -> procesar', async t => {
  mockFiles(t, await cartografia('PER'))
  const { host } = await mount(t, '/mi-region')
  const { region } = await selector(host)
  await choose(host, '#test-pais', 'PER'); await espera()
  await choose(host, '#test-region', [...region.options].find(o => o.textContent === 'Ucayali')!.value)
  const fieldset = host.querySelector<HTMLFieldSetElement>('.region-fieldset')!
  assert.equal(fieldset.disabled, false)
  assert.match(host.textContent!, /Siguiente: trae los datos/)
  const input = fieldset.querySelector<HTMLInputElement>('input[type="file"]')!
  await subir(input, csv('MODIS'))
  assert.equal(host.querySelectorAll('.region-files li').length, 1)
  assert.match(host.textContent!, /falta el archivo de VIIRS/)
  assert.equal(procesar(host).disabled, true)
  await subir(input, csv('VIIRS'))
  assert.equal(procesar(host).disabled, false)
  assert.match(host.textContent!, /Siguiente: procesa los datos/)
})

test('polígono propio desbloquea el paso de datos', async t => {
  mockFiles(t, await cartografia('PER'))
  const { host } = await mount(t, '/mi-region')
  await selector(host)
  await click(host, '¿Tu región no está? Usa tu propio polígono (GeoJSON)')
  const geo = { type: 'Polygon', coordinates: [[[-69.5, -33.5], [-68, -33.5], [-68, -32], [-69.5, -32], [-69.5, -33.5]]] }
  await subir(host.querySelector<HTMLInputElement>('input[accept=".geojson,.json,application/geo+json"]')!, new File([JSON.stringify(geo)], 'mendoza.geojson'))
  await subir(host.querySelector<HTMLInputElement>('input[accept=".geojson,.json,application/geo+json"]')!, new File(['{"type":"Polygon","coordinates":[[[0,0],[1,1],[0,0]]]}'], 'malo.geojson'))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /No se pudo usar malo.geojson/)
  assert.equal(host.querySelector<HTMLFieldSetElement>('.region-fieldset')!.disabled, true, 'un polígono inválido no desbloquea')
  await subir(host.querySelector<HTMLInputElement>('input[accept=".geojson,.json,application/geo+json"]')!, new File([JSON.stringify(geo)], 'mendoza.geojson'))
  assert.match(host.querySelector('.region-facts')!.textContent!, /MENDOZA/)
  assert.equal(host.querySelector<HTMLFieldSetElement>('.region-fieldset')!.disabled, false)
})

test('conjunto local alimenta Calendario, análisis histórico, Mapa y Método sin fetch científico', async t => {
  const archivos = Object.fromEntries(Object.entries(files).filter(([k]) => k.startsWith('/data/') && !k.slice(6).includes('/')).map(([k, v]) => [k.slice(6), v]))
  const aviso = await guardarConjunto({ archivos, region_id: 'PE-UCA', nombre: 'Ucayali local', guardado: new Date().toISOString() })
  assert.match(aviso!, /memoria/)
  t.after(() => borrarConjunto())
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('No se deben pedir datos remotos') })
  const { host } = await mount(t, '/calendario?data=local&mapRegion=PE-UCA&periodYear=2024&periodMonth=9')
  assert.ok(host.querySelector('.calendar-history'))
  assert.match(host.textContent!, /Ucayali local/)
  await navigate('/metodo?data=local&mapRegion=PE-UCA')
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, '30.8%')
  const map = await mount(t, '/mapa?data=local&mapRegion=PE-UCA&periodYear=2024', createElement(MapPage, { runtimeLoader: fakeRuntime().loader }))
  assert.ok(!map.host.querySelector('[role="alert"]'))
  assert.match(map.host.textContent!, /2024/)
})

test('Método oculta métricas y residuos de una evaluación no reportable', async t => {
  const validation = { ...JSON.parse(files['/data/validation.json']), reportable: false } as ValidationResult
  const { host } = await mount(t, '/metodo', createElement(EvaluationSection, { method: null, validation, demo: false }))
  assert.match(host.textContent!, /no es reportable/)
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent, 'No disponible')
  assert.equal(host.querySelector('tbody')!.children.length, 0)
})
