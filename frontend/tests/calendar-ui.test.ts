import assert from 'node:assert/strict'
import { test } from 'node:test'
import { downloadCsv } from '../src/services/data/csvExport'
import { dom, files, mockFiles, mount, choose, click } from './uiHarness'
const sensor=(host:HTMLElement,value:string)=>choose(host,'#calendar-sensor',value)
const month=(host:HTMLElement,name:string)=>click(host,name)

test('v2 anual muestra doce meses y navega años sin abrir comparación',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?periodYear=2024')
 assert.equal(host.querySelectorAll('.calendar-annual-grid button').length,12)
 await click(host,'Año anterior');assert.equal(host.querySelector<HTMLSelectElement>('[aria-label="Año del calendario"]')!.value,'2023')
 await click(host,'Año siguiente');assert.equal(host.querySelector<HTMLSelectElement>('[aria-label="Año del calendario"]')!.value,'2024')
 assert.equal(host.querySelector('table'),null)
})
test('v2 período mensual de URL conserva el detalle sin recrear la cuadrícula mensual retirada',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?periodYear=2024&periodMonth=9&scope=month')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2323')
 assert.equal(host.querySelector('.calendar-single-month'),null)
 assert.equal(new URLSearchParams(host.querySelector<HTMLAnchorElement>('.calendar-map-action')!.search).get('scope'),'month')
})
test('v2 detalle conserva observación, cero, missing y no publicado sin fabricar registros',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?data=demo')
 for(const [name,value] of [['Agosto 2024, MODIS, 3','3'],['Septiembre 2024, MODIS, 0 · válido','0'],['Octubre 2024, MODIS, Sin datos','—'],['Noviembre 2024, MODIS, Ausente','—']]) { await month(host,name);assert.equal(host.querySelector('.calendar-observed-value')!.textContent,value) }
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/No publicado/)
})
test('v2 cambiar serie conserva el período y actualiza valores y procedencia',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?periodYear=2024&periodMonth=9')
 await sensor(host,'VIIRS');assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5581')
 assert.equal(new URLSearchParams(window.location.search).get('periodMonth'),'9')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/VIIRS/)
})
test('v2 selector regional evita mezclar filas de regiones diferentes',async t=>{
 const csv=files['/data/monthly_series.csv'];mockFiles(t,{'/data/monthly_series.csv':csv+'OTRA,2024,9,MODIS,7,ok,TEST,2026-11-14\n'})
 const {host}=await mount(t,'/calendario?periodYear=2024&periodMonth=9');await choose(host,'#calendar-region','OTRA')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'7')
 assert.match(host.querySelector('.calendar-export-note')!.textContent!,/1 registros de OTRA/)
})
test('v2 serie vacía y sensor sin registros mantienen estados explícitos y descarga deshabilitada',async t=>{
 mockFiles(t,{'/data/monthly_series.csv':files['/data/monthly_series.csv'].split('\n')[0]})
 const {host}=await mount(t);assert.match(host.textContent!,/No hay datos disponibles/)
 assert.equal(host.querySelector<HTMLButtonElement>('[aria-label="Descargar CSV"]')!.disabled,true)
})
test('v2 HTTP y CSV incorrectos muestran error y reintento recupera lectura',async t=>{
 let invalid=true;t.mock.method(globalThis,'fetch',async(url:string)=>new Response(invalid&&url.endsWith('monthly_series.csv')?'invalid':files[url]))
 const {host}=await mount(t);assert.ok(host.querySelector('[role="alert"]'))
 invalid=false;await click(host,'Reintentar carga');assert.ok(host.querySelector('.calendar-annual-grid'))
})
test('v2 exporta sensor y región actuales, sin filtrar por el mes de detalle',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?periodYear=2024&periodMonth=9')
 let blob:Blob|undefined;t.mock.method(URL,'createObjectURL',(value:Blob)=>{blob=value;return 'blob:csv'})
 t.mock.method(URL,'revokeObjectURL',()=>{});t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',function(this:HTMLAnchorElement){assert.equal(this.download,'allpanina_PE-UCA_VIIRS.csv')})
 await sensor(host,'VIIRS');await click(host,'Descargar CSV')
 const text=await blob!.text();assert.match(text,/2024,9,VIIRS,5581/);assert.equal(text.trim().split('\n').length,164);assert.doesNotMatch(text,/,MODIS,/)
})
test('v2 error de descarga es visible y un reintento correcto lo limpia',async t=>{
 mockFiles(t);const {host}=await mount(t)
 let fail=true;t.mock.method(URL,'createObjectURL',()=>{if(fail)throw new Error('sin espacio');return 'blob:ok'})
 t.mock.method(URL,'revokeObjectURL',()=>{});t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',()=>{})
 await click(host,'Descargar CSV');assert.match(host.querySelector('[role="alert"]')!.textContent!,/sin espacio/)
 fail=false;await click(host,'Descargar CSV');assert.equal(host.querySelector('[role="alert"]'),null)
})
test('descarga libera enlace y URL temporal incluso si el clic falla',async t=>{
 const revoked:string[]=[];t.mock.method(URL,'createObjectURL',()=> 'blob:failed');t.mock.method(URL,'revokeObjectURL',(url:string)=>revoked.push(url))
 t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',()=>{throw new Error('clic fallido')})
 t.mock.timers.enable({apis:['setTimeout']});assert.throws(()=>downloadCsv('csv','test.csv'),/clic fallido/)
 assert.equal(document.querySelector('a[download]'),null);t.mock.timers.tick(1000);assert.deepEqual(revoked,['blob:failed'])
})
