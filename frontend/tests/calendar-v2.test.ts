import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import AppRoutes from '../src/app/AppRoutes'
import { parseMonthlySeries } from '../src/services/data/validators'
const dom = new JSDOM('<body></body>', { url: 'http://localhost/' })
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true } })
const files: Record<string,string> = {}
for (const prefix of ['', 'demo/']) for (const name of ['monthly_series.csv','calibrated_series.csv','manifest.json','method.json']) files[`/data/${prefix}${name}`] = await readFile(new URL(`../public/data/${prefix}${name}`, import.meta.url), 'utf8')
for (const name of ['manifest.json','method.json']) files[`/data/peru/${name}`] = await readFile(new URL(`../public/data/peru/${name}`, import.meta.url), 'utf8')
function mockFiles(t: TestContext) { return t.mock.method(globalThis, 'fetch', async (url: string) => new Response(files[url] ?? '', { status: files[url] === undefined ? 404 : 200 })) }
async function mount(t: TestContext, url = '/calendario') {
 const pilotUrl=new URL(url,'http://localhost');if(!pilotUrl.searchParams.has('data'))pilotUrl.searchParams.set('data','pilot')
 window.history.replaceState(null,'',pilotUrl.pathname+pilotUrl.search+pilotUrl.hash)
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 await act(async()=>root.render(createElement(BrowserRouter,null,createElement(AppRoutes))))
 t.after(async()=>{await act(async()=>root.unmount());host.remove();window.sessionStorage.clear()})
 return {host,root}
}
function button(host: HTMLElement, text: string) { const found=[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===text || b.getAttribute('aria-label')===text);assert.ok(found,text);return found }
function cell(host: HTMLElement, name: string) { const found=host.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);assert.ok(found,name);return found }
async function choose(host:HTMLElement, label:string, value:string) { const select=host.querySelector<HTMLSelectElement>(`[aria-label="${label}"]`)!;assert.ok(select,label);await act(async()=>{select.value=value;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}))}) }
async function series(host:HTMLElement,value:string) {const select=host.querySelector<HTMLSelectElement>('#calendar-sensor')!;await act(async()=>{select.value=value;select.dispatchEvent(new dom.window.Event('change',{bubbles:true}))})}

test('v2 real: doce meses, detalle inicialmente vacío, selección observada, escala y B0/B1 diferenciados', async t=>{
 mockFiles(t);const {host}=await mount(t)
 assert.equal(host.querySelectorAll('.calendar-annual-grid button').length,12)
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'Selecciona un mes')
 assert.equal(host.querySelector('.calendar-map-action'),null)
 assert.equal(host.querySelector<HTMLSelectElement>('[aria-label="Año del calendario"]')!.value,'2026')
 assert.ok(cell(host,'Agosto 2026, MODIS, Ausente'))
 assert.doesNotMatch(host.textContent!,/DEMO/)
 await choose(host,'Año del calendario','2024')
 await act(async()=>cell(host,'Septiembre 2024, MODIS, 2323').click())
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2323')
 assert.equal(new URLSearchParams(window.location.search).get('scope'),'year')
 assert.equal(host.querySelector('[role="dialog"]'),null)
 assert.match(host.querySelector('.calendar-estimates')!.textContent!,/B1: 1,638\.6.*valid/)
 assert.equal(host.querySelector<HTMLDetailsElement>('.calendar-technical')!.open,false)
 assert.ok(host.querySelector('.calendar-estimate strong[title="1638.602393444556"]'))
 await series(host,'VIIRS')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5581')
 const input=host.querySelector<HTMLInputElement>('.calendar-scale-control input')!
 await act(async()=>{input.value='1';input.dispatchEvent(new dom.window.Event('input',{bubbles:true}))})
 assert.equal(cell(host,'Septiembre 2024, VIIRS, 5581').style.backgroundColor,'rgb(221, 130, 82)')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5581')
 assert.equal(host.querySelector('.calendar-scale-ticks')!.lastElementChild!.textContent,'1')
})

test('v2 DEMO explícito: cero, missing y ausencia no se convierten entre sí; matriz local sin vista mensual',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?data=demo')
 assert.match(host.textContent!,/DATOS DEMO/)
 await act(async()=>cell(host,'Septiembre 2024, MODIS, 0 · válido').click())
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'0')
 await act(async()=>cell(host,'Octubre 2024, MODIS, Sin datos').click())
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/Sin dato utilizable/)
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'—')
 await act(async()=>cell(host,'Noviembre 2024, MODIS, Ausente').click())
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/No publicado/)
 assert.equal(host.querySelector('[aria-label="Modalidad del calendario"]'),null)
 assert.equal(host.querySelector('.calendar-single-month'),null)
 await act(async()=>button(host,'Comparar años').click())
 assert.equal(host.querySelectorAll('tbody tr').length,1)
 assert.equal(new URLSearchParams(window.location.search).get('scope'),'year')
 assert.equal(host.querySelector('.calendar-table-scroll')!.getAttribute('tabindex'),'0')
})

test('v2 URL: series independientes, período explícito, hash y parámetros conservados; enlace mensual y regreso por historial',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?periodYear=2024&periodMonth=9&scope=year&mapSensor=MODIS&calendarSeries=VIIRS&extra=keep#detalle')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5581')
 await series(host,'MODIS');await series(host,'VIIRS')
 assert.equal(window.location.hash,'#detalle')
 const href=host.querySelector<HTMLAnchorElement>('.calendar-map-action')!
 const url=new URL(href.href)
 assert.equal(url.pathname,'/map');assert.equal(url.searchParams.get('scope'),'month');assert.equal(url.searchParams.get('mapScope'),'month')
 assert.equal(url.searchParams.get('mapSensor'),'MODIS');assert.equal(url.searchParams.get('calendarSeries'),'VIIRS');assert.equal(url.searchParams.get('periodMonth'),'9');assert.equal(url.searchParams.get('extra'),'keep')
 await act(async()=>href.click())
 assert.equal(host.querySelector('h1')!.textContent,'Mapa de observaciones')
 await act(async()=>new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('historial sin evento')),1500);window.addEventListener('popstate',()=>{clearTimeout(timeout);resolve()},{once:true});window.history.back()}))
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5581')
 assert.equal(new URLSearchParams(window.location.search).get('scope'),'year')
})

test('v2 comparación conserva los catorce años reales y permite seleccionar sin cambiar modalidad',async t=>{
 mockFiles(t);const {host}=await mount(t)
 await act(async()=>button(host,'Comparar años').click())
 assert.equal(host.querySelectorAll('tbody tr').length,3)
 await act(async()=>host.querySelector<HTMLInputElement>('[aria-label="Todos los años"]')!.click())
 assert.equal(host.querySelectorAll('tbody tr').length,14)
 assert.equal(host.querySelectorAll('tbody button').length,14*12)
 await act(async()=>cell(host,'Septiembre 2024, MODIS, 2323').click())
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2323')
 assert.equal(new URLSearchParams(window.location.search).get('scope'),'year')
 assert.equal(host.querySelector('.calendar-table button[aria-pressed="true"]')!.getAttribute('aria-controls'),'calendar-detail')
})

test('v2 errores visibles y reintento sin fallback; observaciones disponibles aunque falten estimaciones',async t=>{
 let fail=true;const urls:string[]=[]
 t.mock.method(globalThis,'fetch',async(url:string)=>{urls.push(url);return new Response(fail?'no disponible':files[url],{status:fail||url.endsWith('calibrated_series.csv')?404:200})})
 const {host}=await mount(t)
 assert.match(host.querySelector('[role="alert"]')!.textContent!,/HTTP 404/)
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'Selecciona un mes')
 fail=false;await act(async()=>button(host,'Reintentar carga').click())
 assert.equal(host.querySelectorAll('.calendar-annual-grid button').length,12)
 assert.match(host.querySelector('.calendar-v2 [role="alert"]')!.textContent!,/Estimaciones no disponibles/)
 assert.ok(urls.every(url=>!url.includes('/demo/')))
})

test('v2 CSV conserva registros completos, sensor, BOM, ceros/null y limpieza de URL',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?data=demo&periodYear=2024&periodMonth=9')
 let blob:Blob|null=null
 t.mock.method(URL,'createObjectURL',(value:Blob)=>{blob=value;return 'blob:v2'})
 const revoke=t.mock.method(URL,'revokeObjectURL',()=>{})
 t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',()=>{})
 t.mock.timers.enable({apis:['setTimeout']})
 await act(async()=>button(host,'Descargar CSV').click())
 assert.ok(blob)
 assert.deepEqual([...new Uint8Array(await (blob as Blob).arrayBuffer())].slice(0,3),[239,187,191])
 assert.deepEqual(parseMonthlySeries(await (blob as Blob).text()),parseMonthlySeries(files['/data/demo/monthly_series.csv']).filter(r=>r.sensor_group==='MODIS'))
 assert.equal(document.querySelector('a[download]'),null)
 t.mock.timers.tick(1000);assert.equal(revoke.mock.callCount(),1)
})

test('v2 carga, cancelación y datos vacíos mantienen Descripción sin fabricar períodos',async t=>{
 const signals:AbortSignal[]=[];const resolve:(()=>void)[]=[]
 t.mock.method(globalThis,'fetch',(url:string,options?:RequestInit)=>{signals.push(options!.signal as AbortSignal);return new Promise<Response>(done=>resolve.push(()=>done(new Response(url.endsWith('monthly_series.csv')?'region_id,year,month,sensor_group,cell_days,status,source_version,updated_at':files[url]))))})
 const {host,root}=await mount(t)
 assert.ok([...host.querySelectorAll('[role="status"]')].some(node=>/Cargando/.test(node.textContent!)))
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'Selecciona un mes')
 await act(async()=>resolve.forEach(done=>done()))
 assert.match(host.textContent!,/No hay datos disponibles/)
 assert.equal(button(host,'Descargar CSV').disabled,true)
 await act(async()=>root.unmount())
 assert.ok(signals.every(signal=>signal.aborted))
})


test('v2 selección de años no consecutivos, todos/ninguno y persistencia en modalidad y sesión', async t=>{
 mockFiles(t);const {host,root}=await mount(t)
 await act(async()=>button(host,'Comparar años').click())
 assert.equal(host.querySelector('.calendar-year-navigation')!.getAttribute('aria-hidden'),'true')
 assert.equal(host.querySelector<HTMLSelectElement>('[aria-label="Año del calendario"]')!.disabled,true)
 const check=(label:string)=>host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!
 assert.equal(host.querySelectorAll('tbody tr').length,3)
 assert.match(check('Comparar 2026').parentElement!.textContent!,/Parcial.*7\/12/)
 await act(async()=>check('Todos los años').click())
 assert.equal(host.querySelectorAll('tbody tr').length,14)
 await act(async()=>check('Todos los años').click())
 assert.equal(host.querySelector('table'),null)
 assert.match(host.querySelector('[role="status"]')!.textContent!,/Selecciona al menos un año/)
 await act(async()=>{check('Comparar 2013').click();check('Comparar 2024').click()})
 assert.deepEqual([...host.querySelectorAll('tbody th')].map(th=>th.textContent),['2013','2024'])
 assert.equal(host.querySelectorAll('thead th').length,13)
 assert.equal(host.querySelectorAll('tbody button').length,24)
 const detail=host.querySelector('#calendar-detail')!, matrix=host.querySelector('table')!
 assert.ok(detail.compareDocumentPosition(matrix)&dom.window.Node.DOCUMENT_POSITION_FOLLOWING)
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'Selecciona un mes')
 await act(async()=>cell(host,'Septiembre 2024, MODIS, 2323').click())
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2323')
 assert.ok(host.querySelector('.calendar-map-action'))
 await act(async()=>button(host,'Un año').click())
 assert.equal(host.querySelectorAll('.calendar-annual-grid button').length,12)
 await act(async()=>button(host,'Comparar años').click())
 assert.equal(host.querySelectorAll('tbody tr').length,2)
 await series(host,'VIIRS')
 assert.equal(host.querySelectorAll('tbody tr').length,2)
 const saved=window.location.pathname+window.location.search
 await act(async()=>root.unmount())
 const restored=await mount(t,saved)
 await act(async()=>button(restored.host,'Comparar años').click())
 assert.deepEqual([...restored.host.querySelectorAll('tbody th')].map(th=>th.textContent),['2013','2024'])
})


test('quitar el año seleccionado o todos los años limpia el detalle y la URL sin restaurarlo al reañadir', async t=>{
 mockFiles(t);const {host}=await mount(t)
 await act(async()=>button(host,'Comparar años').click())
 const check=(label:string)=>host.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!
 await act(async()=>cell(host,'Septiembre 2024, MODIS, 2323').click())
 await act(async()=>check('Comparar 2025').click())
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2323')
 assert.equal(new URLSearchParams(window.location.search).get('periodMonth'),'9')
 await act(async()=>check('Comparar 2024').click())
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'Selecciona un mes')
 assert.equal(host.querySelector('.calendar-map-action'),null)
 assert.equal(host.querySelector('.calendar-cell[aria-pressed="true"]'),null)
 assert.equal(new URLSearchParams(window.location.search).has('periodMonth'),false)
 await act(async()=>check('Comparar 2024').click())
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'Selecciona un mes')
 await act(async()=>cell(host,'Septiembre 2024, MODIS, 2323').click())
 await act(async()=>check('Todos los años').click())
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2323')
 await act(async()=>check('Todos los años').click())
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'Selecciona un mes')
 assert.equal(host.querySelector('.calendar-map-action'),null)
 assert.equal(new URLSearchParams(window.location.search).has('periodMonth'),false)
 await act(async()=>button(host,'Un año').click())
 assert.equal(host.querySelector('.calendar-cell[aria-pressed="true"]'),null)
})


test('desplegable de años mantiene selección, contador y limpieza del período activo sin etiquetas', async t=>{
 mockFiles(t);const {host}=await mount(t)
 await act(async()=>button(host,'Comparar años').click())
 const menu=host.querySelector<HTMLDetailsElement>('.calendar-year-menu')!
 assert.equal(menu.open,false)
 assert.equal(host.querySelector('.calendar-selected-years'),null)
 assert.ok(menu.closest('.calendar-toolbar-controls'))
 assert.equal(menu.parentElement,host.querySelector('.calendar-year-navigation')!.parentElement)
 assert.equal(host.querySelector('.calendar-year-count')!.textContent,'3')
 await act(async()=>menu.querySelector('summary')!.click())
 assert.equal(menu.open,true)
 await act(async()=>host.querySelector<HTMLInputElement>('[aria-label="Comparar 2013"]')!.click())
 assert.equal(host.querySelector('.calendar-year-count')!.textContent,'4')
 await act(async()=>menu.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Escape',bubbles:true})))
 assert.equal(menu.open,false)
 assert.equal(document.activeElement,menu.querySelector('summary'))
 await act(async()=>cell(host,'Septiembre 2024, MODIS, 2323').click())
 await act(async()=>menu.querySelector('summary')!.click())
 await act(async()=>host.querySelector<HTMLInputElement>('[aria-label="Comparar 2024"]')!.click())
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'Selecciona un mes')
 assert.equal(new URLSearchParams(window.location.search).has('periodMonth'),false)
 assert.equal(host.querySelector('[aria-label="Comparar 2024"]')!.getAttribute('type'),'checkbox')
 assert.equal(host.querySelector('.calendar-year-count')!.textContent,'3')
})
