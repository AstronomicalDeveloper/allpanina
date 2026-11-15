import { MONTHS, cellLabel } from '../../../services/data/calendar'
import type { CalendarCell, CalendarYear } from '../../../services/data/calendar'
import type { Sensor } from '../../../types/data'
import { CALENDAR_STATE_TEXT, calendarHeatColor } from './calendarPresentation'
interface SharedProps { scaleMax: number; sensor: Sensor; selected: CalendarCell | null; onSelect: (cell: CalendarCell) => void }
function MonthCell({ cell, compact=false, ...props }: SharedProps & { cell: CalendarCell; compact?: boolean }) {
  const active = props.selected?.year === cell.year && props.selected.month === cell.month
  return <button type="button" className={`calendar-cell calendar-cell--${cell.status}`} style={cell.status==='value' ? {backgroundColor:calendarHeatColor(cell.record!.cell_days!, props.scaleMax)} : undefined}
    aria-label={`${MONTHS[cell.month-1]} ${cell.year}, ${props.sensor}, ${cellLabel(cell)}`} aria-pressed={active} aria-controls="calendar-detail" onClick={()=>props.onSelect(cell)}>
    {!compact && <span className="calendar-month-name">{MONTHS[cell.month-1]}</span>}
    <span className="calendar-cell-value">{cell.status==='value'||cell.status==='zero' ? cell.record?.cell_days : '—'}</span>
    {!compact && cell.status !== 'value' && <span className="calendar-cell-status">{CALENDAR_STATE_TEXT[cell.status]}</span>}
    {active && <span className="calendar-selected-mark" aria-hidden="true">✓</span>}
    {compact && (cell.status==='missing'||cell.status==='absent') && <span className="calendar-matrix-state">{cell.status==='missing'?'Sin dato':'No publicado'}</span>}
  </button>
}
export function AnnualCalendarGrid({ cells, year, ...props }: SharedProps & { cells: CalendarCell[]; year: number }) {
  const available = cells.filter(cell => cell.status === 'value' || cell.status === 'zero').length
  return <><div className="calendar-field-heading"><h2>{year}</h2><span>{available < 12 ? `Año parcial · ${available}/12 meses con datos` : '12 meses con datos'}</span></div><div className="calendar-annual-grid" role="group" aria-label={`Calendario anual ${year}`}>{cells.map(cell=><MonthCell key={cell.month} cell={cell} {...props} />)}</div></>
}
export default function CalendarGrid({ years, region, ...props }: SharedProps & { years: CalendarYear[]; region: string }) {
  return <div className="calendar-table-scroll" role="region" aria-label={`Comparación histórica de ${region}, desplazamiento horizontal`} tabIndex={0}><table className="calendar-table"><caption>{years.length} años seleccionados · {props.sensor} · días-celda observados</caption><thead><tr><th scope="col">Año</th>{MONTHS.map(month=><th scope="col" key={month}>{month.slice(0,3)}</th>)}</tr></thead><tbody>{years.map(({year,cells})=><tr key={year}><th scope="row">{year}{cells.some(c=>c.status==='absent'||c.status==='missing') && <small className="calendar-partial-year">Parcial</small>}</th>{cells.map(cell=><td key={cell.month}><MonthCell cell={cell} compact {...props} /></td>)}</tr>)}</tbody></table></div>
}
