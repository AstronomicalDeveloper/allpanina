import type { MonthlyRecord, Sensor } from '../../../types/data'
import type { MapSelection } from '../../../types/selection'
import { monthInitial } from '../../../ui/format'
import { MONTH_NAMES } from './monthNames'

const count = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
type MonthCell = { month: number; value: number | null; state: 'value' | 'zero' | 'missing' | 'unpublished' }

/** Published monthly values (region series, not map cells) of one year and sensor. */
function timelineMonths(records: MonthlyRecord[], region: string, year: number, sensor: Sensor): MonthCell[] {
  const rows = new Map(records.filter(r => r.region_id === region && r.year === year && r.sensor_group === sensor).map(r => [r.month, r]))
  return Array.from({ length: 12 }, (_, i) => {
    const row = rows.get(i + 1)
    if (!row) return { month: i + 1, value: null, state: 'unpublished' }
    if (row.status !== 'ok' || row.cell_days === null) return { month: i + 1, value: null, state: 'missing' }
    return { month: i + 1, value: row.cell_days, state: row.cell_days === 0 ? 'zero' : 'value' }
  })
}

/**
 * Timeline below the map (A4): years and months in one strip. Each month has a mini bar with its
 * relative activity within the year, so the user sees which months have something before clicking.
 * Bars are relative and unlabelled on purpose: exact values are in the Explore tab and the Calendar.
 */
export default function TimeBar({ years, selection, records, onChange }: {
  years: number[]; selection: MapSelection; records: MonthlyRecord[]; onChange: (next: MapSelection) => void
}) {
  const year = selection.year ?? years.at(-1) ?? 0
  const months = timelineMonths(records, selection.region, year, selection.sensor)
  const max = Math.max(1, ...months.map(m => m.value ?? 0))
  const scope = selection.scope ?? 'year'
  const describe = (m: MonthCell) => `${MONTH_NAMES[m.month - 1]} ${year}: ${m.state === 'value' ? `${count.format(m.value!)} cell-days` : m.state === 'zero' ? 'valid zero' : m.state === 'missing' ? 'no usable data' : 'not published'} (${selection.sensor}, published monthly series)`
  return <nav className="map-timebar" aria-label="Timeline">
    <div className="map-timebar-years" role="group" aria-label="Year">
      {years.map(y => <button key={y} type="button" aria-pressed={y === year} onClick={() => onChange({ ...selection, year: y })}>{y}</button>)}
    </div>
    <div className="map-timebar-months" role="group" aria-label={`Months of ${year}`}>
      <button type="button" className="map-timebar-all" aria-pressed={scope === 'year'} onClick={() => onChange({ ...selection, scope: 'year' })}>Whole year</button>
      {months.map(m => <button key={m.month} type="button" className="map-timebar-month" data-state={m.state}
        aria-pressed={scope === 'month' && selection.month === m.month} aria-label={describe(m)} title={describe(m)}
        onClick={() => onChange({ ...selection, scope: 'month', month: m.month })}>
        <span className="map-timebar-track" aria-hidden="true"><span className="map-timebar-bar" style={{ height: m.state === 'value' ? `${Math.max(8, (m.value! / max) * 100)}%` : undefined }} /></span>
        <span aria-hidden="true">{monthInitial(m.month)}</span>
      </button>)}
    </div>
  </nav>
}
