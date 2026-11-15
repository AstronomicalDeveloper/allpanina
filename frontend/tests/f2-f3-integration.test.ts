import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createElement, act } from 'react'
import { test } from 'node:test'
import { b1TestError } from '../src/features/calendar/calendarData'
import { validateMethodDocument } from '../src/services/data/peruValidators'
import { parseMonthlySeries } from '../src/services/data/validators'
import type { NationalMethod } from '../src/types/data'
import MapPage from '../src/pages/map/MapPage'
import { choose, click, files, mockFiles, mount, fakeRuntime } from './uiHarness'

const method = validateMethodDocument(JSON.parse(files['/data/peru/method.json'])) as NationalMethod
const monthly = parseMonthlySeries(files['/data/peru/monthly_series.csv'])

test('F3 conserva WAPE, período, meses y no reportables de todos los ámbitos publicados', () => {
  for (const { region_id } of method.regions) {
    const actual = b1TestError(method, region_id)
    if (region_id in method.resultados.test_no_reportables) {
      assert.deepEqual(actual, { reportable: false }, region_id)
    } else {
      const published = method.resultados.test[region_id]
      assert.ok(actual?.reportable, region_id)
      assert.equal(actual.wape, published.B1.wape, region_id)
      assert.equal(actual.period, published.periodo, region_id)
      assert.equal(actual.months, published.n_meses, region_id)
    }
  }
  const national = b1TestError(method, 'PE')
  assert.ok(national?.reportable)
  assert.equal(national.clean?.wape, method.resultados.test[method.resultados.resultado_limpio].B1.wape)
  const pilot = validateMethodDocument(JSON.parse(files['/data/method.json']))
  assert.equal(b1TestError(pilot, 'PE-UCA')?.reportable, true)
  assert.equal(b1TestError(method, 'UNKNOWN'), null)
})

test('Home → Calendar → Map conserva departamento, mes y sensores independientes, con F5a', async t => {
  const mapFile = '/data/peru/cells_PE_2024.geojson'
  mockFiles(t, { [mapFile]: await readFile(new URL('../public/data/peru/cells_PE_2024.geojson', import.meta.url), 'utf8') })
  const { host } = await mount(t, '/', undefined, 'peru')
  await choose(host, '#landing-region', 'PE-08')
  const homeCell = host.querySelector<HTMLAnchorElement>('a[aria-label^="September 2024:"]')!
  assert.ok(homeCell)
  await act(async () => homeCell.click())
  assert.equal(window.location.pathname, '/calendar')
  assert.equal(host.querySelector('#calendar-detail-title')!.textContent, 'September 2024')
  await click(host, 'Estimate (B1)')
  assert.ok(host.querySelector<HTMLAnchorElement>('.calendar-technical a')!.href.endsWith('/data/peru/calibrated_series.csv'))
  const estimate = host.querySelector('.calendar-estimates')!.textContent!
  const percent = (method.resultados.test['PE-08'].B1.wape! * 100).toFixed(1)
  assert.ok(estimate.includes(`Test-period error (WAPE): ${percent}%`))
  assert.match(estimate, /Jan 2025 – Jul 2026.*19 months.*not the error of this month.*nor a confidence level/)
  const target = new URL(host.querySelector<HTMLAnchorElement>('.calendar-map-action')!.href)
  assert.equal(target.pathname, '/map')
  const params = target.searchParams
  assert.deepEqual([params.get('mapRegion'), params.get('periodYear'), params.get('periodMonth'), params.get('calendarSeries'), params.get('mapSensor'), params.get('sensor')], ['PE-08', '2024', '9', 'B1', 'MODIS', 'MODIS'])
  const runtime = fakeRuntime()
  const map = await mount(t, target.pathname + target.search, createElement(MapPage, { runtimeLoader: runtime.loader }), 'peru')
  const published = monthly.find(r => r.region_id === 'PE-08' && r.year === 2024 && r.month === 9 && r.sensor_group === 'MODIS')!
  assert.equal(map.host.querySelector('.map-context strong')!.textContent, 'Cusco')
  assert.equal(map.host.querySelector('.map-observed-value')!.textContent, published.cell_days!.toLocaleString('en-US'))
  assert.match(map.host.querySelector('.map-context')!.textContent!, /September 2024.*MODIS/)
  assert.equal(runtime.maps.length, 1)
})
