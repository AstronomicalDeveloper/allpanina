import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, createElement } from 'react'
import { cellPopup } from '../src/services/data/map'
import MapPage from '../src/pages/map/MapPage'
import { POINT_LAYER } from '../src/pages/map/cartography/multiscaleLayers'
import type { CellsData } from '../src/types/data'
import { files, mockFiles, mount, fakeRuntime, click } from './uiHarness'

test('popup mensual tiene título comprensible, fecha, días e identificador secundario',()=>{
 const data=JSON.parse(files['/data/cells_PE-UCA_2024.geojson']) as CellsData
 const cell=data.features.find(f=>f.properties.cell_days===2)!.properties
 const popup=cellPopup(cell)
 assert.equal(popup.querySelector('h3')!.textContent,'Satellite observation')
 assert.equal(popup.querySelector('strong')!.textContent,'2 days')
 assert.match(popup.textContent!,/2024.*With thermal detections.*selected month/)
 assert.match(popup.querySelector('small')!.textContent!,new RegExp(cell.cell_id))
 assert.match(popup.textContent!,/This is not a number of fires/)
 assert.doesNotMatch(popup.querySelector('h3')!.textContent!,new RegExp(cell.cell_id))
 const zero=cellPopup({...cell,cell_days:0})
 assert.equal(zero.querySelector('strong')!.textContent,'0 days')
 assert.match(zero.textContent!,/No thermal detections.*A recorded zero does not prove there was no fire/)
})
test('popup anual explica suma no consecutiva y cobertura parcial sin inventar disponibilidad',()=>{
 const cell={cell_id:'TEST',year:2026,sensor_group:'VIIRS' as const,cell_days:20}
 const popup=cellPopup(cell,{coveredMonths:7})
 assert.match(popup.textContent!,/Year 2026.*20 days.*available months.*They need not be consecutive.*Partial year.*7\/12/)
 assert.doesNotMatch(cellPopup(cell).textContent!,/Complete year|Partial year/)
 assert.match(cellPopup(cell,{coveredMonths:12}).textContent!,/Complete year/)
})
test('selección táctil de un cuadrado abre popup y conserva inspector anual de doce meses',async t=>{
 mockFiles(t);const runtime=fakeRuntime();const {host}=await mount(t,'/mapa?periodYear=2026&scope=year',createElement(MapPage,{runtimeLoader:runtime.loader}))
 const data=runtime.maps[0].sources['celdas-observadas'].data as CellsData
 const cell=data.features[0].properties
 await act(async()=>runtime.maps[0].emit(`mousemove:${POINT_LAYER}`,{features:[{properties:{cell_id:cell.cell_id}}],lngLat:{lng:-74,lat:-8}}))
 assert.equal(runtime.popups[0].content, null, 'hover alone must not open a popup')
 await act(async()=>runtime.maps[0].emit(`click:${POINT_LAYER}`,{point:{x:100,y:100},features:[{properties:{cell_id:cell.cell_id}}],lngLat:{lng:-74,lat:-8}}))
 assert.match(runtime.popups[0].content!.textContent!,/Satellite observation.*Partial year.*7\/12/)
 await act(async()=>runtime.maps[0].emit(`mousemove:${POINT_LAYER}`,{features:[{properties:{cell_id:cell.cell_id}}],lngLat:{lng:-74,lat:-8}}))
 assert.equal(runtime.popups[0].removed, false, 'the clicked cell keeps the popup')
 await act(async()=>runtime.maps[0].emit(`mouseleave:${POINT_LAYER}`,{point:{x:110,y:110}}))
 assert.equal(runtime.popups[0].removed, false, 'leaving the cell gives time to reach its content')
 await act(async()=>{ await new Promise(resolve=>setTimeout(resolve,700)) })
 assert.equal(runtime.popups[0].removed, false, 'small movements stay within the tolerance area')
 await act(async()=>runtime.maps[0].emit('mousemove',{point:{x:500,y:500},lngLat:{lng:-74,lat:-8}}))
 await act(async()=>runtime.popups[0].getElement().dispatchEvent(new window.Event('pointerenter')))
 await act(async()=>{ await new Promise(resolve=>setTimeout(resolve,700)) })
 assert.equal(runtime.popups[0].removed, false, 'reading the popup keeps it open')
 await act(async()=>runtime.popups[0].getElement().dispatchEvent(new window.Event('pointerleave')))
 await act(async()=>{ await new Promise(resolve=>setTimeout(resolve,700)) })
 assert.equal(runtime.popups[0].removed, true, 'leaving both areas dismisses the popup after a grace period')
 assert.equal(host.querySelectorAll('.map-month-bars tbody tr').length,12)
 assert.match(host.querySelector('.map-annual-detail')!.textContent!,/They need not be consecutive.*Partial year/)
 assert.match(host.querySelector('.map-cell-detail')!.textContent!,/Cell identifier/)
})
test('Descripción regional diferencia días-celda acumulados de días de una sola celda',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?periodYear=2025&periodMonth=12')
 const detail=host.querySelector('#calendar-detail')!
 assert.equal(detail.querySelector('#calendar-detail-title')!.textContent,'December 2025')
 assert.match(detail.textContent!,/Ucayali.*MODIS.*90.*cell-days/)
 assert.match(detail.textContent!,/Observed.*each cell.*It is not a number of fires, nor a number of distinct days/)
 assert.ok(detail.querySelector('.calendar-map-action'))
 assert.equal(detail.querySelector<HTMLDetailsElement>('.calendar-technical')!.open,false)
 assert.match(detail.textContent!,/source_version.*updated_at/)
})
test('Descripción adapta cero, faltante y no publicado sin presentar un cero inventado',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendar?data=demo&periodYear=2024')
 await click(host,'September 2024, MODIS: 0 cell-days (observed zero)')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/Observed zero.*No thermal detections were recorded.*A recorded zero does not prove there was no fire/)
 await click(host,'October 2024, MODIS: no usable data')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'—')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/No usable data.*There is no usable value.*It is not replaced with zero/)
 await click(host,'November 2024, MODIS: not published')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/Not published.*No record has been published.*This is not the same as zero/)
})
test('ayuda de días-celda funciona como desplegable nativo en la leyenda del Calendario',async t=>{
 mockFiles(t);const {host}=await mount(t)
 const help=host.querySelector<HTMLDetailsElement>('.calendar-legend .calendar-cell-days-help')!
 assert.ok(help);assert.equal(help.open,false)
 await act(async()=>help.querySelector('summary')!.click());assert.equal(help.open,true)
 assert.match(help.textContent!,/three cell-days.*ten cells.*ten cell-days.*not a number of fires/)
 await act(async()=>help.querySelector('summary')!.click());assert.equal(help.open,false)
})
test('leyenda del Mapa explica percentiles y símbolos sin cambiar su clasificación',async t=>{
 mockFiles(t);const runtime=fakeRuntime();const {host}=await mount(t,'/mapa?periodYear=2024&periodMonth=9&scope=month',createElement(MapPage,{runtimeLoader:runtime.loader}))
 const legend=host.querySelector('.map-legend')!
 assert.match(legend.textContent!,/percentiles/);assert.equal(legend.querySelectorAll('ol li').length,4)
 const reading=host.querySelector('.map-tab--information .map-reading')!
 assert.match(reading.textContent!,/enlarged and does not show the area covered/)
 assert.match(reading.textContent!,/does not measure severity, risk or burned area/)
 assert.ok(host.querySelector('.map-tab--information .cell-days-help'))
})
