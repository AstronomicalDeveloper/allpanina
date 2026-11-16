import type { ExpressionSpecification, LayerSpecification, GeoJSONSourceSpecification } from 'maplibre-gl'
import type { SummaryPoints } from '../../../services/data/mapSymbols'
import { percentileColorExpression } from './juanLayers'
export const SUMMARY_SOURCE = 'celdas-localizacion'
export const POINT_LAYER = 'celdas-cuadrados'
export const LOCAL_ZOOM = 9
export const SQUARE_IMAGE = 'celda-cuadrada-sdf'
export function summarySource(data: SummaryPoints): GeoJSONSourceSpecification {
  return { type: 'geojson', data, cluster: false }
}
// Mutually exclusive zoom ranges avoid drawing a symbol and polygon for the same cell.
export const localOpacity = (opacity: number): number => opacity
export const symbolOpacity = (opacity: number): ExpressionSpecification => ['interpolate', ['linear'], ['zoom'], 8, opacity, LOCAL_ZOOM, 0]
export const outlineWidth: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 8, 0, 10, .3, 13, .65, 16, .9]
export const outlineOpacity: ExpressionSpecification = ['interpolate', ['linear'], ['zoom'], 8.5, 0, 11, .7]
/** Small SDF square generated locally; no external glyphs, sprite service or per-cell DOM. */
type ImageHost = { hasImage(id: string): boolean; addImage(id: string, image: ReturnType<typeof squareImage>, options: { sdf: boolean }): void; on(type: string, listener: (event: { id?: string }) => void): unknown }
/**
 * C12: the cell layer asks for SQUARE_IMAGE as soon as the style is parsed. Registering it only on
 * 'load' let MapLibre warn "Image celda-cuadrada-sdf could not be loaded". It is now registered right
 * after the map is created, again whenever a style (re)loads, and on demand from 'styleimagemissing'.
 */
export function registerSquareImage(map: ImageHost): void {
  const install = () => { try { if (!map.hasImage(SQUARE_IMAGE)) map.addImage(SQUARE_IMAGE, squareImage(), { sdf: true }) } catch { /* style not ready: the events below retry */ } }
  install()
  map.on('styleimagemissing', event => { if (event.id === SQUARE_IMAGE) install() })
  map.on('style.load', install)
  map.on('load', install)
}

export function squareImage() {
  const width=32, data=new Uint8Array(width*width*4)
  for(let y=0;y<width;y++)for(let x=0;x<width;x++) {
    const distance=12-Math.max(Math.abs(x-15.5),Math.abs(y-15.5))
    const i=(y*width+x)*4
    data[i]=data[i+1]=data[i+2]=255
    data[i+3]=Math.max(0,Math.min(255,Math.round(192+distance*16)))
  }
  return {width,height:width,data}
}
export function summaryLayers(opacity: number, breaks: {q25:number;q50:number;q75:number}): LayerSpecification[] {
  return [{id:POINT_LAYER,type:'symbol',source:SUMMARY_SOURCE,maxzoom:LOCAL_ZOOM,
    layout:{'icon-image':SQUARE_IMAGE,'icon-size':['interpolate',['linear'],['zoom'],3,.25,8,.375,LOCAL_ZOOM,.4],
      'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport'},
    paint:{'icon-color':percentileColorExpression(breaks.q25,breaks.q50,breaks.q75),'icon-opacity':symbolOpacity(opacity),
      'icon-opacity-transition':{duration:0},'icon-halo-width':.35,'icon-halo-color':'rgba(11,23,54,0.55)'}
  }]
}
