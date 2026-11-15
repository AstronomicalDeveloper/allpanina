import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { createElement } from 'react'
import { files, mockFiles, mount, choose, navigate, fakeRuntime, click } from './uiHarness'
import { guardarConjunto, borrarConjunto } from '../src/services/region/store'
import MapPage from '../src/pages/map/MapPage'
import EvaluationSection from '../src/pages/method/sections/EvaluationSection'
import type { ValidationResult } from '../src/types/data'

test('País → departamento carga cartografía real y permite elegir polígono propio', async t => {
  const index = await readFile(new URL('../public/cartography/world/index.json', import.meta.url), 'utf8')
  const peru = await readFile(new URL('../public/cartography/world/PER.geojson', import.meta.url), 'utf8')
  mockFiles(t, { '/cartography/world/index.json': index, '/cartography/world/PER.geojson': peru })
  const { host } = await mount(t, '/mi-region')
  const selects = host.querySelectorAll('select')
  assert.equal(selects[0].options.length, 2)
  selects[0].id = 'test-pais'; selects[1].id = 'test-region'
  await choose(host, '#test-pais', 'PER')
  assert.equal(selects[1].options.length, 26)
  await choose(host, '#test-region', selects[1].options[1].value)
  assert.ok(host.querySelector('.region-facts'))
  assert.ok(host.querySelector<HTMLInputElement>('#zona')!.value)
  await click(host, '¿Tu región no está? Usa tu propio polígono (GeoJSON)')
  assert.ok(host.querySelector('input[accept=".geojson,.json,application/geo+json"]'))
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
