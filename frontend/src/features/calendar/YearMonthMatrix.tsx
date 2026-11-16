import { cn, fireColor, fireStep, fireTextColor, formatCount, formatMonthLong, monthInitial, monthShort } from '../../ui'
import type { CalendarSeries } from '../../types/selection'
import { SERIES_LABEL, cellName } from './calendarData'
import type { SeriesCell, SeriesYear } from './calendarData'

/**
 * Matriz de años × meses (A4). Es una tabla real: los lectores de pantalla la recorren por fila y
 * columna, y cada celda es un botón que abre el mes en el panel. Escala clara, por cuantiles.
 */
export default function YearMonthMatrix({ years, breaks, series, regionLabel, selected, onSelect }: {
  years: SeriesYear[]; breaks: number[]; series: CalendarSeries; regionLabel: string
  selected: SeriesCell | null; onSelect: (cell: SeriesCell) => void
}) {
  const estimated = series === 'B1'
  return <div className="calendar-table-scroll -mx-1 overflow-x-auto px-1" role="region" aria-label={`Calendar of ${regionLabel}, ${SERIES_LABEL[series]}`} tabIndex={0}>
    <table className="calendar-matrix w-full min-w-[19rem] table-fixed border-separate border-spacing-[2px] sm:border-spacing-[3px]">
      <caption className="sr-only">{regionLabel} · {SERIES_LABEL[series]} · {estimated ? 'estimated' : 'observed'} cell-days per month. Each cell opens that month in the panel.</caption>
      <colgroup><col className="w-11 sm:w-14" />{Array.from({ length: 12 }, (_, i) => <col key={i} />)}</colgroup>
      <thead>
        <tr>
          <th scope="col" className="text-left text-xs font-normal text-muted"><span className="sr-only">Year</span></th>
          {Array.from({ length: 12 }, (_, i) => <th key={i} scope="col" className="pb-1 text-center font-display text-xs font-medium text-muted">
            <abbr title={formatMonthLong(2000, i + 1).split(' ')[0]} className="no-underline"><span className="sm:hidden">{monthInitial(i + 1)}</span><span className="hidden sm:inline">{monthShort(i + 1)}</span></abbr>
          </th>)}
        </tr>
      </thead>
      <tbody>
        {years.map(row => {
          const active = selected?.year === row.year
          return <tr key={row.year}>
            <th scope="row" className={cn('pr-1 text-left font-display text-sm tabular-nums', active ? 'font-semibold text-ink' : 'font-medium text-muted')}>
              {row.year}{row.available < 12 && <><span aria-hidden="true" className="text-cinder">*</span><span className="sr-only">, partial year: {row.available} of 12 months with data</span></>}
            </th>
            {row.cells.map(cell => <td key={cell.month} className="p-0">
              <MatrixCell cell={cell} breaks={breaks} series={series} active={selected?.year === cell.year && selected.month === cell.month} onSelect={onSelect} />
            </td>)}
          </tr>
        })}
      </tbody>
    </table>
  </div>
}

function MatrixCell({ cell, breaks, series, active, onSelect }: { cell: SeriesCell; breaks: number[]; series: CalendarSeries; active: boolean; onSelect: (cell: SeriesCell) => void }) {
  const step = cell.state === 'value' ? fireStep(cell.value!, breaks) : 0
  const style = cell.state === 'value' ? { background: fireColor(step), color: fireTextColor(step) } : undefined
  return <button type="button" style={style} aria-label={cellName(cell, series)} aria-pressed={active} aria-controls="calendar-detail" onClick={() => onSelect(cell)}
    className={cn('calendar-cell flex h-8 w-full cursor-pointer items-center justify-center rounded-cell border-0 p-0 font-display text-xs tabular-nums sm:h-9',
      cell.state === 'zero' && 'bg-zero text-ink',
      cell.state === 'missing' && 'bg-hatch border border-solid border-hairline bg-white',
      cell.state === 'absent' && 'border border-dashed border-muted bg-transparent',
      series === 'B1' && 'italic',
      active && 'relative z-10 outline-2 outline-offset-1 outline-ink [outline-style:solid]',
    )}>
    <span aria-hidden="true" className="hidden md:inline">{cell.state === 'value' ? formatCount(cell.value) : cell.state === 'zero' ? '0' : ''}</span>
    <span aria-hidden="true" className="md:hidden">{cell.state === 'zero' ? '0' : ''}</span>
  </button>
}
