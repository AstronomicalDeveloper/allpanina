import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { JSDOM } from 'jsdom'
import HistoricalCalendar from '../src/components/calendar/HistoricalCalendar.tsx'
import CalendarPage from '../src/components/calendar/CalendarPage.tsx'
import { MONTHS } from '../src/services/data/calendar.ts'
import { parseMonthlySeries } from '../src/services/data/validators.ts'
import { downloadCsv } from '../src/services/data/csvExport.ts'

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' })
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true },
})
const csv = await readFile(new URL('../public/data/demo/monthly_series.csv', import.meta.url), 'utf8')
const records = parseMonthlySeries(csv)

async function mount(t: TestContext, element: ReturnType<typeof createElement>) {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  await act(async () => root.render(element))
  t.after(async () => { await act(async () => root.unmount()); host.remove() })
  return host
}
function cell(host: HTMLElement, name: string): HTMLButtonElement {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.getAttribute('aria-label') === name)
  assert.ok(button, `Falta la celda ${name}`)
  return button
}
async function select(host: HTMLElement, id: string, value: string) {
  const control = host.querySelector<HTMLSelectElement>(`#${id}`)
  assert.ok(control)
  await act(async () => { control.value = value; control.dispatchEvent(new dom.window.Event('change', { bubbles: true })) })
}
test('renderiza años, doce meses y etiquetas distintas para cero, insuficiente y ausente', async t => {
  const host = await mount(t, createElement(HistoricalCalendar, { demo: true, records: [...records, { ...records[0], year: 2023 }] }))
  assert.deepEqual([...host.querySelectorAll('tbody th')].map(th => th.textContent), ['2023', '2024'])
  assert.deepEqual([...host.querySelectorAll('thead th')].slice(1).map(th => th.textContent), [...MONTHS])
  assert.equal(host.querySelectorAll('tbody button').length, 24)
  assert.equal(cell(host, 'Septiembre 2024, MODIS, 0 · válido').textContent, '0 · válido')
  assert.equal(cell(host, 'Octubre 2024, MODIS, Sin datos').textContent, 'Sin datos')
  assert.equal(cell(host, 'Enero 2024, MODIS, Ausente').textContent, 'Ausente')
})
test('seleccionar celda muestra contrato completo y cambiar sensor actualiza valores y borra detalle anterior', async t => {
  const host = await mount(t, createElement(HistoricalCalendar, { demo: true, records }))
  const august = cell(host, 'Agosto 2024, MODIS, 3')
  await act(async () => august.click())
  assert.equal(august.getAttribute('aria-pressed'), 'true')
  const detail = host.querySelector('#calendar-detail')!
  const fields = Object.fromEntries([...detail.querySelectorAll('dl > div')].map(item => [item.querySelector('dt')!.textContent, item.querySelector('dd')!.textContent]))
  assert.deepEqual(fields, { Región: 'PE-DEMO', Año: '2024', Mes: 'Agosto (8)', Sensor: 'MODIS', 'cell_days (días-celda)': '3', status: 'ok', source_version: 'DEMO-MODIS-v0', 'updated_at (fecha del archivo)': '2026-11-14' })
  await select(host, 'calendar-sensor', 'VIIRS')
  assert.match(detail.textContent!, /Selecciona un mes/)
  assert.equal(host.querySelectorAll('[aria-pressed="true"]').length, 0)
  await act(async () => cell(host, 'Agosto 2024, VIIRS, 5').click())
  assert.match(detail.textContent!, /DEMO-VIIRS-v0/)
  assert.match(detail.textContent!, /5/)
  assert.ok(cell(host, 'Octubre 2024, VIIRS, Sin datos'))
})
test('detalle mantiene cero y null distintos; ausencia de fila no fabrica status', async t => {
  const host = await mount(t, createElement(HistoricalCalendar, { demo: true, records }))
  await act(async () => cell(host, 'Septiembre 2024, MODIS, 0 · válido').click())
  assert.deepEqual([...host.querySelectorAll('#calendar-detail dd')].slice(4, 7).map(dd => dd.textContent), ['0', 'ok', 'DEMO-MODIS-v0'])
  await act(async () => cell(host, 'Octubre 2024, MODIS, Sin datos').click())
  assert.deepEqual([...host.querySelectorAll('#calendar-detail dd')].slice(4, 7).map(dd => dd.textContent), ['Sin dato', 'missing', 'DEMO-MODIS-v0'])
  await act(async () => cell(host, 'Enero 2024, MODIS, Ausente').click())
  assert.match(host.querySelector('#calendar-detail')!.textContent!, /No disponible: fila ausente/)
})
test('selector de región evita mezclar registros de regiones diferentes', async t => {
  const host = await mount(t, createElement(HistoricalCalendar, { demo: true, records: [...records, { ...records[0], region_id: 'ZZ-OTRA', cell_days: 15 }] }))
  await act(async () => cell(host, 'Agosto 2024, MODIS, 3').click())
  await select(host, 'calendar-region', 'ZZ-OTRA')
  assert.ok(cell(host, 'Agosto 2024, MODIS, 15'))
  assert.match(host.querySelector('#calendar-detail')!.textContent!, /Selecciona un mes/)
})
test('sin datos y sensor sin registros muestran estado vacío explícito', async t => {
  const empty = await mount(t, createElement(HistoricalCalendar, { demo: true, records: [] }))
  assert.match(empty.querySelector('[role="status"]')!.textContent!, /No hay datos disponibles/)
  assert.equal(empty.querySelector('table'), null)
  const host = await mount(t, createElement(HistoricalCalendar, { demo: true, records: [records[0]] }))
  await select(host, 'calendar-sensor', 'VIIRS')
  assert.match(host.querySelector('[role="status"]')!.textContent!, /No hay registros para VIIRS/)
  assert.equal(host.querySelectorAll('tbody button.calendar-cell--absent').length, 12)
})
test('página carga CSV por loader existente y muestra loading antes de la tabla', async t => {
  let resolve!: (response: Response) => void
  t.mock.method(globalThis, 'fetch', (url: string) => url.endsWith('calibrated_series.csv') ? Promise.resolve(new Response('region_id,year,month,method,value,split,status,residual')) : new Promise<Response>(done => { resolve = done }))
  const host = await mount(t, createElement(CalendarPage, { dataUrl: '/data/demo/monthly_series.csv' }))
  assert.match(host.querySelector('[role="status"]')!.textContent!, /Cargando/)
  assert.match(host.textContent!, /DATOS DEMO — NO SON OBSERVACIONES REALES/)
  await act(async () => resolve(new Response(csv)))
  assert.ok(host.querySelector('table'))
  assert.ok(cell(host, 'Agosto 2024, MODIS, 3'))
})
test('HTTP y CSV incorrectos muestran error y reintentar permite recuperación', async t => {
  let response = new Response('no encontrado', { status: 404 })
  t.mock.method(globalThis, 'fetch', async (url: string) => url.endsWith('calibrated_series.csv') ? new Response('region_id,year,month,method,value,split,status,residual') : response.clone())
  const host = await mount(t, createElement(CalendarPage, { dataUrl: '/monthly.csv' }))
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /HTTP 404/)
  response = new Response('mal,formado\n1,2')
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /columna obligatoria/)
  response = new Response(csv)
  await act(async () => host.querySelector<HTMLButtonElement>('button')!.click())
  assert.ok(host.querySelector('table'))
  assert.equal(host.querySelector('[role="alert"]'), null)
})
test('CSV válido sin filas muestra empty state después de cargar', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(csv.split(/\r?\n/)[0]))
  const host = await mount(t, createElement(CalendarPage, { dataUrl: '/empty.csv' }))
  assert.match(host.querySelector('[role="status"]')!.textContent!, /No hay datos disponibles/)
})

function exportButton(host: HTMLElement): HTMLButtonElement {
  const button = [...host.querySelectorAll<HTMLButtonElement>('button')].find(button => button.textContent === 'Descargar CSV')
  assert.ok(button)
  return button
}

function captureDownloads(t: TestContext) {
  const blobs: Blob[] = []
  const files: { name: string; url: string }[] = []
  t.mock.method(URL, 'createObjectURL', (blob: Blob) => { blobs.push(blob); return 'blob:calendar-export' })
  const revoke = t.mock.method(URL, 'revokeObjectURL', () => {})
  t.mock.method(dom.window.HTMLAnchorElement.prototype, 'click', function (this: HTMLAnchorElement) {
    files.push({ name: this.download, url: this.href })
  })
  return { blobs, files, revoke }
}

test('Descargar CSV usa registros ya cargados, respeta sensor y libera enlace/URL temporal', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async (url: string) => new Response(url.endsWith('calibrated_series.csv') ? 'region_id,year,month,method,value,split,status,residual' : csv))
  const host = await mount(t, createElement(CalendarPage, { dataUrl: '/data/demo/monthly_series.csv' }))
  const downloads = captureDownloads(t)
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => exportButton(host).click())
  assert.equal(downloads.files[0].name, 'allpanina_PE-DEMO_MODIS_demo.csv')
  assert.equal(downloads.files[0].url, 'blob:calendar-export')
  assert.equal(downloads.blobs[0].type, 'text/csv;charset=utf-8')
  const bytes = new Uint8Array(await downloads.blobs[0].arrayBuffer())
  assert.deepEqual([...bytes.slice(0, 3)], [0xef, 0xbb, 0xbf])
  assert.deepEqual(parseMonthlySeries(await downloads.blobs[0].text()), records.filter(row => row.sensor_group === 'MODIS'))
  assert.equal(document.querySelector('a[download]'), null)
  assert.equal(downloads.revoke.mock.callCount(), 0)
  t.mock.timers.tick(1000)
  assert.deepEqual(downloads.revoke.mock.calls[0].arguments, ['blob:calendar-export'])
  await select(host, 'calendar-sensor', 'VIIRS')
  await act(async () => exportButton(host).click())
  assert.equal(downloads.files[1].name, 'allpanina_PE-DEMO_VIIRS_demo.csv')
  assert.deepEqual(parseMonthlySeries(await downloads.blobs[1].text()), records.filter(row => row.sensor_group === 'VIIRS'))
  assert.equal(fetch.mock.callCount(), 2)
  assert.match(host.textContent!, /DATOS DEMO — NO SON OBSERVACIONES REALES/)
  t.mock.timers.tick(1000)
})
test('exportación respeta región seleccionada y no considera el mes de detalle como filtro', async t => {
  const other = { ...records[0], region_id: 'ZZ-OTRA', cell_days: 15 }
  const host = await mount(t, createElement(HistoricalCalendar, { demo: true, records: [...records, other] }))
  const downloads = captureDownloads(t)
  t.mock.timers.enable({ apis: ['setTimeout'] })
  await act(async () => cell(host, 'Enero 2024, MODIS, Ausente').click())
  await act(async () => exportButton(host).click())
  assert.equal(parseMonthlySeries(await downloads.blobs[0].text()).length, 3)
  await select(host, 'calendar-region', 'ZZ-OTRA')
  await act(async () => exportButton(host).click())
  assert.equal(downloads.files[1].name, 'allpanina_ZZ-OTRA_MODIS_demo.csv')
  assert.deepEqual(parseMonthlySeries(await downloads.blobs[1].text()), [other])
  t.mock.timers.tick(1000)
})
test('botón de exportar queda deshabilitado con serie vacía o sensor sin filas', async t => {
  const empty = await mount(t, createElement(HistoricalCalendar, { demo: true, records: [] }))
  assert.equal(exportButton(empty).disabled, true)
  const host = await mount(t, createElement(HistoricalCalendar, { demo: true, records: [records[0]] }))
  assert.equal(exportButton(host).disabled, false)
  await select(host, 'calendar-sensor', 'VIIRS')
  assert.equal(exportButton(host).disabled, true)
})
test('fallo de descarga muestra error controlado que se limpia al cambiar filtro', async t => {
  const host = await mount(t, createElement(HistoricalCalendar, { demo: true, records }))
  t.mock.method(URL, 'createObjectURL', () => { throw new Error('Blob no disponible') })
  await act(async () => exportButton(host).click())
  assert.match(host.querySelector('[role="alert"]')!.textContent!, /No se pudo generar o iniciar la descarga CSV.*Blob no disponible/)
  await select(host, 'calendar-sensor', 'VIIRS')
  assert.equal(host.querySelector('[role="alert"]'), null)
})
test('si el clic de descarga falla, también se eliminan el enlace y su URL temporal', t => {
  const downloads = captureDownloads(t)
  t.mock.timers.enable({ apis: ['setTimeout'] })
  t.mock.method(dom.window.HTMLAnchorElement.prototype, 'click', () => { throw new Error('Descarga bloqueada') })
  assert.throws(() => downloadCsv('columna\r\nvalor\r\n', 'prueba_demo.csv'), /Descarga bloqueada/)
  assert.equal(document.querySelector('a[download]'), null)
  t.mock.timers.tick(1000)
  assert.equal(downloads.revoke.mock.callCount(), 1)
})
