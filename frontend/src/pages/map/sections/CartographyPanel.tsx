import type { MapController } from '../useJuanMap'
import type { OverlayState } from '../cartography/juanLayers'
import { BASEMAP_OPTIONS, paletteFor } from '../cartography/juanLayers'
import { percentileLegend } from './percentileLegend'
import MapCellDaysHelp from './MapCellDaysHelp'

const overlays: [keyof OverlayState, string][] = [
  ['graticule', 'Coordinate grid'], ['basic', 'References and boundaries of Peru'],
  ['detailed', 'Detailed cartography of Peru'], ['protectedAreas', 'Protected natural areas · Peru'],
]

export default function CartographyPanel({ map, national = false }: { map: MapController; national?: boolean }) {
  const { q25, q50, q75 } = map.percentileBreaks
  return <div className="map-panel-content">
    <fieldset><legend>Base map</legend><div className="map-segment map-basemaps">
      {BASEMAP_OPTIONS.map(option => <button key={option.id} aria-pressed={map.baseMap === option.id} onClick={() => map.setBaseMap(option.id)}>{option.label}<small>{option.description}</small></button>)}
    </div></fieldset>
    <fieldset className="map-overlays"><legend>Reference layers</legend>{overlays.map(([key, label]) => <label key={key}><input type="checkbox" checked={map.overlays[key]} onChange={event => map.setOverlays({ ...map.overlays, [key]: event.target.checked })} />{label}</label>)}</fieldset>
    <label className="map-opacity">Cell opacity <output>{Math.round(map.opacity * 100)}%</output><input aria-label="Cell opacity" type="range" min="0.2" max="1" step="0.05" value={map.opacity} onChange={event => map.setOpacity(Number(event.target.value))} /></label>
    <section className="map-legend" aria-label="Cell-days legend"><p aria-live="polite">{map.representation === 'summary' ? 'Overview · one square per cell' : 'Close view · original cells'}</p>
      <h3>Observed intensity · percentiles</h3><p>{map.representation === 'summary' ? 'Each square marks one cell. Its size on screen is enlarged and does not show the area covered or a separate fire.' : 'Original polygons of the observed cells.'} Colors mean the same observed value at both zoom levels.</p><p>{national ? '1 km cell-days per 10 km grid square' : 'Cell-days per cell'} · {map.scope === 'year' ? 'yearly total' : 'selected month'}</p>
      {map.stats.count === 0 ? <p>No cells to compute percentiles.</p> : <><ol>{percentileLegend(q25, q50, q75, paletteFor(map.baseMap)).map(({ color, range, label }) => <li key={label}><i style={{ background: color }} aria-hidden="true" /><span>{label}</span><strong>{range}</strong></li>)}</ol><p>Percentiles rank the cell values of the selected period and sensor. A more intense color means {national ? 'more 1 km cell-days added up in each grid square' : 'more days with detections per cell'} within this ranking; it does not measure severity, risk or burned area. The breaks are recomputed for each view and are not a fixed scale across periods or sensors.</p></>}
      {national && <details><summary>Highlighted boundary</summary><p>Simplified INEI 2023 boundary, for navigation. The filter and the clipping are only visual. A border cell may include observations from neighbouring territories; its original value is not split by the visible fragment.</p></details>}
      <MapCellDaysHelp national={national} />
    </section>
    <p className="map-fine-print">Base maps and reference layers need internet. If a provider fails, the map switches to another base map and keeps the observations. Reference layers from MINAM cover Peru only.</p>
  </div>
}
