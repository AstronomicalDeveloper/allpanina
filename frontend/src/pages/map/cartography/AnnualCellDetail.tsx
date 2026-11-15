import { cellMonthlyActivity } from '../../../services/data/mapExploration.ts'
import type { MapCellProperties, MapYear } from '../../../services/data/mapExploration.ts'
import { MONTH_SHORT } from '../../../ui/format'

export default function AnnualCellDetail({ cell, model, national = false }: { cell: MapCellProperties; model: MapYear; national?: boolean }) {
  const months = cellMonthlyActivity(model, cell)
  const max = Math.max(1, ...months.map(m => m.value ?? 0))
  const covered = months.filter(m => m.status === 'ok').length
  return <div className="map-annual-detail">
    <p>Year {cell.year} · {cell.sensor_group}</p><p><strong>{cell.cell_days} {national ? '1 km cell-days' : cell.cell_days === 1 ? 'day' : 'days'} with thermal detections</strong></p>
    <p>{national ? 'Sum of 1 km cell-day pairs inside this 10 km grid square over the available months of the year. It is not a count of distinct days of the square, nor a department total.' : 'Sum of the days with detections in this cell over the available months of the year. They need not be consecutive and are not a number of fires.'}</p>
    {months.some(m => m.status !== 'unknown') && <p>{covered === 12 ? 'Complete year' : 'Partial year'} · {covered}/12 usable months.</p>}
    {!months.some(m => m.status !== 'unknown') && <p>Monthly availability not available.</p>}
    <table className="map-month-bars">
      <caption>Monthly breakdown of observed activity (cell-days)</caption>
      <thead><tr><th scope="col">Month</th><th scope="col">Activity</th><th scope="col">Value / state</th></tr></thead>
      <tbody>{months.map(m => <tr key={m.month}>
        <th scope="row">{MONTH_SHORT[m.month - 1]}</th>
        <td aria-hidden="true"><span className={`map-month-track map-month-track--${m.value === null ? 'missing' : 'value'}`}>
          {m.value !== null && <span className="map-month-bar" style={{ width: `${m.value / max * 100}%` }} />}
        </span></td>
        <td>{m.value !== null ? m.value === 0 ? '0 · no detections recorded' : m.value : m.status === 'missing' ? 'No usable data' : m.status === 'unpublished' ? 'Not published' : 'Coverage not available'}</td>
      </tr>)}</tbody>
    </table>
    <p>A usable month with no activity in this cell means zero cell-days in the publication. Months with no data or not published have no value.</p>
  </div>
}
