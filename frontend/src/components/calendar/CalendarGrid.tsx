import { MONTHS, cellLabel } from '../../services/data/calendar.ts'
import type { CalendarCell, CalendarYear } from '../../services/data/calendar.ts'
import type { Sensor } from '../../types/data.ts'
import { CALENDAR_STATE_TEXT, calendarHeatColor } from './calendarPresentation.ts'

interface Props {
  scaleMax: number
  years: CalendarYear[]
  sensor: Sensor
  region: string
  selected: CalendarCell | null
  onSelect: (cell: CalendarCell) => void
}

function MonthButton({ cell, scaleMax, sensor, selected, onSelect, showMonth = false, showUnit = false }: Pick<Props, 'scaleMax' | 'sensor' | 'selected' | 'onSelect'> & { cell: CalendarCell; showMonth?: boolean; showUnit?: boolean }) {
  return <button type="button" className={`calendar-cell calendar-cell--${cell.status}`}
    style={cell.status === 'value' ? { backgroundColor: calendarHeatColor(cell.record?.cell_days ?? 0, scaleMax) } : undefined}
    aria-label={`${MONTHS[cell.month - 1]} ${cell.year}, ${sensor}, ${cellLabel(cell)}`}
    aria-pressed={selected?.year === cell.year && selected.month === cell.month}
    aria-controls="calendar-detail" onClick={() => onSelect(cell)}>
    {showMonth && <>
      <span className="calendar-month-name">{MONTHS[cell.month - 1]}</span>
      {selected?.year === cell.year && selected.month === cell.month && <span className="calendar-cell-selection" aria-hidden="true">✓</span>}
    </>}
    <span className="calendar-cell-value">{showMonth && cell.status !== 'value' ? cell.status === 'zero' ? '0' : '—' : cellLabel(cell)}</span>
    {showUnit && <span className="calendar-cell-unit">días-celda observados</span>}
    {showMonth && <span className="calendar-cell-status">{CALENDAR_STATE_TEXT[cell.status]}</span>}
  </button>
}

export function AnnualCalendarGrid({ cells, year, ...props }: Omit<Props, 'years' | 'region'> & { cells: CalendarCell[]; year: number }) {
  return <div className="calendar-annual-grid" role="group" aria-label={`Calendario anual ${year}`}>
    {cells.map(cell => <MonthButton key={cell.month} cell={cell} {...props} showMonth />)}
  </div>
}

export function SingleCalendarMonth({ cell, ...props }: Omit<Props, 'years' | 'region'> & { cell: CalendarCell }) {
  return <div className="calendar-single-month" role="group" aria-label={`Mes seleccionado: ${MONTHS[cell.month - 1]} ${cell.year}`}><MonthButton cell={cell} {...props} showMonth showUnit /></div>
}

export default function CalendarGrid({ years, scaleMax, sensor, region, selected, onSelect }: Props) {
  return (
    <div className="calendar-table-scroll" role="region" aria-label={`Comparación histórica de ${region}, desplazamiento horizontal`} tabIndex={0}>
      <table className="calendar-table">
        <caption>{sensor} · días-celda observados por mes</caption>
        <thead><tr><th scope="col">Año</th>{MONTHS.map(month => <th scope="col" key={month}>{month}</th>)}</tr></thead>
        <tbody>{years.map(({ year, cells }) => (
          <tr key={year}>
            <th scope="row">{year}</th>
            {cells.map(cell => <td key={cell.month}><MonthButton cell={cell} scaleMax={scaleMax} sensor={sensor} selected={selected} onSelect={onSelect} /></td>)}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
