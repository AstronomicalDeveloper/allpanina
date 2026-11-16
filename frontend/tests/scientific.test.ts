import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import App from '../src/app/AppRoutes.tsx'
import { BrowserRouter } from 'react-router-dom'
import MethodPage from '../src/pages/method/MethodPage.tsx'
import { buildCalendar, filterCalendarRecords } from '../src/services/data/calendar.ts'
import { serializeMonthlySeries, calendarCsvFilename } from '../src/services/data/csvExport.ts'
import { cellsFile, filterCells } from '../src/services/data/map.ts'
import { buildMapYear } from '../src/services/data/mapExploration.ts'
import { loadMonthlySeries, loadCalibratedSeries, loadCells, loadManifest, loadMethod, loadValidation } from '../src/services/data/loaders.ts'

const file = (name: string) => readFile(new URL(`../public/data/${name}`, import.meta.url), 'utf8')
const dom = new JSDOM('<!doctype html><body></body>', { url: 'http://localhost/' })
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true },
})

test('entrega científica: seis formatos, 18 hashes, períodos y observaciones geográficas sin B1', async t => {
  t.mock.method(globalThis, 'fetch', async (url: string) => new Response(await file((url.includes('/peru/')?'peru/':'')+url.split('/').at(-1)!)))
  const manifest = await loadManifest('/data/manifest.json')
  assert.equal(manifest.region_id, 'PE-UCA')
  assert.deepEqual(manifest.periodo, { desde: '2013-01', hasta: '2026-07' })
  assert.equal(manifest.files.length, 18)
  for (const name of manifest.files) {
    const bytes = await readFile(new URL(`../public/data/${name}`, import.meta.url))
    assert.equal(`sha256:${createHash('sha256').update(bytes).digest('hex')}`, manifest.hash[name], name)
  }
  const monthly = await loadMonthlySeries('/data/monthly_series.csv')
  const calibrated = await loadCalibratedSeries('/data/calibrated_series.csv')
  const method = await loadMethod('/data/method.json')
  const validation = await loadValidation('/data/validation.json')
  assert.equal(monthly.length, 326)
  assert.equal(calibrated.length, 326)
  for (const sensor of ['MODIS', 'VIIRS'] as const) {
    const rows = filterCalendarRecords(monthly, 'PE-UCA', sensor)
    assert.equal(rows.length, 163)
    assert.deepEqual([rows[0].year, rows[0].month, rows.at(-1)!.year, rows.at(-1)!.month], [2013, 1, 2026, 7])
    assert.equal(rows.find(r => r.year === 2024 && r.month === 9)?.cell_days, sensor === 'MODIS' ? 2323 : 5581)
    assert.equal(buildCalendar(monthly, 'PE-UCA', sensor).at(-1)!.cells[7].status, 'absent')
    // Download uses exactly the loaded records, with original precision, dates and zeros.
    const csv = serializeMonthlySeries(rows)
    t.mock.method(globalThis, 'fetch', async () => new Response(csv))
    assert.deepEqual(await loadMonthlySeries('/download.csv'), rows)
    t.mock.restoreAll()
    t.mock.method(globalThis, 'fetch', async (url: string) => new Response(await file((url.includes('/peru/')?'peru/':'')+url.split('/').at(-1)!)))
  }
  assert.ok(monthly.some(r => r.cell_days === 0 && r.status === 'ok'))
  assert.equal(calendarCsvFilename('PE-UCA', 'MODIS'), 'allpanina_PE-UCA_MODIS.csv')
  assert.ok(Math.abs(method.kappa! - 0.2936037) < 1e-7)
  assert.equal(method.resultados?.valid?.B1.wape, 0.178)
  assert.ok(Math.abs(validation.methods.B1!.metrics.mae! - 29.7) < 0.1)
  assert.ok(Math.abs(validation.methods.B1!.metrics.wape! - 0.308) < 0.001)
  assert.equal(validation.methods.B1!.split, 'test')
  for (let year = 2013; year <= 2026; year++) {
    const name = cellsFile(manifest, { region: 'PE-UCA', year })!
    const geo = await loadCells(`/data/${name}`)
    assert.ok(geo.features.length > 0)
    const annual = buildMapYear(geo, { region: 'PE-UCA', year }, monthly)
    for (const sensor of ['MODIS', 'VIIRS'] as const) {
      assert.equal(annual.annual[sensor].features.reduce((sum, f) => sum + f.properties.cell_days, 0), monthly.filter(r => r.year === year && r.sensor_group === sensor).reduce((sum, r) => sum + (r.cell_days ?? 0), 0))
      assert.equal(annual.coverage[sensor].filter(m => m.status === 'ok').length, year === 2026 ? 7 : 12)
      if (year === 2026) assert.ok(annual.coverage[sensor].slice(7).every(m => m.status === 'unpublished'))
    }
    for (const sensor of ['MODIS', 'VIIRS'] as const) for (let month = 1; month <= 12; month++) {
      const observed = filterCells(geo, { region: 'PE-UCA', year, month, sensor })
      const record = monthly.find(r => r.year === year && r.month === month && r.sensor_group === sensor)
      assert.equal(observed.features.reduce((sum, f) => sum + f.properties.cell_days, 0), record?.cell_days ?? 0, `${year}-${month} ${sensor}`)
      for (const { properties } of observed.features) assert.equal('B1' in properties, false)
    }
  }
})

test('UI piloto explícito: escala regional, sensor, detalle B1, CSV y métricas separadas sin DEMO', async t => {
  window.history.replaceState(null, '', '/?data=pilot&periodYear=2024&periodMonth=9')
  t.after(() => window.history.replaceState(null, '', '/?data=pilot'))
  const requested: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => { requested.push(url); return new Response(await file((url.includes('/peru/')?'peru/':'')+url.split('/').at(-1)!)) })
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  await act(async () => root.render(createElement(BrowserRouter, null, createElement(App))))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  assert.ok(requested.includes('/data/monthly_series.csv'))
  assert.ok(requested.includes('/data/calibrated_series.csv'))
  assert.ok(requested.every(url => !url.includes('/demo/')))
  assert.doesNotMatch(host.textContent!, /DEMO/)
  const september = () => host.querySelector<HTMLButtonElement>('button[aria-label^="September 2024,"]')!
  assert.equal(september().textContent, '2,323')
  assert.equal(host.querySelectorAll('.calendar-matrix tbody button').length, 14 * 12)
  await act(async () => september().click())
  assert.match(host.querySelector('#calendar-detail')!.textContent!, /B1: 1,638/)
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>('[aria-label="Series"] button')].find(b => b.textContent === 'VIIRS')!.click())
  assert.equal(september().textContent, '5,581')
  // El color es la clase por cuantiles de PE-UCA / VIIRS: solo presentación; el valor y el CSV no cambian.
  assert.ok(september().style.backgroundColor)
  assert.ok(host.querySelectorAll('.calendar-legend figure li').length <= 9)
  let downloaded: Blob | undefined
  t.mock.method(URL, 'createObjectURL', (blob: Blob) => { downloaded = blob; return 'blob:real' })
  t.mock.method(URL, 'revokeObjectURL', () => {})
  t.mock.method(dom.window.HTMLAnchorElement.prototype, 'click', function (this: HTMLAnchorElement) { assert.equal(this.download, 'allpanina_PE-UCA_VIIRS.csv') })
  await act(async () => [...host.querySelectorAll<HTMLButtonElement>('button')].find(b => b.textContent === 'Download CSV')!.click())
  assert.match(await downloaded!.text(), /PE-UCA,2024,9,VIIRS,5581,ok,/)
  await act(async () => root.render(createElement(BrowserRouter, null, createElement(MethodPage))))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'30.8%')
  await act(async()=>[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Validation')!.click())
  assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'17.8%')
  assert.equal(host.querySelector('.method-formula strong')!.getAttribute('title'),'0.2936037257560573')
  assert.doesNotMatch(host.textContent!, /DEMO/)
  assert.equal(host.querySelector('[role="alert"]'), null)
})

test('producción falla explícitamente sin fallback; DEMO requiere selección explícita', async t => {
  const urls: string[] = []
  t.mock.method(globalThis, 'fetch', async (url: string) => { urls.push(url); return new Response('inaccesible', { status: 404 }) })
  const host = document.createElement('div'); document.body.append(host)
  const root = createRoot(host)
  t.after(async () => { await act(async () => root.unmount()); host.remove(); window.history.replaceState(null, '', '/?data=pilot') })
  await act(async () => root.render(createElement(BrowserRouter, null, createElement(App))))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /HTTP 404/)
  assert.ok(urls.every(url => url.startsWith('/data/') && !url.includes('/demo/')))
  assert.doesNotMatch(host.textContent!, /DEMO/)
  await act(async () => root.render(null))
  window.history.replaceState(null, '', '/?data=demo')
  t.mock.restoreAll()
  t.mock.method(globalThis, 'fetch', async (url: string) => { urls.push(url); return new Response(await file(`demo/${url.split('/').at(-1)!}`)) })
  await act(async () => root.render(createElement(BrowserRouter, null, createElement(App))))
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 80)) })
  assert.match(host.textContent!, /DEMO DATA/)
  assert.ok(urls.includes('/data/demo/monthly_series.csv'))
  assert.ok(host.querySelector('.calendar-matrix'))
})
