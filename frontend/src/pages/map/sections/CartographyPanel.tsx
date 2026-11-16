import type { MapController } from '../useJuanMap'
import type { OverlayState } from '../cartography/juanLayers'
import { BASEMAP_OPTIONS } from '../cartography/juanLayers'

const overlays: [keyof OverlayState, string][] = [
  ['graticule', 'Coordinate grid'], ['basic', 'References and boundaries of Peru'],
  ['detailed', 'Detailed cartography of Peru'], ['protectedAreas', 'Protected natural areas · Peru'],
]

export default function CartographyPanel({ map }: { map: MapController }) {
  return <div className="map-panel-content">
    <fieldset><legend>Base map</legend><div className="map-segment map-basemaps">
      {BASEMAP_OPTIONS.map(option => <button key={option.id} aria-pressed={map.baseMap === option.id} onClick={() => map.setBaseMap(option.id)}>{option.label}<small>{option.description}</small></button>)}
    </div></fieldset>
    <fieldset className="map-overlays"><legend>Reference layers</legend>{overlays.map(([key, label]) => <label key={key}><input type="checkbox" checked={map.overlays[key]} onChange={event => map.setOverlays({ ...map.overlays, [key]: event.target.checked })} />{label}</label>)}</fieldset>
    <label className="map-opacity">Cell opacity <output>{Math.round(map.opacity * 100)}%</output><input aria-label="Cell opacity" type="range" min="0.2" max="1" step="0.05" value={map.opacity} onChange={event => map.setOpacity(Number(event.target.value))} /></label>
    <p className="map-fine-print">Base maps and reference layers need internet. If a provider fails, the map switches to another base map and keeps the observations. Reference layers from MINAM cover Peru only.</p>
  </div>
}
