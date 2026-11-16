import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { test } from 'node:test'
import { createElement, act } from 'react'
import AppRoutes from '../src/app/AppRoutes'
import { parseMonthlySeries, parseCalibratedSeries, validateManifest } from '../src/services/data/validators'
import { validateMethodDocument, validateValidationDocument } from '../src/services/data/peruValidators'
import { loadMethodDocument, loadValidationDocument } from '../src/services/data/loaders'
import { datasetMode } from '../src/services/data/geography'
import type { NationalMethod, NationalValidation } from '../src/types/data'
import { files, mockFiles, mount, choose, chooseSeries, click, dom } from './uiHarness'
const manifest=validateManifest(JSON.parse(files['/data/peru/manifest.json']))
const method=validateMethodDocument(JSON.parse(files['/data/peru/method.json'])) as NationalMethod
const validation=validateValidationDocument(JSON.parse(files['/data/peru/validation.json'])) as NationalValidation
const monthly=parseMonthlySeries(files['/data/peru/monthly_series.csv'])
const calibrated=parseCalibratedSeries(files['/data/peru/calibrated_series.csv'])
const render=(t:Parameters<typeof mockFiles>[0],url='/calendario')=>mount(t,url,createElement(AppRoutes),'peru')

test('Perú: productos importados conservan hashes de origen, contrato v1.1 y 26 regiones',async()=>{
 assert.equal(manifest.contract_version,'1.1');assert.equal(manifest.regions!.length,26)
 assert.deepEqual(new Set(manifest.regions),new Set(method.regions.map(r=>r.region_id)))
 for(const name of ['method.json','validation.json','monthly_series.csv','calibrated_series.csv']) {
  const bytes=await readFile(new URL(`../public/data/peru/${name}`,import.meta.url))
  assert.equal(`sha256:${createHash('sha256').update(bytes).digest('hex')}`,manifest.hash[name])
 }
 assert.ok(!manifest.regions!.includes('PE-UCA'));assert.ok(!manifest.regions!.includes('PE-SIN-25'))
})
test('Perú: totales publicados igualan 25 departamentos sin duplicados ni pérdida de estados',()=>{
 assert.equal(monthly.length,26*326)
 const keys=monthly.map(r=>`${r.region_id}/${r.year}/${r.month}/${r.sensor_group}`);assert.equal(new Set(keys).size,keys.length)
 const calKeys=calibrated.map(r=>`${r.region_id}/${r.year}/${r.month}/${r.method}`);assert.equal(new Set(calKeys).size,calKeys.length)
 for(const national of monthly.filter(r=>r.region_id==='PE')) {
  const departments=monthly.filter(r=>r.region_id!=='PE'&&r.year===national.year&&r.month===national.month&&r.sensor_group===national.sensor_group)
  assert.equal(departments.length,25)
  if(national.status==='ok'&&departments.every(r=>r.status==='ok'))assert.equal(departments.reduce((s,r)=>s+r.cell_days!,0),national.cell_days)
 }
 for(const row of monthly)if(row.status==='missing')assert.equal(row.cell_days,null)
 for(const row of calibrated)if(row.status==='missing')assert.equal(row.value,null)
 assert.ok(monthly.some(r=>r.status==='ok'&&r.cell_days===0))
})
test('PE-25 conserva Ucayali; diferencia de updated_at se reporta sin modificar archivos',()=>{
 const pilot=parseMonthlySeries(files['/data/monthly_series.csv'])
 const national=monthly.filter(r=>r.region_id==='PE-25').map(r=>({...r,region_id:'PE-UCA'}))
 assert.equal(national.length,pilot.length)
 for(let i=0;i<pilot.length;i++) {
  assert.deepEqual({...national[i],updated_at:pilot[i].updated_at},pilot[i])
  assert.equal(pilot[i].updated_at,'2026-11-14');assert.equal(national[i].updated_at,'2026-11-15')
 }
 assert.deepEqual(calibrated.filter(r=>r.region_id==='PE-25').map(r=>({...r,region_id:'PE-UCA'})),parseCalibratedSeries(files['/data/calibrated_series.csv']))
})
test('lectores v1.0/v1.1 preservan métricas null, reportable y motivos sin inventar cero',async t=>{
 mockFiles(t)
 assert.ok('regions' in await loadMethodDocument('/data/peru/method.json'))
 assert.ok('regions' in await loadValidationDocument('/data/peru/validation.json'))
 assert.ok(!('regions' in await loadValidationDocument('/data/validation.json')))
 const notReportable=validation.regions.filter(r=>!r.reportable)
 assert.equal(notReportable.length,4)
 for(const region of notReportable) {assert.equal(region.reportable,false);if(!region.reportable){assert.ok(region.motivo);assert.equal(region.methods,undefined)}}
 const raw=JSON.parse(files['/data/peru/validation.json']);raw.regions[0].methods.B1.metrics.wape=null
 const parsed=validateValidationDocument(raw) as NationalValidation
 if(parsed.regions[0].reportable)assert.equal(parsed.regions[0].methods.B1!.metrics.wape,null)
 raw.regions.find((r:{reportable:boolean})=>!r.reportable).reportable='false';assert.throws(()=>validateValidationDocument(raw),/booleano/)
 const invalid=JSON.parse(files['/data/peru/validation.json']);delete invalid.regions.find((r:{reportable:boolean})=>!r.reportable).motivo
 assert.throws(()=>validateValidationDocument(invalid),/motivo/)
 const corrupt=JSON.parse(files['/data/peru/manifest.json']);corrupt.regions.push('PE-UCA');assert.throws(()=>validateManifest(corrupt),/26|departamentos/)
})
test('Calendario nacional elige PE y departamentos desde metadatos y conserva cifras publicadas',async t=>{
 mockFiles(t);const {host}=await render(t,'/calendario?periodYear=2024&periodMonth=9')
 const selector=host.querySelector<HTMLSelectElement>('[aria-label="Area"]')!
 assert.equal(selector.options.length,26);assert.equal(selector.value,'PE');assert.equal(selector.options[0].text,'Peru')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,monthly.find(r=>r.region_id==='PE'&&r.year===2024&&r.month===9&&r.sensor_group==='MODIS')!.cell_days!.toLocaleString('en-US'))
 await choose(host,'[aria-label="Area"]','PE-25')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'2,323')
 assert.match(host.querySelector('.calendar-heading')!.textContent!,/Ucayali/)
 assert.equal(new URLSearchParams(window.location.search).get('mapRegion'),'PE-25')
 await chooseSeries(host,'VIIRS');assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'5,581')
 await choose(host,'[aria-label="Area"]','PE-07')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'0')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/Observed zero/)
 assert.ok(host.querySelector('.calendar-estimates'))
})
test('URL y navegación conservan región; Mapa y Método nacionales no recurren al piloto',async t=>{
 const fetch=mockFiles(t);const {host}=await render(t,'/calendario?mapRegion=PE-25&periodYear=2024&periodMonth=9#detalle')
 await act(async()=>host.querySelector<HTMLAnchorElement>('.calendar-map-action')!.click())
 assert.equal(window.location.pathname,'/map');assert.equal(new URLSearchParams(window.location.search).get('mapRegion'),'PE-25')
 assert.match(host.textContent!,/HTTP 404/)
 assert.equal(host.querySelector('.map-workspace'),null)
 await act(async()=>[...host.querySelectorAll<HTMLAnchorElement>('nav a')].find(a=>a.textContent==='Method')!.click())
 assert.equal(host.querySelector('.method-scope > strong')!.textContent,'PE-25')
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'30.8%')
 assert.ok(fetch.mock.calls.every(call=>String(call.arguments[0]).startsWith('/data/peru/')))
 assert.equal(window.location.hash,'#detalle')
})
test('Calendario nacional descarga solo región/sensor seleccionado sin alterar registros',async t=>{
 mockFiles(t);const {host}=await render(t,'/calendario?mapRegion=PE-25&periodYear=2024&periodMonth=9&calendarSeries=VIIRS')
 let blob:Blob|undefined;t.mock.method(URL,'createObjectURL',(value:Blob)=>{blob=value;return 'blob:peru'})
 t.mock.method(URL,'revokeObjectURL',()=>{});t.mock.method(dom.window.HTMLAnchorElement.prototype,'click',function(this:HTMLAnchorElement){assert.equal(this.download,'allpanina_PE-25_VIIRS.csv')})
 await click(host,'Download CSV');const rows=parseMonthlySeries(await blob!.text())
 assert.deepEqual(rows,monthly.filter(r=>r.region_id==='PE-25'&&r.sensor_group==='VIIRS'))
 assert.equal(rows.length,163)
})
test('URL conserva piloto, DEMO separado y precedencia de una región nacional explícita',()=>{
 assert.equal(datasetMode(new URLSearchParams()),'peru')
 assert.equal(datasetMode(new URLSearchParams('data=pilot')),'pilot')
 assert.equal(datasetMode(new URLSearchParams('mapRegion=PE-UCA')),'pilot')
 assert.equal(datasetMode(new URLSearchParams('data=pilot&mapRegion=PE-25')),'peru')
 assert.equal(datasetMode(new URLSearchParams('data=demo&mapRegion=PE')),'demo')
})


test('selección regional se restaura con historial y recarga; comparación conserva años y publicación parcial',async t=>{
 mockFiles(t);const {host,root}=await render(t,'/calendario?periodYear=2026')
 await choose(host,'[aria-label="Area"]','PE-25')
 await choose(host,'[aria-label="Area"]','PE-01')
 await act(async()=>new Promise<void>((resolve,reject)=>{
  const timeout=setTimeout(()=>reject(new Error('No llegó popstate')),1500)
  window.addEventListener('popstate',()=>{clearTimeout(timeout);resolve()},{once:true});window.history.back()
 }))
 assert.equal(host.querySelector<HTMLSelectElement>('[aria-label="Area"]')!.value,'PE-25')
 assert.ok(host.querySelector('button[aria-label="August 2026, MODIS: not published"]'))
 assert.equal(host.querySelectorAll('.calendar-matrix tbody tr').length,14)
 assert.equal(host.querySelector('#calendar-detail-title')!.textContent!.endsWith('2026'),true)
 const saved=window.location.pathname+window.location.search
 await act(async()=>root.unmount())
 const restored=await render(t,saved)
 assert.equal(restored.host.querySelector<HTMLSelectElement>('[aria-label="Area"]')!.value,'PE-25')
 assert.match(restored.host.querySelector('.calendar-heading')!.textContent!,/Ucayali/)
})
test('fallo nacional no recurre al piloto ni a DEMO y regiones desconocidas no filtran otro departamento',async t=>{
 const urls:string[]=[]
 t.mock.method(globalThis,'fetch',async(url:string)=>{urls.push(url);return new Response(url.endsWith('monthly_series.csv')?'unavailable':files[url],{status:url.endsWith('monthly_series.csv')?503:200})})
 const {host,root}=await render(t,'/calendario?mapRegion=PE-25')
 assert.match(host.querySelector('.calendar-v2 [role="alert"]')!.textContent!,/HTTP 503/)
 assert.ok(urls.every(url=>url.startsWith('/data/peru/')))
 assert.equal(host.querySelector('.calendar-observed-value'),null)
 await act(async()=>root.unmount());t.mock.restoreAll();mockFiles(t)
 const invalid=await render(t,'/calendario?mapRegion=PE-99')
 assert.match(invalid.host.querySelector('.calendar-v2 [role="alert"]')!.textContent!,/not part of the publication/)
 assert.equal(invalid.host.querySelector('.calendar-matrix'),null)
})
test('no reportable rechaza métricas añadidas; rangos nulos y razones publicadas se conservan',()=>{
 const invalid=JSON.parse(files['/data/peru/validation.json'])
 const region=invalid.regions.find((r:{reportable:boolean})=>!r.reportable);region.methods={}
 assert.throws(()=>validateValidationDocument(invalid),/no debe contener métricas/)
 assert.equal(method.regions.find(r=>r.region_id==='PE-07')!.kappa_anual_rango,null)
 for(const r of validation.regions)if(!r.reportable)assert.equal(r.motivo,method.resultados.test_no_reportables[r.region_id])
})
