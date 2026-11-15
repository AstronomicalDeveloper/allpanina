import assert from 'node:assert/strict'
import { test } from 'node:test'
import { downloadCsv } from '../src/services/data/csvExport'
import { dom, files, mockFiles, mount, choose, click, chooseSeries } from './uiHarness'
const month=(host:HTMLElement,name:string)=>click(host,name)

test('matriz completa: 14 años × 12 meses, sin navegación por año ni modalidad de comparación',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2024')
 assert.equal(host.querySelectorAll('.calendar-matrix tbody tr').length,14)
 assert.equal(host.querySelectorAll('.calendar-matrix tbody button').length,14*12)
 assert.deepEqual([...host.querySelectorAll('.calendar-matrix tbody th')].map(th=>th.textContent!.slice(0,4)),Array.from({length:14},(_,i)=>String(2013+i)))
 assert.match(host.querySelector('.calendar-matrix tbody tr:last-child th')!.textContent!,/partial year: 7 of 12 months/)
 assert.equal(host.querySelector('[aria-label="Previous year"]'),null)
})
test('período mensual de la URL abre ese mes en el panel y enlaza al mismo mes en el Mapa',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2024&periodMonth=9&scope=month')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2,323')
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent,'September 2024')
 assert.equal(new URLSearchParams(host.querySelector<HTMLAnchorElement>('.calendar-map-action')!.search).get('scope'),'month')
})
test('detalle conserva observación, cero, missing y no publicado sin fabricar registros',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?data=demo')
 for(const [name,value] of [['August 2024, MODIS: 3 cell-days','3'],['September 2024, MODIS: 0 cell-days (observed zero)','0'],['October 2024, MODIS: no usable data','—'],['November 2024, MODIS: not published','—']]) { await month(host,name);assert.equal(host.querySelector('.calendar-observed-value')!.textContent,value) }
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/Not published/)
})
test('cambiar serie conserva el período y actualiza valores y procedencia',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2024&periodMonth=9')
 await chooseSeries(host,'VIIRS');assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5,581')
 assert.equal(new URLSearchParams(window.location.search).get('periodMonth'),'9')
 assert.equal(new URLSearchParams(window.location.search).get('calendarSeries'),'VIIRS')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/VIIRS/)
})
test('selector regional evita mezclar filas de regiones diferentes',async t=>{
 const csv=files['/data/monthly_series.csv'];mockFiles(t,{'/data/monthly_series.csv':csv+'OTRA,2024,9,MODIS,7,ok,TEST,2026-11-14\n'})
 const {host}=await mount(t,'/calendar?periodYear=2024&periodMonth=9');await choose(host,'#calendar-region','OTRA')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'7')
 assert.match(host.querySelector('.calendar-export-note')!.textContent!,/1 observed records for OTRA/)
})
test('serie vacía mantiene estado explícito y descarga deshabilitada',async t=>{
 mockFiles(t,{'/data/monthly_series.csv':files['/data/monthly_series.csv'].split('\n')[0]})
 const {host}=await mount(t);assert.match(host.textContent!,/No data is available/)
 assert.equal([...host.querySelectorAll<HTMLButtonElement>('button')].find(b=>b.textContent==='Download CSV')!.disabled,true)
})
test('HTTP y CSV incorrectos muestran error y reintento recupera lectura',async t=>{
 let invalid=true;t.mock.method(globalThis,'fetch',async(url:string)=>new Response(invalid&&url.endsWith('monthly_series.csv')?'invalid':files[url]))
 const {host}=await mount(t);assert.ok(host.querySelector('[role="alert"]'))
 invalid=false;await click(host,'Retry loading');assert.ok(host.querySelector('.calendar-matrix'))
})
test('exporta sensor y región actuales, sin filtrar por el mes de detalle',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2024&periodMonth=9')
 let blob:Blob|undefined;t.mock.method(URL,'createObjectURL',(value:Blob)=>{blob=value;return 'blob:csv'})
 t.mock.method(URL,'revokeObjectURL',()=>{});t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',function(this:HTMLAnchorElement){assert.equal(this.download,'allpanina_PE-UCA_VIIRS.csv')})
 await chooseSeries(host,'VIIRS');await click(host,'Download CSV')
 const text=await blob!.text();assert.match(text,/2024,9,VIIRS,5581/);assert.equal(text.trim().split('\n').length,164);assert.doesNotMatch(text,/,MODIS,/)
})
test('error de descarga es visible y un reintento correcto lo limpia',async t=>{
 mockFiles(t);const {host}=await mount(t)
 let fail=true;t.mock.method(URL,'createObjectURL',()=>{if(fail)throw new Error('sin espacio');return 'blob:ok'})
 t.mock.method(URL,'revokeObjectURL',()=>{});t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',()=>{})
 await click(host,'Download CSV');assert.match(host.querySelector('[role="alert"]')!.textContent!,/sin espacio/)
 fail=false;await click(host,'Download CSV');assert.equal(host.querySelector('[role="alert"]'),null)
})
test('descarga libera enlace y URL temporal incluso si el clic falla',async t=>{
 const revoked:string[]=[];t.mock.method(URL,'createObjectURL',()=> 'blob:failed');t.mock.method(URL,'revokeObjectURL',(url:string)=>revoked.push(url))
 t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',()=>{throw new Error('clic fallido')})
 t.mock.timers.enable({apis:['setTimeout']});assert.throws(()=>downloadCsv('csv','test.csv'),/clic fallido/)
 assert.equal(document.querySelector('a[download]'),null);t.mock.timers.tick(1000);assert.deepEqual(revoked,['blob:failed'])
})
