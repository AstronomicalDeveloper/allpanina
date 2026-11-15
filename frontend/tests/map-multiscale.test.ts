import assert from 'node:assert/strict'
import { test } from 'node:test'
import { act, createElement } from 'react'
import { createExpression, validateStyleMin } from '@maplibre/maplibre-gl-style-spec'
import { prepareSummaryPoints, representativePoint } from '../src/services/data/mapSymbols'
import { buildMapYear } from '../src/services/data/mapExploration'
import { filterCells } from '../src/services/data/map'
import { parseMonthlySeries, validateCells } from '../src/services/data/validators'
import { summarySource, summaryLayers, localOpacity, symbolOpacity, outlineWidth, SUMMARY_SOURCE, POINT_LAYER, LOCAL_ZOOM, SQUARE_IMAGE, squareImage } from '../src/pages/map/cartography/multiscaleLayers'
import { createJuanMap } from '../src/pages/map/cartography/mapConstruction'
import MapPage from '../src/pages/map/MapPage'
import { files, mockFiles, mount, fakeRuntime, choose, click } from './uiHarness'
const data=validateCells(JSON.parse(files['/data/cells_PE-UCA_2024.geojson']))
const monthly=parseMonthlySeries(files['/data/monthly_series.csv'])
const period={region:'PE-UCA',year:2024,month:9,sensor:'MODIS' as const,scope:'month' as const}
const cells=filterCells(data,period)
const points=prepareSummaryPoints(cells,period)
function evaluate(expression:unknown,properties:Record<string,unknown>,zoom=0,accumulated:unknown=null) {
 const parsed=createExpression(expression, 'layers[0].paint.circle-color');assert.equal(parsed.result,'success')
 if(parsed.result!=='success')throw new Error('Invalid expression')
 return parsed.value.evaluate({zoom,accumulated} as never,{type:1,properties} as never)
}
test('resumen real genera una posición por celda sin mutar geometrías ni valores',()=>{
 const before=structuredClone(cells)
 assert.equal(points.features.length,cells.features.length)
 assert.equal(new Set(points.features.map(f=>f.properties.cell_id)).size,cells.features.length)
 assert.equal(points.features.reduce((sum,f)=>sum+f.properties.cell_days,0),2323)
 assert.deepEqual(cells,before)
 for(const f of points.features){assert.equal(f.properties.region_id,'PE-UCA');assert.equal(f.properties.sensor_group,'MODIS');assert.equal(f.properties.month,9);assert.equal(f.geometry.type,'Point')}
})
test('fuente sin agrupación conserva todas las celdas individuales y su suma',()=>{
 const source=summarySource(points)
 assert.equal(source.cluster,false)
 assert.equal(source.clusterProperties,undefined)
 assert.deepEqual(source.data,points)
 assert.equal(points.features.reduce((sum,f)=>sum+f.properties.cell_days,0),2323)
 const layers=summaryLayers(.85,{q25:1,q50:2,q75:3})
 assert.equal(layers.length,1);assert.equal(layers[0].type,'symbol')
 assert.equal((layers[0] as {layout:Record<string,unknown>}).layout['icon-allow-overlap'],true)
 assert.ok(layers.every(layer=>layer.type!=='circle'))
})
test('resumen separa sensores y meses y agrega el anual sin duplicar celdas',()=>{
 const viirs=prepareSummaryPoints(filterCells(data,{...period,sensor:'VIIRS'}),{...period,sensor:'VIIRS'})
 assert.equal(viirs.features.reduce((s,f)=>s+f.properties.cell_days,0),5581)
 const model=buildMapYear(data,period,monthly)
 const annual=prepareSummaryPoints(model.annual.MODIS,{...period,scope:'year'})
 assert.equal(new Set(annual.features.map(f=>f.properties.cell_id)).size,annual.features.length)
 assert.equal(annual.features.reduce((s,f)=>s+f.properties.cell_days,0),monthly.filter(r=>r.year===2024&&r.sensor_group==='MODIS').reduce((s,r)=>s+r.cell_days!,0))
 assert.ok(annual.features.every(f=>f.properties.month===null))
 assert.throws(()=>prepareSummaryPoints(cells,{...period,sensor:'VIIRS'}),/mezclar/)
 assert.throws(()=>prepareSummaryPoints(cells,{...period,month:8}),/mezclar/)
 assert.throws(()=>prepareSummaryPoints({...cells,features:[cells.features[0],cells.features[0]]},period),/repetida/)
})
test('vacío y cero válido no producen agrupaciones ni valores de reemplazo',()=>{
 const empty=prepareSummaryPoints({type:'FeatureCollection',features:[]},period)
 assert.deepEqual(empty.features,[])
 const zero=structuredClone(cells);zero.features=[zero.features[0]];zero.features[0].properties.cell_days=0
 assert.equal(prepareSummaryPoints(zero,period).features[0].properties.cell_days,0)
})
test('estilo muestra cuadrados lejos y polígonos cerca con la misma escala y sin solaparlos',()=>{
 const breaks={q25:1,q50:2,q75:3},layer=summaryLayers(.85,breaks)[0]
 assert.equal(layer.maxzoom,LOCAL_ZOOM)
 assert.equal(evaluate(outlineWidth,{},6),0);assert.ok(evaluate(outlineWidth,{},13)<1)
 assert.equal(localOpacity(.85),.85)
 assert.equal(evaluate(symbolOpacity(.85),{},LOCAL_ZOOM),0)
 assert.equal(evaluate(symbolOpacity(.85),{},6),.85)
 assert.equal((layer as {layout:Record<string,unknown>}).layout['icon-image'],SQUARE_IMAGE)
 const image=squareImage();assert.equal(image.data.length,image.width*image.height*4)
 assert.ok(image.data[((16*32+16)*4)+3]>image.data[3])
})
test('punto representativo respeta celdas cóncavas, agujeros y MultiPolygon',()=>{
 const concave={type:'Polygon' as const,coordinates:[[[0,0],[4,0],[4,1],[1,1],[1,4],[0,4],[0,0]]] as [number,number][][]}
 const [x,y]=representativePoint(concave);assert.ok(x>0&&y>0&&(x<1||y<1))
 const hole={type:'Polygon' as const,coordinates:[[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[1,3],[3,3],[3,1],[1,1]]] as [number,number][][]}
 const [hx,hy]=representativePoint(hole);assert.ok(hx>0&&hx<4&&hy>0&&hy<4);assert.ok(hx<1||hx>3||hy<1||hy>3)
 const [mx,my]=representativePoint({type:'MultiPolygon',coordinates:[concave.coordinates,hole.coordinates.map(ring=>ring.map(([a,b])=>[a+10,b] as [number,number]))]})
 assert.ok((mx<4&&my<4)||(mx>10&&mx<14&&my<4))
})
test('UI zoom no reconstruye fuentes y permite inspeccionar cuadrados individuales',async t=>{
 mockFiles(t);const runtime=fakeRuntime();const {host}=await mount(t,'/mapa?periodYear=2024&periodMonth=9&scope=month',createElement(MapPage,{runtimeLoader:runtime.loader}))
 const map=runtime.maps[0],source=map.sources[SUMMARY_SOURCE]
 let writes=0;const original=source.setData;source.setData=value=>{writes++;original(value)}
 await act(async()=>{map.zoom=5;map.emit('zoomend');map.emit('moveend')})
 assert.equal(writes,0);assert.match(host.querySelector('.map-legend')!.textContent!,/cuadrados individuales/)
 const id=cells.features[0].properties.cell_id
 await act(async()=>map.emit(`click:${POINT_LAYER}`,{features:[{properties:{cell_id:id}}]}))
 assert.match(host.querySelector('.map-cell-detail')!.textContent!,new RegExp(id))
 await act(async()=>map.emit(`mousemove:${POINT_LAYER}`,{features:[{properties:{cell_id:id}}],lngLat:{lng:-74,lat:-8}}))
 assert.match(runtime.popups[0].content!.textContent!,new RegExp(id))
 await act(async()=>{map.zoom=11;map.emit('zoomend')})
 assert.match(host.querySelector('.map-legend')!.textContent!,/Close view/)
 await choose(host,'[aria-label="Seleccionar celda del mapa"]',id)
 assert.match(host.querySelector('.map-cell-detail')!.textContent!,new RegExp(id))
 await click(host,'VIIRS');assert.equal(host.querySelector('.map-cell-detail'),null)
 assert.equal((source.data as typeof points).features.reduce((s,f)=>s+f.properties.cell_days,0),5581)
 assert.equal(runtime.maps.length,1)
})
test('año parcial y períodos no publicados mantienen cobertura sin valores de reemplazo',async t=>{
 mockFiles(t);const runtime=fakeRuntime();const {host}=await mount(t,'/mapa?periodYear=2026&scope=year',createElement(MapPage,{runtimeLoader:runtime.loader}))
 assert.match(host.querySelector('.map-observed')!.textContent!,/Partial year.*7\/12/)
 const map=runtime.maps[0]
 assert.equal((map.sources[SUMMARY_SOURCE].data as typeof points).features.reduce((s,f)=>s+f.properties.cell_days,0),monthly.filter(r=>r.year===2026&&r.sensor_group==='MODIS').reduce((s,r)=>s+r.cell_days!,0))
 await click(host,'Monthly');await choose(host,'[aria-label="Map month"]','8')
 assert.equal((map.sources[SUMMARY_SOURCE].data as typeof points).features.length,0)
 assert.match(host.querySelector('.map-observed')!.textContent!,/Period not published/)
})


test('MapLibre acepta el estilo completo y conserva los polígonos y fuentes de Juan',async()=>{
 const runtime=fakeRuntime()
 createJuanMap(await runtime.loader(),document.createElement('div'),cells,{q25:1,q50:2,q75:3},.85,points)
 const map=runtime.maps[0]
 assert.deepEqual(validateStyleMin(map.style as never),[])
 for(const id of ['basemap-blue-marble','basemap-topographic','basemap-firefly','basemap-streets','celdas-observadas',SUMMARY_SOURCE])assert.ok(map.sources[id])
 const polygon=map.layers.find(layer=>layer.id==='celdas-fill') as unknown as {minzoom:number;paint:Record<string,unknown>}
 const symbol=map.layers.find(layer=>layer.id===POINT_LAYER) as unknown as {maxzoom:number;paint:Record<string,unknown>}
 assert.equal(polygon.minzoom,LOCAL_ZOOM)
 assert.equal(symbol.maxzoom,polygon.minzoom)
 assert.deepEqual(symbol.paint['icon-color'],polygon.paint['fill-color'])
 await Promise.resolve() // The image is installed by the map load event.
 assert.ok(runtime.maps[0].images.has(SQUARE_IMAGE))
 assert.deepEqual(map.sources['celdas-observadas'].data,cells)
})
