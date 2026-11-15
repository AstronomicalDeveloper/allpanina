import type { Manifest } from '../../../types/data'
import type { MapController } from '../useJuanMap'
import MapCellDaysHelp from './MapCellDaysHelp'

/** Information tab: how to read the map, scope notes, provenance and limits. Text only, no data changes. */
export default function InformationPanel({ map, national, region, regionName, manifest }: {
  map: MapController; national: boolean; region: string; regionName: string; manifest: Manifest
}) {
  return <div className="map-panel-content">
    {national && (region === 'PE'
      ? <p className="map-geographic-context">Scope: Peru. The summary comes from the published monthly series, and the layer shows every national 10 km grid square.</p>
      : <div className="map-geographic-context"><p><strong>Summary ({regionName}):</strong> comes from the monthly series published for this department, not from adding up the map's grid squares.</p><p><strong>Map:</strong> the Peru layer uses 10 km grid squares, clipped to the department boundary only on screen. A border square keeps its full value and may include detections from neighbouring departments: it is not an exact split of the department.</p></div>)}
    <section className="map-reading">
      <h3>How to read the colors</h3>
      <p>{map.representation === 'summary' ? 'Far away, each square marks one cell. Its size on screen is enlarged and does not show the area covered or a separate fire.' : 'Close up, you see the original polygons of the observed cells.'} Colors mean the same observed value at both zoom levels.</p>
      <p>Percentiles rank the cell values of the selected period and sensor. A more intense color means {national ? 'more 1 km cell-days added up in each grid square' : 'more days with detections per cell'} within this ranking; it does not measure severity, risk or burned area. The breaks are recomputed for each view and are not a fixed scale across periods or sensors.</p>
      <p>The timeline bars show each month's activity relative to the rest of the year, from the published monthly series. They are a guide to find months, not a measurement.</p>
    </section>
    <MapCellDaysHelp national={national} />
    {national && <details><summary>Highlighted boundary</summary><p>Simplified INEI 2023 boundary, for navigation. The filter and the clipping are only visual. A border cell may include observations from neighbouring territories; its original value is not split by the visible fragment.</p></details>}
    <details className="map-provenance"><summary>Data provenance</summary><p>{manifest.producto}</p><p>Published: {manifest.generated_at}</p><p>GeoJSON WGS84 · {national ? 'Peru · national coverage' : regionName}</p></details>
    <p className="map-fine-print">Observations, not confirmed fires or burned area. The calibrated estimate (B1) is never applied per cell. Published availability does not measure cloud cover.</p>
  </div>
}
