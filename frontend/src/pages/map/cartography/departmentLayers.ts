import type {LayerSpecification} from 'maplibre-gl'
import {LOCAL_ZOOM, symbolOpacity} from './multiscaleLayers'
import {percentileColorExpression} from './juanLayers'
export const DEPARTMENT_SOURCE='departamento-enfocado'
export const DEPARTMENT_SQUARE_SOURCE='departamento-cuadrados'
export const DEPARTMENT_SQUARE_LAYER='departamento-localizacion'
export function departmentLayers():LayerSpecification[]{return [
 {id:DEPARTMENT_SQUARE_LAYER,type:'fill',source:DEPARTMENT_SQUARE_SOURCE,maxzoom:LOCAL_ZOOM,paint:{'fill-color':percentileColorExpression(0,0,0),'fill-opacity':symbolOpacity(.85),'fill-antialias':false}},
 {id:'departamento-limite',type:'line',source:DEPARTMENT_SOURCE,paint:{'line-color':'#F6F7F9','line-width':1.2,'line-opacity':.8}},
]}
