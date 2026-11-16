import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {gzipSync} from 'node:zlib'
import {test} from 'node:test'
import {act,createElement} from 'react'
import {buildMapYear} from '../src/services/data/mapExploration'
import {territorialClip} from '../src/services/data/territorialClip'
import {clipDepartmentCells,departmentSquares} from '../src/services/data/departmentCells'
import MapPage from '../src/pages/map/MapPage'
import ScopePicker from '../src/shell/ScopePicker'
import {departmentView,nationalNavigationBounds,validateDepartmentNavigation,loadDepartmentNavigation} from '../src/services/data/departmentNavigation'
import {DEPARTMENT_SOURCE,DEPARTMENT_SQUARE_SOURCE} from '../src/pages/map/cartography/departmentLayers'
import type {CellsData} from '../src/types/data'
import {files,mockFiles,mount,fakeRuntime,choose,click} from './uiHarness'
const bytes=await readFile(new URL('../public/cartography/departamentos_inei_2023.navigation.geojson',import.meta.url))
const navigation=validateDepartmentNavigation(JSON.parse(bytes.toString('utf8')))
const originalBytes=await readFile(new URL('../../tests/fixtures/region/departamentos_inei_2023.geojson',import.meta.url))
const original=JSON.parse(originalBytes.toString('utf8')) as {features:{properties:{region_id:string};geometry:CellsData['features'][number]['geometry']}[]}
files['/data/peru/cells_PE_2024.geojson']=await readFile(new URL('../public/data/peru/cells_PE_2024.geojson',import.meta.url),'utf8')
files['/data/peru/cells_PE_2026.geojson']=await readFile(new URL('../public/data/peru/cells_PE_2026.geojson',import.meta.url),'utf8')
function originalBounds(region:string):[[number,number],[number,number]] {
 let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity
 for(const f of original.features.filter(f=>region==='PE'||f.properties.region_id===region)){
  for(const polygon of f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates)for(const ring of polygon)for(const [x,y] of ring){west=Math.min(west,x);east=Math.max(east,x);south=Math.min(south,y);north=Math.max(north,y)}
 }
 return [[west,south],[east,north]]
}

test('recurso cartográfico conserva códigos y extensión originales, con reducción de descarga',()=>{
 assert.equal(navigation.features.length,25)
 assert.equal(navigation.source_sha256,createHash('sha256').update(originalBytes).digest('hex'))
 assert.equal(navigation.tolerance_metres,100)
 assert.ok(bytes.length<originalBytes.length/5)
 assert.ok(gzipSync(bytes).length<512*1024)
 assert.deepEqual(nationalNavigationBounds(navigation),originalBounds('PE'))
 for(const region of ['PE-07','PE-25','PE-16']) {
  assert.deepEqual(departmentView(navigation,region).bounds,originalBounds(region))
  assert.equal(departmentView(navigation,region).boundary.features[0].properties!.region_id,region)
 }
 assert.equal(navigation.features.find(f=>f.properties.region_id==='PE-07')!.properties.nombre,'CALLAO')
 assert.equal(navigation.features.find(f=>f.properties.region_id==='PE-16')!.properties.nombre,'LORETO')
})
test('límite territorial discreto; PE elimina el resaltado',()=>{
 const view=departmentView(navigation,'PE-07')
 assert.ok(!('mask' in view))
 assert.equal(view.boundary.features[0].properties!.region_id,'PE-07')
 const country=departmentView(navigation,'PE')
 assert.deepEqual(country.boundary.features,[])
 assert.throws(()=>departmentView(navigation,'PE-99'),/no disponible/)
 const malformed=structuredClone(navigation);malformed.features[0].properties.region_id='PE-07'
 assert.throws(()=>validateDepartmentNavigation(malformed),/inválidos/)
})
test('Callao se enfoca una vez; cámara manual y cambios de sensor/mes no fuerzan otro encuadre',async t=>{
 const fetch=mockFiles(t),runtime=fakeRuntime()
 const {host}=await mount(t,'/mapa?mapRegion=PE-07&periodYear=2024&periodMonth=9&scope=month',createElement('div',null,createElement(ScopePicker),createElement(MapPage,{runtimeLoader:runtime.loader})),'peru')
 const map=runtime.maps[0]
 assert.deepEqual(map.fitted,originalBounds('PE-07'))
 assert.equal(map.fits.length,1)
 assert.equal((map.sources[DEPARTMENT_SOURCE].data as typeof navigation).features[0].properties.region_id,'PE-07')
 const observations=map.sources['celdas-observadas'].data as CellsData
 assert.equal(host.querySelector('.map-observed-value')!.textContent,'0')
 assert.match(host.querySelector('.map-provenance')!.textContent!, /GeoJSON WGS84 · Peru · national coverage/)
 assert.ok(!host.textContent!.includes('Ver Perú completo'))
 const all=JSON.parse(files['/data/peru/cells_PE_2024.geojson']) as CellsData
 const period={...all,features:all.features.filter(f=>f.properties.month===9&&f.properties.sensor_group==='MODIS')}
 assert.deepEqual(observations,clipDepartmentCells(period,navigation.features.find(f=>f.properties.region_id==='PE-07')!))
 await act(async()=>{map.zoom=12;map.emit('zoomend');map.emit('moveend')})
 await click(host,'VIIRS');await choose(host,'[aria-label="Map month"]','8')
 assert.equal(map.fits.length,1)
 await click(host,'Zoom to scope');assert.deepEqual(map.fitted,originalBounds('PE-07'))
 await choose(host,'[aria-label="Area"]','PE-25')
 assert.deepEqual(map.fitted,originalBounds('PE-25'))
 assert.equal(runtime.maps.length,1)
 const ucayali=navigation.features.find(f=>f.properties.region_id==='PE-25')!
 const viirsAugust={...all,features:all.features.filter(f=>f.properties.month===8&&f.properties.sensor_group==='VIIRS')}
 const visible=clipDepartmentCells(viirsAugust,ucayali)
 assert.deepEqual(map.sources['celdas-observadas'].data,visible)
 await act(async()=>{map.zoom=8;map.emit('zoomend')})
 assert.deepEqual(map.sources['celdas-observadas'].data,visible)
 assert.ok((map.sources[DEPARTMENT_SQUARE_SOURCE].data as CellsData).features.length>0)
 assert.equal((map.sources[DEPARTMENT_SOURCE].data as typeof navigation).features[0].properties.region_id,'PE-25')
 await choose(host,'[aria-label="Area"]','PE-16')
 assert.deepEqual(map.fitted,originalBounds('PE-16'))
 await choose(host,'[aria-label="Area"]','PE')
 assert.deepEqual(map.fitted,originalBounds('PE'))
 assert.equal((map.sources[DEPARTMENT_SQUARE_SOURCE].data as {features:unknown[]}).features.length,0)
 assert.deepEqual(map.sources['celdas-observadas'].data,viirsAugust)
 await choose(host,'[aria-label="Area"]','PE-25')
 await choose(host,'[aria-label="Map year"]','2026')
 await choose(host,'[aria-label="Map month"]','7')
 const next=runtime.maps.at(-1)!
 const nextData=JSON.parse(files['/data/peru/cells_PE_2026.geojson']) as CellsData
 assert.deepEqual(next.sources['celdas-observadas'].data,clipDepartmentCells({...nextData,features:nextData.features.filter(f=>f.properties.month===7&&f.properties.sensor_group==='VIIRS')},ucayali))
 await click(host,'Yearly')
 assert.deepEqual(next.sources['celdas-observadas'].data,clipDepartmentCells(buildMapYear(nextData,{region:'PE',year:2026}).annual.VIIRS,ucayali))
 assert.ok(fetch.mock.calls.every(call=>!String(call.arguments[0]).includes('/docs/region/')))
})
test('catálogo de límites se reutiliza entre cargas; no depende de la región o año seleccionado',async t=>{
 const fetch=mockFiles(t)
 const [first,second]=await Promise.all([loadDepartmentNavigation(),loadDepartmentNavigation()])
 assert.equal(first,second)
 assert.ok(fetch.mock.calls.filter(call=>String(call.arguments[0]).startsWith('/cartography/')).length<=1)
 assert.deepEqual(nationalNavigationBounds(first),originalBounds('PE'))
})

test('recorte de frontera conserva valores completos, excluye exteriores y recorta cuadrados',()=>{
 const department={type:'Feature' as const,properties:{region_id:'PE-07',nombre:'Prueba',bounds:[0,0,2,2] as [number,number,number,number]},geometry:{type:'Polygon' as const,coordinates:[[[0,0],[2,0],[2,2],[0,2],[0,0]]]}}
 const feature=(id:string,x:number)=>({type:'Feature' as const,properties:{cell_id:id,cell_days:500,year:2024,month:9,sensor_group:'MODIS' as const},geometry:{type:'Polygon' as const,coordinates:[[[x,.5],[x+1,.5],[x+1,1.5],[x,1.5],[x,.5]]]}})
 const original={type:'FeatureCollection' as const,features:[feature('frontera',1.5),feature('fuera',3),feature('dentro',.25)]}
 const snapshot=JSON.stringify(original)
 const visible=clipDepartmentCells(original,department)
 assert.deepEqual(visible.features.map(f=>f.properties.cell_id),['frontera','dentro'])
 assert.equal(visible.features[0].properties,original.features[0].properties)
 assert.equal(visible.features[0].properties.cell_days,500)
 for(const zoom of [3,6,8]) {
  const squares=departmentSquares(visible,department,zoom)
  assert.equal(squares.features.length,2)
  assert.ok(squares.features.every(f=>(f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates).flat(2).every(([x,y])=>x>=0&&x<=2&&y>=0&&y<=2)))
 }
 assert.deepEqual(departmentSquares(visible,department,10).features,[])
 assert.equal(JSON.stringify(original),snapshot)
 assert.equal(clipDepartmentCells(original,department).features[0].geometry,visible.features[0].geometry)
})

test('intersección preserva huecos, concavidad y componentes separados sin contar contactos como área',()=>{
 const clip=territorialClip({type:'MultiPolygon',coordinates:[
  [[[0,0],[4,0],[4,4],[0,4],[0,0]],[[1,1],[1,3],[3,3],[3,1],[1,1]]],
  [[[5,0],[7,0],[7,1],[6,1],[6,2],[5,2],[5,0]]],
 ]})
 const rectangle=(w:number,s:number,e:number,n:number)=>({type:'Polygon' as const,coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]})
 const result=clip(rectangle(-1,-1,8,5))!
 const area=(result.type==='Polygon'?[result.coordinates]:result.coordinates).reduce((sum,rings)=>sum+rings.reduce((a,ring)=>a+Math.abs(ring.slice(1).reduce((acc,p,i)=>acc+ring[i][0]*p[1]-p[0]*ring[i][1],0))/2,0),0)
 assert.ok(Math.abs(area-15)<1e-9)
 assert.equal(clip(rectangle(1.2,1.2,2.8,2.8)),null)
 assert.equal(clip(rectangle(4,0,5,1)),null)
})
