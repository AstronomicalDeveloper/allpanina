import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, createElement, StrictMode } from 'react'
import MapPage from '../src/pages/map/MapPage'
import { cellPopup } from '../src/services/data/map'
import type { CellsData } from '../src/types/data'
import type { MapRuntime } from '../src/pages/map/cartography/mapRuntime'
import { dom, files, mockFiles, mount, fakeRuntime, choose, click } from './uiHarness'
const setup=async(t:Parameters<typeof mockFiles>[0],query='?data=demo&periodYear=2024&periodMonth=8&scope=month')=>{
 const runtime=fakeRuntime();const result=await mount(t,'/mapa'+query,createElement(MapPage,{runtimeLoader:runtime.loader}));return {...result,runtime}
}

test('v2 cartografía conserva popup seguro con texto potencialmente malicioso',()=>{
 const data=JSON.parse(files['/data/demo/cells_PE-DEMO_2024.geojson']) as CellsData
 const popup=cellPopup({...data.features[0].properties,cell_id:'<img src=x onerror=alert(1)>'})
 assert.equal(popup.querySelector('img'),null);assert.match(popup.textContent!,/<img/)
})
test('v2 cartografía permite seleccionar con teclado y limpia al cambiar mes',async t=>{
 mockFiles(t);const {host}=await setup(t)
 await choose(host,'[aria-label="Seleccionar celda del mapa"]','DEMO-cell-001')
 assert.match(host.querySelector('.map-cell-detail')!.textContent!,/3 days with thermal detections/)
 await choose(host,'[aria-label="Map month"]','9');assert.equal(host.querySelector('.map-cell-detail'),null)
 assert.match(host.querySelector('.map-observed')!.textContent!,/Valid zero/)
})
test('v2 cartografía rechaza GeoJSON corrupto en lugar de dibujar parcialmente',async t=>{
 const data=JSON.parse(files['/data/demo/cells_PE-DEMO_2024.geojson']);data.features[0].properties.month=13
 mockFiles(t,{'/data/demo/cells_PE-DEMO_2024.geojson':JSON.stringify(data)})
 const {host,runtime}=await setup(t);assert.match(host.querySelector('[role="alert"]')!.textContent!,/month/);assert.equal(runtime.maps.length,0)
})
test('v2 región sin producto no solicita GeoJSON ni interpreta ausencia como cero',async t=>{
 const fetch=mockFiles(t);const {host}=await setup(t,'?mapRegion=OTRA&periodYear=2024')
 assert.match(host.querySelector('.map-observed')!.textContent!,/No GeoJSON is published/)
 assert.ok(fetch.mock.calls.every(call=>!String(call.arguments[0]).endsWith('.geojson')))
})
test('v2 errores de WebGL o worker se muestran sin ocultar el contexto científico',async t=>{
 mockFiles(t);const {host}=await mount(t,'/mapa?data=demo&periodYear=2024',createElement(MapPage,{runtimeLoader:async()=>{throw new Error('worker falló')}}))
 assert.match(host.querySelector('[role="alert"]')!.textContent!,/worker falló/)
 assert.match(host.querySelector('.map-context')!.textContent!,/DEMO DATA/)
})
test('v2 pérdida de contexto WebGL permite reintentar sin perder observaciones',async t=>{
 mockFiles(t);const {host,runtime}=await setup(t)
 await act(async()=>runtime.maps[0].canvas.dispatchEvent(new dom.window.Event('webglcontextlost',{cancelable:true})))
 assert.match(host.querySelector('[role="alert"]')!.textContent!,/contexto WebGL/)
 await click(host,'Retry map');assert.equal(runtime.maps[0].removed,1);assert.equal(runtime.maps.length,2)
 assert.equal(host.querySelector('[role="alert"]'),null)
})
test('v2 fullscreen mantiene aviso DEMO y no modifica el scroll global',async t=>{
 mockFiles(t);const {host}=await setup(t);const workspace=host.querySelector<HTMLElement>('.map-workspace')!
 const before=document.body.style.overflow
 Object.defineProperty(workspace,'requestFullscreen',{configurable:true,value:async()=>{
 Object.defineProperty(document,'fullscreenElement',{configurable:true,value:workspace});document.dispatchEvent(new dom.window.Event('fullscreenchange'))
 }})
 t.after(()=>Object.defineProperty(document,'fullscreenElement',{configurable:true,value:null}))
 await click(host,'Full screen');assert.ok(host.querySelector('.map-workspace--fullscreen'))
 assert.match(host.querySelector('.map-context')!.textContent!,/DEMO DATA/);assert.equal(document.body.style.overflow,before)
})
test('v2 desmontaje en StrictMode libera mapa y popup; runtime tardío no crea instancia',async t=>{
 mockFiles(t);const runtime=fakeRuntime()
 const {root}=await mount(t,'/mapa?data=demo&periodYear=2024',createElement(StrictMode,null,createElement(MapPage,{runtimeLoader:runtime.loader})))
 await act(async()=>root.render(null));assert.ok(runtime.maps.every(map=>map.removed===1));assert.ok(runtime.popups.every(popup=>popup.removed))
 let resolve:((runtime:MapRuntime)=>void)|undefined
 const delayed=await mount(t,'/mapa?data=demo&periodYear=2024',createElement(MapPage,{runtimeLoader:()=>new Promise(done=>{resolve=done})}))
 await act(async()=>delayed.root.render(null));const late=fakeRuntime();await act(async()=>resolve!(await late.loader()));assert.equal(late.maps.length,0)
})
test('v2 anual con meses publicados sin detecciones conserva cero sin rellenar faltantes',async t=>{
 const csv='region_id,year,month,sensor_group,cell_days,status,source_version,updated_at\nPE-DEMO,2024,8,MODIS,0,ok,DEMO,2026-11-14\nPE-DEMO,2024,9,MODIS,,missing,DEMO,2026-11-14\n'
 mockFiles(t,{'/data/demo/monthly_series.csv':csv,'/data/demo/cells_PE-DEMO_2024.geojson':'{"type":"FeatureCollection","features":[]}'})
 const {host}=await setup(t,'?data=demo&periodYear=2024&scope=year')
 assert.match(host.querySelector('.map-observed')!.textContent!,/Valid zero/);assert.match(host.querySelector('.map-observed')!.textContent!,/1\/12/)
 await click(host,'Monthly');await choose(host,'[aria-label="Map month"]','9');assert.match(host.querySelector('.map-observed')!.textContent!,/No usable data/)
})
test('v2 overlays y opacidad actualizan la instancia existente de Juan',async t=>{
 mockFiles(t);const {host,runtime}=await setup(t)
 const checkbox=host.querySelector<HTMLInputElement>('.map-overlays input')!
 await act(async()=>checkbox.click());assert.equal(runtime.maps[0].layouts['graticule-grid-layer:visibility'],'visible')
 const slider=host.querySelector<HTMLInputElement>('[aria-label="Cell opacity"]')!
 await act(async()=>{slider.value='0.5';slider.dispatchEvent(new dom.window.Event('change',{bubbles:true}))})
 assert.equal(runtime.maps.length,1)
 await click(host,'Zoom to scope');assert.ok(runtime.maps[0].fitted)
})
test('C5 el mapa explica día-celda y contextualiza la celda seleccionada',async t=>{
 mockFiles(t);const {host}=await setup(t)
 assert.match(host.querySelector('.cell-days-help')!.textContent!,/How to read a cell's value/)
 await choose(host,'[aria-label="Seleccionar celda del mapa"]','DEMO-cell-001')
 assert.match(host.querySelector('.map-cell-context')!.textContent!,/\d+ of \d+ cells with records have more cell-days than this one\. The maximum is \d+/)
})
test('piloto conserva la capa de áreas protegidas de Ucayali',async t=>{
 mockFiles(t);const {host}=await setup(t,'?periodYear=2024&periodMonth=9&scope=month')
 assert.match(host.querySelector('.map-overlays')!.textContent!,/Protected natural areas · Peru/)
})
test('errores del mapa muestran un mensaje comprensible y dejan el detalle técnico plegado',async t=>{
 const data=JSON.parse(files['/data/demo/cells_PE-DEMO_2024.geojson']);data.features[0].properties.month=13
 mockFiles(t,{'/data/demo/cells_PE-DEMO_2024.geojson':JSON.stringify(data)})
 const {host}=await setup(t);const alert=host.querySelector('[role="alert"]')!
 const detail=alert.querySelector<HTMLDetailsElement>('details.technical-detail')!
 assert.equal(detail.open,false);assert.match(detail.textContent!,/month/)
 assert.doesNotMatch([...alert.querySelectorAll('h2, p')].map(node=>node.textContent).join(' '),/month/)
})
