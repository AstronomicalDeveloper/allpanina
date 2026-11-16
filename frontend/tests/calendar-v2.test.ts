import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'
import type { TestContext } from 'node:test'
import { createElement, act } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import AppRoutes from '../src/app/AppRoutes'
import { parseCalibratedSeries, parseMonthlySeries } from '../src/services/data/validators'
import { fireColor, fireStep, quantileBreaks } from '../src/ui/fireScale'
const dom = new JSDOM('<body></body>', { url: 'http://localhost/' })
Object.defineProperties(globalThis, { window: { value: dom.window, configurable: true }, document: { value: dom.window.document, configurable: true }, IS_REACT_ACT_ENVIRONMENT: { value: true, configurable: true } })
const files: Record<string,string> = {}
for (const prefix of ['', 'demo/']) for (const name of ['monthly_series.csv','calibrated_series.csv','manifest.json','method.json']) files[`/data/${prefix}${name}`] = await readFile(new URL(`../public/data/${prefix}${name}`, import.meta.url), 'utf8')
for (const name of ['manifest.json','method.json']) files[`/data/peru/${name}`] = await readFile(new URL(`../public/data/peru/${name}`, import.meta.url), 'utf8')
function mockFiles(t: TestContext) { return t.mock.method(globalThis, 'fetch', async (url: string) => new Response(files[url] ?? '', { status: files[url] === undefined ? 404 : 200 })) }
async function mount(t: TestContext, url = '/calendar') {
 const pilotUrl=new URL(url,'http://localhost');if(!pilotUrl.searchParams.has('data'))pilotUrl.searchParams.set('data','pilot')
 window.history.replaceState(null,'',pilotUrl.pathname+pilotUrl.search+pilotUrl.hash)
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host)
 await act(async()=>root.render(createElement(BrowserRouter,null,createElement(AppRoutes))))
 t.after(async()=>{await act(async()=>root.unmount());host.remove();window.sessionStorage.clear()})
 return {host,root}
}
function button(host: HTMLElement, text: string) { const found=[...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent===text || b.getAttribute('aria-label')===text);assert.ok(found,text);return found }
function cell(host: HTMLElement, name: string) { const found=host.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`);assert.ok(found,name);return found }
async function series(host:HTMLElement,label:string) {const found=[...host.querySelectorAll<HTMLButtonElement>('[aria-label="Series"] button')].find(b=>b.textContent===label);assert.ok(found,label);await act(async()=>found.click())}
const pilot=parseMonthlySeries(files['/data/monthly_series.csv'])

test('v2 real: el panel abre con un mes útil, la selección observada cambia y B1 se distingue', async t=>{
 mockFiles(t);const {host}=await mount(t)
 assert.equal(host.querySelectorAll('.calendar-matrix tbody button').length,14*12)
 // Sin mes en la URL: el mes más intenso del último año completo (2025), nunca un panel vacío.
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'September 2025')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'472')
 assert.equal(new URLSearchParams(window.location.search).has('periodMonth'),false)
 assert.ok(cell(host,'August 2026, MODIS: not published'))
 assert.doesNotMatch(host.textContent!,/DEMO/)
 await act(async()=>cell(host,'September 2024, MODIS: 2,323 cell-days').click())
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2,323')
 assert.equal(new URLSearchParams(window.location.search).get('scope'),'year')
 assert.equal(host.querySelector('[role="dialog"]'),null)
 assert.match(host.querySelector('.calendar-estimates')!.textContent!,/B1: 1,638\.6.*validation period/)
 assert.equal(host.querySelector<HTMLDetailsElement>('.calendar-technical')!.open,false)
 assert.ok(host.querySelector('.calendar-estimate strong[title="1638.602393444556"]'))
 await series(host,'VIIRS')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5,581')
 // Color por cuantiles de la región y la serie: el mismo cálculo que la leyenda.
 const breaks=quantileBreaks(pilot.filter(r=>r.region_id==='PE-UCA'&&r.sensor_group==='VIIRS').map(r=>r.cell_days))
 assert.equal(cell(host,'September 2024, VIIRS: 5,581 cell-days').style.backgroundColor,hex(fireColor(fireStep(5581,breaks))))
})
function hex(value:string){const [r,g,b]=value.slice(1).match(/../g)!.map(n=>parseInt(n,16));return `rgb(${r}, ${g}, ${b})`}

test('v2 leyenda: nueve clases por cuantiles con rangos enteros, propias de cada serie, y estados aparte',async t=>{
 mockFiles(t);const {host}=await mount(t)
 const labels=()=>[...host.querySelectorAll('.calendar-legend figure li')].map(li=>li.textContent!)
 const modis=labels()
 assert.ok(modis.length>1&&modis.length<=9,String(modis.length))
 assert.ok(modis.every(label=>/^[\d,]+–[\d,]+$|^≥ [\d,]+$/.test(label)),modis.join(' | '))
 assert.match(host.querySelector('.calendar-legend')!.textContent!,/Zero.*No usable data.*Not published/)
 await series(host,'VIIRS')
 assert.notDeepEqual(labels(),modis)
 assert.match(host.querySelector('.calendar-summary')!.textContent!,/Most active months: [A-Z][a-z]{2}–[A-Z][a-z]{2}\. Most intense year: \d{4}\./)
})

test('v2 DEMO explícito: cero, missing y ausencia no se convierten entre sí',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?data=demo')
 assert.match(host.textContent!,/DEMO DATA/)
 await act(async()=>cell(host,'September 2024, MODIS: 0 cell-days (observed zero)').click())
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'0')
 await act(async()=>cell(host,'October 2024, MODIS: no usable data').click())
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/No usable data/)
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'—')
 await act(async()=>cell(host,'November 2024, MODIS: not published').click())
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/Not published/)
 assert.equal(host.querySelectorAll('.calendar-matrix tbody tr').length,1)
 assert.equal(new URLSearchParams(window.location.search).get('scope'),'year')
 assert.equal(host.querySelector('.calendar-table-scroll')!.getAttribute('tabindex'),'0')
})

test('v2 URL: series independientes, período explícito, hash y parámetros conservados; enlace mensual y regreso por historial',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2024&periodMonth=9&scope=year&mapSensor=MODIS&calendarSeries=VIIRS&extra=keep#detalle')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5,581')
 await series(host,'MODIS');await series(host,'VIIRS')
 assert.equal(window.location.hash,'#detalle')
 const href=host.querySelector<HTMLAnchorElement>('.calendar-map-action')!
 const url=new URL(href.href)
 assert.equal(url.pathname,'/map');assert.equal(url.searchParams.get('scope'),'month');assert.equal(url.searchParams.get('mapScope'),'month')
 assert.equal(url.searchParams.get('mapSensor'),'MODIS');assert.equal(url.searchParams.get('calendarSeries'),'VIIRS');assert.equal(url.searchParams.get('periodMonth'),'9');assert.equal(url.searchParams.get('extra'),'keep')
 await act(async()=>href.click())
 assert.equal(host.querySelector('h1')!.textContent,'Map of observations')
 await act(async()=>new Promise<void>((resolve,reject)=>{const timeout=setTimeout(()=>reject(new Error('historial sin evento')),1500);window.addEventListener('popstate',()=>{clearTimeout(timeout);resolve()},{once:true});window.history.back()}))
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5,581')
 assert.equal(new URLSearchParams(window.location.search).get('scope'),'year')
})

test('v2 B1: estimación marcada como tal, error del período de test sin atribuirlo al mes, CSV propio y mapa con observaciones',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2024&periodMonth=9&mapSensor=VIIRS')
 await series(host,'Estimate (B1)')
 assert.equal(new URLSearchParams(window.location.search).get('calendarSeries'),'B1')
 assert.equal(new URLSearchParams(window.location.search).get('sensor'),'VIIRS')
 assert.match(host.textContent!,/B1 estimate.*not an observation/)
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'≈ 1,639')
 assert.ok(cell(host,'September 2024, B1 estimate: 1,639 cell-days'))
 const detail=host.querySelector('#calendar-detail')!.textContent!
 assert.match(detail,/Estimated/)
 assert.match(detail,/Test-period error \(WAPE\): 30\.8%, over Jan 2025 – Jul 2026/)
 assert.match(detail,/not the error of this month/)
 assert.match(detail,/MODIS · observed2,323 cell-days/)
 const map=new URL(host.querySelector<HTMLAnchorElement>('.calendar-map-action')!.href)
 assert.equal(map.searchParams.get('mapSensor'),'VIIRS');assert.equal(map.searchParams.get('sensor'),'VIIRS')
 let blob:Blob|null=null,name=''
 t.mock.method(URL,'createObjectURL',(value:Blob)=>{blob=value;return 'blob:b1'})
 t.mock.method(URL,'revokeObjectURL',()=>{})
 t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',function(this:HTMLAnchorElement){name=this.download})
 await act(async()=>button(host,'Download CSV').click())
 assert.equal(name,'allpanina_PE-UCA_B1.csv')
 assert.deepEqual(parseCalibratedSeries(await (blob as unknown as Blob).text()),parseCalibratedSeries(files['/data/calibrated_series.csv']).filter(r=>r.method==='B1'))
})

test('v2 año en la URL sin mes: el panel muestra el mes más intenso de ese año sin escribirlo en la URL',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2024')
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'September 2024')
 assert.equal(host.querySelector('.calendar-matrix button[aria-pressed="true"]')!.getAttribute('aria-controls'),'calendar-detail')
 assert.equal(new URLSearchParams(window.location.search).has('periodMonth'),false)
})

test('v2 errores visibles y reintento sin fallback; observaciones disponibles aunque falten estimaciones',async t=>{
 let fail=true;const urls:string[]=[]
 t.mock.method(globalThis,'fetch',async(url:string)=>{urls.push(url);return new Response(fail?'no disponible':files[url],{status:fail||url.endsWith('calibrated_series.csv')?404:200})})
 const {host}=await mount(t)
 assert.match(host.querySelector('.calendar-v2 [role="alert"]')!.textContent!,/HTTP 404/)
 assert.equal(host.querySelector('#calendar-detail'),null)
 fail=false;await act(async()=>button(host,'Retry loading').click())
 assert.equal(host.querySelectorAll('.calendar-matrix tbody button').length,14*12)
 assert.match(host.querySelector('.calendar-v2 [role="alert"]')!.textContent!,/Estimates are not available/)
 assert.equal(host.querySelector('[aria-label="Series"] button:last-child')!.textContent,'VIIRS')
 assert.ok(urls.every(url=>!url.includes('/demo/')))
})

test('v2 CSV conserva registros completos, sensor, BOM, ceros/null y limpieza de URL',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?data=demo&periodYear=2024&periodMonth=9')
 let blob:Blob|null=null
 t.mock.method(URL,'createObjectURL',(value:Blob)=>{blob=value;return 'blob:v2'})
 const revoke=t.mock.method(URL,'revokeObjectURL',()=>{})
 t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',()=>{})
 t.mock.timers.enable({apis:['setTimeout']})
 await act(async()=>button(host,'Download CSV').click())
 assert.ok(blob)
 assert.deepEqual([...new Uint8Array(await (blob as Blob).arrayBuffer())].slice(0,3),[239,187,191])
 assert.deepEqual(parseMonthlySeries(await (blob as Blob).text()),parseMonthlySeries(files['/data/demo/monthly_series.csv']).filter(r=>r.sensor_group==='MODIS'))
 assert.equal(document.querySelector('a[download]'),null)
 t.mock.timers.tick(1000);assert.equal(revoke.mock.callCount(),1)
})

test('v2 carga, cancelación y datos vacíos: sin períodos fabricados',async t=>{
 const signals:AbortSignal[]=[];const resolve:(()=>void)[]=[]
 t.mock.method(globalThis,'fetch',(url:string,options?:RequestInit)=>{signals.push(options!.signal as AbortSignal);return new Promise<Response>(done=>resolve.push(()=>done(new Response(url.endsWith('monthly_series.csv')?'region_id,year,month,sensor_group,cell_days,status,source_version,updated_at':files[url]))))})
 const {host,root}=await mount(t)
 assert.ok([...host.querySelectorAll('[role="status"]')].some(node=>/Loading calendar/.test(node.textContent!)))
 assert.equal(host.querySelector('#calendar-detail'),null)
 await act(async()=>resolve.forEach(done=>done()))
 assert.match(host.textContent!,/No data is available/)
 assert.equal(host.querySelector('#calendar-detail'),null)
 assert.equal(button(host,'Download CSV').disabled,true)
 await act(async()=>root.unmount())
 assert.ok(signals.every(signal=>signal.aborted))
})
