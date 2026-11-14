import { MONTHS, cellLabel } from '../../services/data/calendar.ts'
import type { CalendarCell, CalendarYear } from '../../services/data/calendar.ts'
import type { Sensor } from '../../types/data.ts'

interface Props {
  years: CalendarYear[]
  sensor: Sensor
  region: string
  selected: CalendarCell | null
  onSelect: (cell: CalendarCell) => void
}

export default function CalendarGrid({ years, sensor, region, selected, onSelect }: Props) {
  return (
    <div className="calendar-table-scroll" role="region" aria-label="Tabla del calendario, desplazamiento horizontal" tabIndex={0}>
      <table className="calendar-table">
        <caption>{region} · {sensor} · indicator en días-celda</caption>
        <thead><tr><th scope="col">Año</th>{MONTHS.map(month => <th scope="col" key={month}>{month}</th>)}</tr></thead>
        <tbody>{years.map(({ year, cells }) => (
          <tr key={year}>
            <th scope="row">{year}</th>
            {cells.map(cell => {
              const positive = cell.status === 'value'
              const lightness = 96 - 31 * ((cell.record?.indicator ?? 0) / 31)
              return (
                <td key={cell.month}>
                  <button
                    type="button"
                    className={`calendar-cell calendar-cell--${cell.status}`}
                    style={positive ? { backgroundColor: `hsl(210 50% ${lightness}%)` } : undefined}
                    aria-label={`${MONTHS[cell.month - 1]} ${year}, ${sensor}, ${cellLabel(cell)}`}
                    aria-pressed={selected?.year === year && selected.month === cell.month}
                    aria-controls="calendar-detail"
                    onClick={() => onSelect(cell)}
                  >{cellLabel(cell)}</button>
                </td>
              )
            })}
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}
