import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {gzipSync} from 'node:zlib'
import {test} from 'node:test'
import {act,createElement} from 'react'
import {Routes,Route} from 'react-router-dom'
import {loadCells} from '../src/services/data/loaders'
import {validateManifest,parseMonthlySeries,parseCalibratedSeries} from '../src/services/data/validators'
import {validateMethodDocument,validateValidationDocument} from '../src/services/data/peruValidators'
import {buildMapYear} from '../src/services/data/mapExploration'
import {regionalMethod} from '../src/services/data/regionalMethod'
import {regionalSummary} from '../src/services/data/regionalSummary'
import {cellPopup} from '../src/services/data/map'
import type {CellsData,NationalMethod,NationalValidation} from '../src/types/data'
import type {SummaryPoints} from '../src/services/data/mapSymbols'
import {SUMMARY_SOURCE,POINT_LAYER} from '../src/pages/map/cartography/multiscaleLayers'
import MapPage from '../src/pages/map/MapPage'
import MethodPage from '../src/pages/method/MethodPage'
import Navbar from '../src/components/layout/Navbar'
import GeographicSelection from '../src/components/ui/GeographicSelection'
import {files,mockFiles,mount,fakeRuntime,choose,click,dom} from './uiHarness'
const manifest=validateManifest(JSON.parse(files['/data/peru/manifest.json']))
const method=validateMethodDocument(JSON.parse(files['/data/peru/method.json'])) as NationalMethod
const validation=validateValidationDocument(JSON.parse(files['/data/peru/validation.json'])) as NationalValidation
const monthly=parseMonthlySeries(files['/data/peru/monthly_series.csv'])
const calibrated=parseCalibratedSeries(files['/data/peru/calibrated_series.csv'])
for(const year of [2024,2026])files[`/data/peru/cells_PE_${year}.geojson`]=await readFile(new URL(`../public/data/peru/cells_PE_${year}.geojson`,import.meta.url),'utf8')
async function setup(t:Parameters<typeof mockFiles>[0],url='/mapa?mapRegion=PE&periodYear=2024&periodMonth=9&scope=month') {
 const runtime=fakeRuntime()
 const element=createElement(Routes,null,
  createElement(Route,{path:'/mapa',element:createElement(MapPage,{runtimeLoader:runtime.loader})}),
  createElement(Route,{path:'/metodo',element:createElement(MethodPage)}))
 const result=await mount(t,url,createElement('div',null,createElement(Navbar),createElement(GeographicSelection),element),'peru')
 return {...result,runtime}
}
const total=(value:CellsData)=>value.features.reduce((s,f)=>s+f.properties.cell_days,0)

test('14 GeoJSON nacionales: hashes, lectura, límites de tamaño y sumas por mes/sensor',async t=>{
 const names=manifest.files.filter(name=>name.endsWith('.geojson'));assert.equal(names.length,14)
 t.mock.method(globalThis,'fetch',async(url:string)=>new Response(await readFile(new URL(`../public${url}`,import.meta.url),'utf8')))
 for(const name of names) {
  const bytes=await readFile(new URL(`../public/data/peru/${name}`,import.meta.url))
  assert.equal('sha256:'+createHash('sha256').update(bytes).digest('hex'),manifest.hash[name])
  assert.ok(bytes.length<=8*1024*1024);assert.ok(gzipSync(bytes).length<=1024*1024)
  const data=await loadCells(`/data/peru/${name}`),year=Number(name.slice(-12,-8))
  const model=buildMapYear(data,{region:'PE',year},monthly)
  for(const sensor of ['MODIS','VIIRS'] as const) {
   const rows=monthly.filter(r=>r.region_id==='PE'&&r.year===year&&r.sensor_group===sensor)
   assert.equal(total(model.annual[sensor] as CellsData),rows.reduce((s,r)=>s+(r.cell_days??0),0))
  }
  assert.ok(data.features.every(f=>!('region_id' in f.properties)&&!('B1' in f.properties)))
 }
})
test('Mapa nacional carga solo el año activo; cuadrados/inspector explican valores de 10 km superiores a 31',async t=>{
 const fetch=mockFiles(t);const {host,runtime}=await setup(t)
 assert.equal(fetch.mock.calls.filter(call=>String(call.arguments[0]).includes('/data/peru/cells_')).length,1)
 const observed=runtime.maps[0].sources['celdas-observadas'].data as CellsData
 assert.equal(total(observed),monthly.find(r=>r.region_id==='PE'&&r.year===2024&&r.month===9&&r.sensor_group==='MODIS')!.cell_days)
 const cell=observed.features.find(f=>f.properties.cell_days>31)!.properties
 await act(async()=>runtime.maps[0].emit(`click:${POINT_LAYER}`,{features:[{properties:{cell_id:cell.cell_id}}],lngLat:{lng:-74,lat:-8}}))
 assert.match(runtime.popups[0].content!.textContent!,/10 km.*días-celda de 1 km.*No son días distintos/)
 assert.match(host.querySelector('.map-cell-detail')!.textContent!,/10 km.*No son días distintos/)
 assert.equal((runtime.maps[0].sources[SUMMARY_SOURCE].data as SummaryPoints).features.length,observed.features.length)
 assert.ok((runtime.maps[0].sources[SUMMARY_SOURCE].data as SummaryPoints).features.every(f=>f.properties.region_id==='PE'))
})
test('departamento mantiene capa PE sin reparto por centroide; resumen toma el CSV y no suma geometrías',async t=>{
 mockFiles(t);const {host,runtime}=await setup(t,'/mapa?mapRegion=PE-25&periodYear=2024&periodMonth=9&scope=month&calendarSeries=VIIRS')
 const map=runtime.maps[0],observed=map.sources['celdas-observadas'].data as CellsData
 assert.ok(observed.features.length>0)
 assert.equal(host.querySelector('.map-observed-value')!.textContent,'2,323')
 assert.match(host.querySelector('.map-geographic-context')!.textContent!,/capa de Perú.*no es una desagregación exacta/)
 await choose(host,'[aria-label="Ámbito geográfico"]','PE-01')
 assert.equal(runtime.maps.length,1)
 assert.notDeepEqual((map.sources['celdas-observadas'].data as CellsData),observed)
 assert.equal(host.querySelector('.map-observed-value')!.textContent,monthly.find(r=>r.region_id==='PE-01'&&r.year===2024&&r.month===9&&r.sensor_group==='MODIS')!.cell_days!.toLocaleString('es-PE'))
 await click(host,'VIIRS');assert.equal(new URLSearchParams(window.location.search).get('calendarSeries'),'VIIRS')
 assert.equal(host.querySelector('.map-cell-detail'),null)
})
test('año nacional parcial, navegación de año/mes/sensor, no publicado y ceros regionales',async t=>{
 const fetch=mockFiles(t);const {host,runtime}=await setup(t,'/mapa?mapRegion=PE&periodYear=2026&scope=year')
 assert.match(host.querySelector('.map-observed')!.textContent!,/Año parcial.*7\/12/)
 assert.equal(host.querySelector('.map-observed-value')!.textContent,regionalSummary(monthly,{region:'PE',year:2026,month:7,sensor:'MODIS',scope:'year'}).value!.toLocaleString('es-PE'))
 await click(host,'Mensual');await choose(host,'[aria-label="Mes del mapa"]','8')
 assert.match(host.querySelector('.map-observed')!.textContent!,/Período no publicado/)
 assert.equal((runtime.maps[0].sources[SUMMARY_SOURCE].data as SummaryPoints).features.length,0)
 await choose(host,'[aria-label="Año del mapa"]','2024')
 assert.equal(fetch.mock.calls.filter(call=>String(call.arguments[0]).includes('/data/peru/cells_')).length,2)
 assert.equal(runtime.maps[0].removed,1)
 await choose(host,'[aria-label="Ámbito geográfico"]','PE-07');await choose(host,'[aria-label="Mes del mapa"]','9')
 assert.equal(host.querySelector('.map-observed-value')!.textContent,'0')
 assert.match(host.querySelector('.map-observed')!.textContent!,/Cero válido/)
})
test('proyección de Método usa resultados precisos por región y no κ nacional para B1 PE',()=>{
 const pe=regionalMethod(method,validation,'PE')
 assert.equal(pe.info!.kappa,undefined)
 assert.equal(pe.metrics!.methods.B1!.metrics.wape,(validation.regions.find(r=>r.region_id==='PE') as {methods:NonNullable<typeof pe.metrics>['methods']}).methods.B1!.metrics.wape)
 const uca=regionalMethod(method,validation,'PE-25');assert.equal(uca.info!.kappa,0.2936037257560573)
 assert.equal(uca.info!.resultados!.valid!.B1.wape,.178)
 assert.equal(regionalMethod(method,validation,'PE-07').info!.kappa,method.estratos.agrupado.kappa)
 assert.deepEqual(regionalMethod(method,validation,'PE-07').metrics!.methods,{})
})
test('Método PE distingue PE-SIN-25 y muestra serie calibrada recibida sin recalcular',async t=>{
 mockFiles(t);const {host}=await setup(t,'/metodo?mapRegion=PE')
 assert.equal(host.querySelector('.method-scope > strong')!.textContent,'PE')
 assert.equal(host.querySelector('.method-formula .method-equation'),null)
 assert.match(host.querySelector('[aria-label="Contexto científico regional"]')!.textContent!,/suma.*25 departamentos/)
 const clean=validation.regions.find(r=>r.region_id==='PE-SIN-25')!
 assert.ok(clean.reportable)
 assert.match(host.querySelector('[aria-label="Prueba PE-SIN-25"]')!.textContent!,new RegExp((clean.methods.B1!.metrics.wape!*100).toFixed(1)))
 assert.equal(host.querySelector('[aria-label="Ámbito geográfico"] option[value="PE-SIN-25"]'),null)
 const rows=host.querySelector('[aria-label="Serie calibrada regional"]')!
 assert.equal(rows.querySelectorAll('tbody tr').length,24)
 const value=calibrated.filter(r=>r.region_id==='PE').sort((a,b)=>a.year-b.year||a.month-b.month||a.method.localeCompare(b.method)).at(-1)!.value
 assert.ok(rows.querySelector(`[title="${value}"]`))
})
test('Método regional reportable, no reportable, cambio de etapa y observaciones accesibles',async t=>{
 mockFiles(t);const {host}=await setup(t,'/metodo?mapRegion=PE-25')
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'30.8%')
 await click(host,'Validación');assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'17.8%')
 await choose(host,'[aria-label="Ámbito geográfico"]','PE-07')
 assert.match(host.querySelector('.method-scope')!.textContent!,/Callao/)
 assert.match(host.querySelector('[aria-label="Contexto científico regional"]')!.textContent!,/Prueba no reportable.*Σ MODIS en test = 0/)
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'No disponible')
 assert.ok(host.querySelector('nav a[href*="calendario"]'))
})
test('popup nacional nunca traduce cell_days a días distintos de una celda de 10 km',()=>{
 const popup=cellPopup({cell_id:'TEST',year:2024,month:9,sensor_group:'MODIS',cell_days:84},{national:true})
 assert.equal(popup.querySelector('strong')!.textContent,'84 días-celda de 1 km')
 assert.match(popup.textContent!,/No son días distintos de la celda de 10 km ni un total departamental/)
})


test('respuesta tardía de Método no cambia la región actual ni sus resultados',async t=>{
 let release:((value:Response)=>void)|undefined,signal:AbortSignal|undefined
 t.mock.method(globalThis,'fetch',(url:string,options?:RequestInit)=>{
  if(url==='/data/peru/validation.json'&&new URLSearchParams(window.location.search).get('mapRegion')==='PE-25'){
   signal=options?.signal??undefined;return new Promise<Response>(resolve=>{release=resolve})
  }
  return Promise.resolve(new Response(files[url]))
 })
 const {host}=await mount(t,'/metodo?mapRegion=PE-25',createElement(MethodPage),'peru')
 assert.ok(release);assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'No disponible')
 await act(async()=>{window.history.pushState(null,'','/metodo?mapRegion=PE-01');window.dispatchEvent(new dom.window.PopStateEvent('popstate'))})
 assert.equal(signal?.aborted,true)
 const row=validation.regions.find(r=>r.region_id==='PE-01')!;assert.ok(row.reportable)
 const expected=`${(row.methods.B1!.metrics.wape!*100).toFixed(1)}%`
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,expected)
 await act(async()=>release!(new Response(files['/data/peru/validation.json'])))
 assert.equal(host.querySelector('.method-scope > strong')!.textContent,'PE-01')
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,expected)
})
test('GeoJSON nacional tardío no reemplaza el año actual tras cambiar de período',async t=>{
 let release:((value:Response)=>void)|undefined,signal:AbortSignal|undefined
 t.mock.method(globalThis,'fetch',(url:string,options?:RequestInit)=>{
  if(url.endsWith('cells_PE_2024.geojson')){signal=options?.signal??undefined;return new Promise<Response>(resolve=>{release=resolve})}
  return Promise.resolve(new Response(files[url]))
 })
 const {host,runtime}=await setup(t)
 assert.ok(release);assert.equal(runtime.maps.length,0)
 await act(async()=>{window.history.pushState(null,'','/mapa?mapRegion=PE-25&periodYear=2026&periodMonth=7&scope=month');window.dispatchEvent(new dom.window.PopStateEvent('popstate'))})
 assert.equal(signal?.aborted,true)
 assert.equal((runtime.maps[0].sources['celdas-observadas'].data as CellsData).features[0].properties.year,2026)
 await act(async()=>release!(new Response(files['/data/peru/cells_PE_2024.geojson'])))
 assert.equal((runtime.maps[0].sources['celdas-observadas'].data as CellsData).features[0].properties.year,2026)
 assert.equal(host.querySelector('.map-observed-value')!.textContent,regionalSummary(monthly,{region:'PE-25',year:2026,month:7,sensor:'MODIS',scope:'month'}).value!.toLocaleString('es-PE'))
})
test('métricas regionales null y serie calibrada no disponible conservan el resto de Método',async t=>{
 const changed=JSON.parse(files['/data/peru/validation.json'])
 changed.regions.find((r:{region_id:string})=>r.region_id==='PE-01').methods.B1.metrics.wape=null
 mockFiles(t,{'/data/peru/validation.json':JSON.stringify(changed),'/data/peru/calibrated_series.csv':'invalid'})
 const {host}=await setup(t,'/metodo?mapRegion=PE-01')
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,'No disponible')
 assert.match(host.querySelector('[role="alert"]')!.textContent!,/calibrated_series.csv/)
 assert.ok(host.querySelector('.method-definition'))
 await click(host,'Validación')
 assert.equal(host.querySelector('.method-wape--B1 strong')!.textContent,`${(method.resultados.valid['PE-01'].B1.wape!*100).toFixed(1)}%`)
})
