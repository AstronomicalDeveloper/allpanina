import type { regionalSummary } from '../../../services/data/regionalSummary'
import { useMemo } from 'react'
import type { MapSelection } from '../../../types/selection'
import type { MapController } from '../useJuanMap'
import AnnualCellDetail from '../cartography/AnnualCellDetail'
import { valueContext } from '../../../components/ui/valueContext'
import { MONTH_NAMES } from './monthNames'

const count = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })

export default function ExplorationPanel({ map, selection, years, onChange, unavailable, national = false, regional, regionName }: {
  national?: boolean; regional?: ReturnType<typeof regionalSummary>; map: MapController; selection: MapSelection; years: number[]; onChange: (next: MapSelection) => void; unavailable: boolean; regionName: string
}) {
  const cellOptions = useMemo(() => map.filteredGeoJson.features.map(feature => <option key={feature.properties.cell_id} value={feature.properties.cell_id}>{feature.properties.cell_id}: {feature.properties.cell_days} cell-days</option>), [map.filteredGeoJson])
  const coverage = regional?.coverage ?? map.yearModel.coverage[map.sensor]
  const usableMonths = regional?.usableMonths ?? map.usableMonths
  const observedValue = regional ? regional.value : map.stats.totalDetections
  const cellContext = map.selectedCell ? valueContext(map.filteredGeoJson.features.map(f => f.properties.cell_days), map.selectedCell.cell_days) : null
  /** The national map draws 10 km grid squares that add up 1 km cells; the pilot draws 1 km cells. */
  const unit = national ? 'grid square' : 'cell'
  const valid = regional ? regional.value !== null : map.scope === 'year' ? map.usableMonths > 0 : map.monthStatus === 'ok'
  return <div className="map-panel-content">
    <fieldset><legend>Observation period</legend><div className="map-segment" aria-label="Map period">{([['year', 'Yearly'], ['month', 'Monthly']] as const).map(([scope, label]) => <button key={scope} aria-pressed={map.scope === scope} onClick={() => onChange({ ...selection, scope })}>{label}</button>)}</div>
      <div className="map-period-fields"><label>Year<select aria-label="Map year" value={selection.year ?? ''} onChange={event => onChange({ ...selection, year: Number(event.target.value) })}>{years.map(year => <option key={year}>{year}</option>)}</select></label>
      {map.scope === 'month' && <label>Month<select aria-label="Map month" value={selection.month ?? 1} onChange={event => onChange({ ...selection, month: Number(event.target.value) })}>{MONTH_NAMES.map((name, index) => <option key={name} value={index + 1}>{name}</option>)}</select></label>}</div>
    </fieldset>
    <fieldset><legend>Satellite sensor</legend><div className="map-segment">{(['MODIS', 'VIIRS'] as const).map(sensor => <button key={sensor} aria-pressed={map.sensor === sensor} onClick={() => onChange({ ...selection, sensor })}>{sensor}</button>)}</div></fieldset>
    <section className="map-observed" aria-label="Observed summary" aria-live="polite"><h3>{map.scope === 'year' ? `Total ${map.year}` : `${MONTH_NAMES[map.month - 1]} ${map.year}`} <small>{map.sensor}</small></h3>
      {unavailable ? <p role="status">No GeoJSON is published for this year and region. Choose another period. A missing file does not mean zero.</p>
        : valid ? <><strong className="map-observed-value">{observedValue === null || observedValue === undefined ? '—' : count.format(observedValue)}</strong><span>observed cell-days</span>{(!national || selection.region === 'PE') && <p>{map.stats.count} {national ? 'national grid squares' : 'cells'} with records · up to {map.stats.maxCell} cell-days per {unit}</p>}{observedValue === 0 && <p>Valid zero: usable period with no detections recorded.</p>}</>
        : <p>{(regional?.status ?? map.monthStatus) === 'missing' && map.scope === 'month' ? 'No usable data' : map.scope === 'month' ? 'Period not published' : 'No usable months'}. This is not read as zero.</p>}
      {map.scope === 'year' && !unavailable && <><p className="map-coverage-badge">{usableMonths === 12 ? 'Complete year' : 'Partial year'} · {usableMonths}/12 usable months</p><details><summary>Monthly availability</summary><ul>{coverage.map(month => <li key={month.month}>{MONTH_NAMES[month.month - 1]}: {month.status === 'ok' ? 'published and usable' : month.status === 'missing' ? 'no usable data' : 'not published'}</li>)}</ul></details></>}
    </section>
    <section className="map-inspector" aria-label={`${national ? 'Grid square' : 'Cell'} inspector`}><h3>{national ? 'Grid square' : 'Cell'} inspector</h3><p>{national ? 'Select a 10 km grid square on the map or choose its identifier. Its value adds up the cell-days of the 1 km cells it contains.' : 'Select a cell on the map or choose its identifier.'}</p>
      <label>{national ? 'Grid square' : 'Cell'} (keyboard)<select aria-label={`Select map ${unit}`} value={map.selectedCell?.cell_id ?? ''} onChange={event => map.selectCell(event.target.value)}><option value="">Choose a {unit}</option>{cellOptions}</select></label>
      {map.selectedCell && <div className="map-cell-detail"><h4>Satellite observation</h4><p>{national ? 'Peru layer · 10 km grid square' : regionName} · {map.sensor}</p>
        {map.scope === 'year' ? <AnnualCellDetail cell={map.selectedCell} model={map.yearModel} national={national} /> : <><p>{MONTH_NAMES[map.month - 1]} {map.year}</p><p><strong>{map.selectedCell.cell_days} {national ? '1 km cell-days' : map.selectedCell.cell_days === 1 ? 'day' : 'days'}</strong> {national ? 'added up in this 10 km grid square during the month. They are not distinct days of the square, nor a department total.' : 'with thermal detections recorded in this cell during the month.'}</p><p>This is not a number of fires.</p></>}
        <p className="map-fine-print">Cell identifier: {map.selectedCell.cell_id}</p>
        {cellContext && <p className="map-cell-context">In this view, {cellContext.greater} of {cellContext.total} cells with records have more cell-days than this one. The maximum is {count.format(cellContext.max)}.</p>}
        <button onClick={() => map.selectCell('')}>Clear selection</button>
      </div>}
    </section>
  </div>
}
