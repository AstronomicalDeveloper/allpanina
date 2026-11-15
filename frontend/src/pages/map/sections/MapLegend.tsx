import type { MapController } from '../useJuanMap'
import { paletteFor } from '../cartography/juanLayers'
import { percentileLegend } from './percentileLegend'

/** Floating legend over the map (A4): classes for the current view, compact; the full reading guide is in Information. */
export default function MapLegend({ map, national = false }: { map: MapController; national?: boolean }) {
  const { q25, q50, q75 } = map.percentileBreaks
  return <section className="map-legend" aria-label="Cell-days legend">
    <h3>Observed intensity <small>percentiles of this view</small></h3>
    <p className="map-legend-unit">{national ? '1 km cell-days per 10 km grid square' : 'Cell-days per cell'} · {map.scope === 'year' ? 'yearly total' : 'selected month'}</p>
    {map.stats.count === 0 ? <p>No cells to compute percentiles.</p>
      : <ol>{percentileLegend(q25, q50, q75, paletteFor(map.baseMap)).map(({ color, range, label }) => <li key={label}><i style={{ background: color }} aria-hidden="true" /><span>{label}</span><strong>{range}</strong></li>)}</ol>}
    <p aria-live="polite" className="map-legend-mode">{map.representation === 'summary' ? 'Overview · one square per cell (enlarged on screen)' : 'Close view · original cells'}</p>
  </section>
}
