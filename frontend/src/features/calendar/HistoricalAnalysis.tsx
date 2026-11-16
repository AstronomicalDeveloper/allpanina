import { historicalAnalysis } from '../../services/data/historicalAnalysis'
import type { HistoricalSelection } from '../../services/data/historicalAnalysis'
import type { MonthlyRecord } from '../../types/data'
import { formatDecimal, formatMonthLong } from '../../ui'

const MONTH_NAMES = Array.from({ length: 12 }, (_, i) => formatMonthLong(2000, i + 1).split(' ')[0])
const number = (value: number) => formatDecimal(value, 2)

/**
 * Análisis histórico (se conserva el de Landry, con el nuevo estilo y en inglés): compara el mes elegido
 * con el mismo mes de años anteriores. El cálculo es el de `services/data/historicalAnalysis`, sin cambios.
 */
export default function HistoricalAnalysis({ records, selection, regionLabel }: { records: MonthlyRecord[]; selection: HistoricalSelection; regionLabel: string }) {
  const result = historicalAnalysis(records, selection)
  const maximum = Math.max(1, ...result.points.map(p => p.value))
  const month = MONTH_NAMES[selection.month - 1]
  const row = 'flex items-baseline justify-between gap-4 border-b border-hairline py-1.5'
  return <details className="calendar-history group rounded-control border border-hairline bg-white">
    <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
      <svg className="size-4 shrink-0 transition-transform group-open:rotate-90" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 4 4 4-4 4" /></svg>
      Historical analysis
    </summary>
    <div className="flex flex-col gap-3 px-4 pb-4 text-sm text-muted">
      <p className="m-0">Compares {month} {selection.year} with {month} of earlier years, for {regionLabel} and {selection.sensor} observations.</p>
      <dl className="m-0">
        <div className={row}><dt>Selected value</dt><dd className="m-0 tabular-nums text-ink">{result.selectedValue === null ? 'No valid value' : `${number(result.selectedValue)} cell-days`}</dd></div>
        <div className={row}><dt>Valid earlier years</dt><dd className="m-0 tabular-nums text-ink">{result.count}</dd></div>
        {result.status === 'ready' && <>
          <div className={row}><dt>Historical median</dt><dd className="m-0 tabular-nums text-ink">{number(result.median)} cell-days</dd></div>
          <div className={row}><dt>Absolute difference</dt><dd className="m-0 text-right tabular-nums text-ink">{number(result.absoluteDifference)} cell-days{result.difference > 0 ? ' above' : result.difference < 0 ? ' below' : ' · equal to the median'}</dd></div>
          <div className={row}><dt>Percentage difference</dt><dd className="m-0 text-right tabular-nums text-ink">{result.percentage === null ? 'Not computable: the median is zero' : `${result.percentage > 0 ? '+' : ''}${number(result.percentage)}%`}</dd></div>
        </>}
      </dl>
      {result.status === 'insufficient' && <p role="status" className="m-0">Not enough history: at least three valid earlier years are needed.</p>}
      {result.status === 'unavailable' && <p role="status" className="m-0">No comparison: the selected month has no valid observation.</p>}
      {!!result.points.length && <figure className="m-0">
        <figcaption className="mb-2 text-xs">{month} by year · observed cell-days</figcaption>
        <ul className="calendar-history-chart m-0 flex list-none flex-col gap-1 p-0" aria-label={`Values of ${month} by year`}>
          {result.points.map(point => <li key={point.year} className={`${point.selected ? 'is-selected font-semibold text-ink' : ''} grid grid-cols-[4.5rem_minmax(0,1fr)_auto] items-center gap-2 text-xs tabular-nums`}>
            <span>{point.year}{point.selected && <small className="ml-1 font-normal text-cinder">Selected</small>}</span>
            <span className="h-2 rounded-full bg-hairline" aria-hidden="true"><i className={`block h-2 rounded-full ${point.selected ? 'bg-cinder' : 'bg-fire-4'}`} style={{ width: `${point.value / maximum * 100}%` }} /></span>
            <strong className="font-medium">{number(point.value)}</strong>
          </li>)}
        </ul>
      </figure>}
      <p className="calendar-history-note m-0 text-xs">Valid zeros are included; missing months and later years are excluded. Differences describe satellite-observed thermal activity; they do not prove changes in confirmed fires, nor statistical significance.</p>
    </div>
  </details>
}
