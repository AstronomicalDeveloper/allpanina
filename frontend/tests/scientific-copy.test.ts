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
 assert.equal(popup.querySelector('h3')!.textContent,'Observación satelital')
 assert.equal(popup.querySelector('strong')!.textContent,'2 días')
 assert.match(popup.textContent!,/de 2024.*Con detecciones térmicas.*mes seleccionado/)
 assert.match(popup.querySelector('small')!.textContent!,new RegExp(cell.cell_id))
 assert.match(popup.textContent!,/No equivale a ese número de incendios/)
 assert.doesNotMatch(popup.querySelector('h3')!.textContent!,new RegExp(cell.cell_id))
 const zero=cellPopup({...cell,cell_days:0})
 assert.equal(zero.querySelector('strong')!.textContent,'0 días')
 assert.match(zero.textContent!,/Sin detecciones.*Cero registrado no demuestra ausencia de fuego/)
})
test('popup anual explica suma no consecutiva y cobertura parcial sin inventar disponibilidad',()=>{
 const cell={cell_id:'TEST',year:2026,sensor_group:'VIIRS' as const,cell_days:20}
 const popup=cellPopup(cell,{coveredMonths:7})
 assert.match(popup.textContent!,/Año 2026.*20 días.*meses disponibles.*No tienen que ser consecutivos.*Año parcial.*7\/12/)
 assert.doesNotMatch(cellPopup(cell).textContent!,/Año completo|Año parcial/)
 assert.match(cellPopup(cell,{coveredMonths:12}).textContent!,/Año completo/)
})
test('selección táctil de un cuadrado abre popup y conserva inspector anual de doce meses',async t=>{
 mockFiles(t);const runtime=fakeRuntime();const {host}=await mount(t,'/mapa?periodYear=2026&scope=year',createElement(MapPage,{runtimeLoader:runtime.loader}))
 const data=runtime.maps[0].sources['celdas-observadas'].data as CellsData
 const cell=data.features[0].properties
 await act(async()=>runtime.maps[0].emit(`click:${POINT_LAYER}`,{features:[{properties:{cell_id:cell.cell_id}}],lngLat:{lng:-74,lat:-8}}))
 assert.match(runtime.popups[0].content!.textContent!,/Observación satelital.*Año parcial.*7\/12/)
 assert.equal(host.querySelectorAll('.map-month-bars tbody tr').length,12)
 assert.match(host.querySelector('.map-annual-detail')!.textContent!,/No tienen que ser consecutivos.*Año parcial/)
 assert.match(host.querySelector('.map-cell-detail')!.textContent!,/Identificador de celda/)
})
test('Descripción regional diferencia días-celda acumulados de días de una sola celda',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?periodYear=2025&periodMonth=12')
 const detail=host.querySelector('#calendar-detail')!
 assert.equal(detail.querySelector('h3')!.textContent,'Diciembre de 2025')
 assert.match(detail.textContent!,/Ucayali, Perú.*MODIS.*90.*días-celda acumulados/)
 assert.match(detail.textContent!,/distintas celdas.*No equivale.*incendios ni de días distintos.*Dato disponible/)
 assert.ok(detail.querySelector('.calendar-map-action'))
 assert.equal(detail.querySelector<HTMLDetailsElement>('.calendar-technical')!.open,false)
 assert.match(detail.textContent!,/source_version.*updated_at/)
})
test('Descripción adapta cero, faltante y no publicado sin presentar un cero inventado',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?data=demo&periodYear=2024')
 await click(host,'Septiembre 2024, MODIS, 0 · válido')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/No se registraron detecciones.*cero registrado no demuestra ausencia.*cero válido/)
 await click(host,'Octubre 2024, MODIS, Sin datos')
 assert.equal(host.querySelector('.calendar-observed-value')!.textContent,'—')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/No hay un valor utilizable.*No se sustituye por cero.*Sin dato utilizable/)
 await click(host,'Noviembre 2024, MODIS, Ausente')
 assert.match(host.querySelector('#calendar-detail')!.textContent!,/No hay registro publicado.*No equivale a cero.*No publicado/)
})
test('ayuda reutilizable funciona como desplegable nativo en la leyenda del Calendario',async t=>{
 mockFiles(t);const {host}=await mount(t)
 const help=host.querySelector<HTMLDetailsElement>('.calendar-legend .cell-days-help')!
 assert.ok(help);assert.equal(help.open,false)
 await act(async()=>help.querySelector('summary')!.click());assert.equal(help.open,true)
 assert.match(help.textContent!,/tres días-celda.*Diez celdas.*diez días-celda.*No equivale a cantidad de incendios/)
 await act(async()=>help.querySelector('summary')!.click());assert.equal(help.open,false)
})
test('leyenda del Mapa explica percentiles y símbolos sin cambiar su clasificación',async t=>{
 mockFiles(t);const runtime=fakeRuntime();const {host}=await mount(t,'/mapa?periodYear=2024&periodMonth=9&scope=month',createElement(MapPage,{runtimeLoader:runtime.loader}))
 const legend=host.querySelector('.map-legend')!
 assert.match(legend.textContent!,/percentiles.*tamaño en pantalla está ampliado.*no representa área ocupada/)
 assert.match(legend.textContent!,/no mide gravedad, riesgo ni superficie quemada/)
 assert.equal(legend.querySelectorAll('ol li').length,4)
 assert.ok(legend.querySelector('.cell-days-help'))
})
