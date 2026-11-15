import type {FeatureCollection} from 'geojson'
import type {DepartmentNavigation, NavigationBounds} from '../../types/departmentNavigation'
import {loadJson} from './loaders'
function fail():never {throw new Error('Límites de navegación inválidos; se requieren 25 departamentos INEI')}
export function validateDepartmentNavigation(value:unknown):DepartmentNavigation {
 if(!value||typeof value!=='object')fail()
 const data=value as DepartmentNavigation
 if(data.type!=='FeatureCollection'||data.purpose!=='navigation_only'||!Array.isArray(data.features)||data.features.length!==25||typeof data.source!=='string'||!/^[a-f0-9]{64}$/.test(data.source_sha256)||!Number.isFinite(data.tolerance_metres)||data.tolerance_metres<0)fail()
 const ids=new Set<string>()
 for(const f of data.features){
  const p=f.properties
  if(f.type!=='Feature'||!p||!/^PE-(0[1-9]|1[0-9]|2[0-5])$/.test(p.region_id)||ids.has(p.region_id)||typeof p.nombre!=='string'||!p.nombre.trim())fail()
  ids.add(p.region_id)
  if(!Array.isArray(p.bounds)||p.bounds.length!==4||!p.bounds.every(Number.isFinite)||p.bounds[0]>=p.bounds[2]||p.bounds[1]>=p.bounds[3]||p.bounds[0]<-180||p.bounds[2]>180||p.bounds[1]<-90||p.bounds[3]>90)fail()
  const g=f.geometry
  if(!g||!['Polygon','MultiPolygon'].includes(g.type)||!Array.isArray(g.coordinates)||!g.coordinates.length)fail()
  for(const polygon of g.type==='Polygon'?[g.coordinates]:g.coordinates){
   if(!Array.isArray(polygon)||!polygon.length)fail()
   for(const ring of polygon){
    if(!Array.isArray(ring)||ring.length<4||JSON.stringify(ring[0])!==JSON.stringify(ring.at(-1)))fail()
    for(const point of ring)if(!Array.isArray(point)||point.length!==2||!point.every(Number.isFinite)||Math.abs(point[0])>180||Math.abs(point[1])>90)fail()
   }
  }
 }
 return data
}
let cached:Promise<DepartmentNavigation>|null=null
/** Immutable cartographic catalogue, shared by map remounts. Failed requests can be retried. */
export function loadDepartmentNavigation():Promise<DepartmentNavigation> {
 cached??=loadJson(`${import.meta.env?.BASE_URL??'/'}cartography/departamentos_inei_2023.navigation.geojson`,validateDepartmentNavigation).catch(error=>{cached=null;throw error})
 return cached
}
export function nationalNavigationBounds(data:DepartmentNavigation):NavigationBounds {
 const bounds=data.features.map(f=>f.properties.bounds)
 return [[Math.min(...bounds.map(b=>b[0])),Math.min(...bounds.map(b=>b[1]))],[Math.max(...bounds.map(b=>b[2])),Math.max(...bounds.map(b=>b[3]))]]
}
/** Camera and discrete boundary only; no exterior shading. */
export function departmentView(data:DepartmentNavigation,region:string):{
 bounds:NavigationBounds;boundary:FeatureCollection
} {
 if(region==='PE')return {bounds:nationalNavigationBounds(data),boundary:{type:'FeatureCollection',features:[]}}
 const feature=data.features.find(f=>f.properties.region_id===region)
 if(!feature)throw new Error(`Límite no disponible para ${region}`)
 const b=feature.properties.bounds
 return {bounds:[[b[0],b[1]],[b[2],b[3]]],boundary:{type:'FeatureCollection',features:[feature]}}
}
