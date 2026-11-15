import assert from 'node:assert/strict'
import {test} from 'node:test'
import {historicalAnalysis} from '../src/services/data/historicalAnalysis'
import type {MonthlyRecord} from '../src/types/data'
import {mockFiles,mount,choose} from './uiHarness'
const selection={region:'PE',sensor:'MODIS' as const,year:2024,month:9}
const row=(year:number,value:number|null,extra:Partial<MonthlyRecord>={}):MonthlyRecord=>({region_id:'PE',sensor_group:'MODIS',year,month:9,cell_days:value,status:value===null?'missing':'ok',source_version:'test',updated_at:'2026-01-01',...extra})
test('mismo mes anterior, aislamiento geográfico/sensor, mediana impar y diferencias',()=>{
 const rows=[row(2020,0),row(2021,10),row(2022,20),row(2024,30),row(2025,1000),row(2023,500,{month:8}),row(2023,500,{region_id:'PE-25'}),row(2023,500,{sensor_group:'VIIRS'})]
 const original=JSON.stringify(rows),result=historicalAnalysis(rows,selection)
 assert.equal(result.median,10);assert.equal(result.absoluteDifference,20);assert.equal(result.percentage,200)
 assert.deepEqual(result.referenceYears,[2020,2021,2022]);assert.equal(JSON.stringify(rows),original)
})
test('mediana par, diferencias negativas, ceros válidos y missing excluido',()=>{
 const result=historicalAnalysis([row(2019,0),row(2020,10),row(2021,20),row(2022,30),row(2023,999,{status:'missing'}),row(2024,5)],selection)
 assert.equal(result.median,15);assert.equal(result.difference,-10);assert.equal(result.absoluteDifference,10)
 assert.ok(Math.abs(result.percentage!+66.6666667)<.00001);assert.equal(result.count,4)
})
test('mediana cero sin porcentaje, igualdad y cero seleccionado',()=>{
 const rows=[row(2020,0),row(2021,0),row(2022,0),row(2024,8)]
 assert.equal(historicalAnalysis(rows,selection).percentage,null)
 assert.equal(historicalAnalysis(rows,selection).absoluteDifference,8)
 assert.equal(historicalAnalysis([...rows.slice(0,3),row(2024,0)],selection).difference,0)
})
test('menos de tres años, selección missing/no publicada y 2013 sin historial',()=>{
 assert.equal(historicalAnalysis([row(2020,0),row(2021,10),row(2024,20)],selection).status,'insufficient')
 for(const records of [[row(2024,null)],[]])assert.equal(historicalAnalysis(records,selection).status,'unavailable')
 const first=historicalAnalysis([row(2013,10),row(2014,999)],{...selection,year:2013})
 assert.equal(first.status,'insufficient');assert.equal(first.count,0)
})
test('2026 parcial usa solamente el mes disponible, sin inventar registros',()=>{
 const rows=[row(2020,2,{month:7}),row(2021,4,{month:7}),row(2022,8,{month:7}),row(2026,10,{month:7})]
 assert.equal(historicalAnalysis(rows,{...selection,year:2026,month:7}).median,4)
 assert.equal(historicalAnalysis(rows,{...selection,year:2026,month:8}).status,'unavailable')
})
test('panel nacional con URL, cambio de sensor y referencia propia sin estimaciones',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?mapRegion=PE&periodYear=2024&periodMonth=9',undefined,'peru')
 const panel=host.querySelector<HTMLDetailsElement>('.calendar-history')!
 assert.ok(panel);assert.equal(panel.open,false);assert.equal(panel.querySelector('summary')!.textContent,'Análisis histórico')
 assert.match(panel.textContent!,/septiembre de 2024.*PE y MODIS/)
 assert.equal(panel.querySelectorAll('.is-selected').length,1)
 assert.match(panel.querySelector('.is-selected')!.textContent!,/2024Seleccionado.*8,204/)
 assert.ok(!panel.textContent!.includes('B1'))
 await choose(host,'#calendar-sensor','VIIRS')
 assert.match(panel.textContent!,/PE y VIIRS/)
})
test('DEMO conserva su fuente e historial insuficiente',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?data=demo&periodYear=2024&periodMonth=9')
 assert.match(host.querySelector('.calendar-history')!.textContent!,/Historial insuficiente/)
})

test('piloto mantiene observación y referencia separadas del producto nacional',async t=>{
 mockFiles(t);const {host}=await mount(t,'/calendario?data=pilot&mapRegion=PE-UCA&periodYear=2024&periodMonth=9')
 const panel=host.querySelector('.calendar-history')!
 assert.match(panel.textContent!,/PE-UCA y MODIS/)
 assert.match(panel.querySelector('.is-selected')!.textContent!,/2024Seleccionado2,323/)
})
