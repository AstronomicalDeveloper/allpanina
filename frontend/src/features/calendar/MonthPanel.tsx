import type { MouseEvent } from 'react'
import TechnicalDetailBlock from './TechnicalDetailBlock'
import HistoricalAnalysis from './HistoricalAnalysis'
import { SERIES_LABEL, SPLIT_LABEL, STATE_LABEL } from './calendarData'
import type { CellState, SeriesCell, TestError } from './calendarData'
import { buttonClasses, cn, formatCount, formatDecimal, formatMonthLong, formatPercent, formatPeriodRange } from '../../ui'
import type { CalibratedRecord, MonthlyRecord, Sensor } from '../../types/data'
import type { CalendarSelection, CalendarSeries } from '../../types/selection'

type Props = {
  cell: SeriesCell
  region: string
  regionLabel: string
  series: CalendarSeries
  records: MonthlyRecord[]
  calibrated: CalibratedRecord[]
  testError: TestError | null
  sourceUrl: string
  mapHref?: (selection: CalendarSelection) => string
  onOpenMap?: (event: MouseEvent<HTMLAnchorElement>, selection: CalendarSelection) => void
}

function observedState(record: MonthlyRecord | undefined): CellState {
  if (!record) return 'absent'
  if (record.status !== 'ok' || record.cell_days === null) return 'missing'
  return record.cell_days === 0 ? 'zero' : 'value'
}

/** Explicación de lo que significa el valor del mes, según su estado. Nunca convierte un estado en otro. */
function explanation(state: CellState, series: CalendarSeries, regionLabel: string): string {
  if (state === 'absent') return 'No record has been published for this month. This is not the same as zero.'
  if (state === 'missing') return 'There is no usable value for this month and series. It is not replaced with zero.'
  if (series === 'B1') return state === 'zero'
    ? 'The estimate is zero because VIIRS recorded no detections this month. It is an estimate, not an observation.'
    : 'Estimated from the VIIRS observation with the regional factor κ (B1), to approximate what MODIS would have counted. It is not an observation.'
  if (state === 'zero') return `No thermal detections were recorded in ${regionLabel} this month. A recorded zero does not prove there was no fire.`
  return `Sum of the days with thermal detections recorded in each cell of ${regionLabel} this month. It is not a number of fires, nor a number of distinct days.`
}

/** Panel del mes elegido (A4): valor de la serie, las otras series, B1 con su error de test, mapa e historia. */
export default function MonthPanel({ cell, region, regionLabel, series, records, calibrated, testError, sourceUrl, mapHref, onOpenMap }: Props) {
  const find = (sensor: Sensor) => records.find(r => r.region_id === region && r.sensor_group === sensor && r.year === cell.year && r.month === cell.month)
  const observed = { MODIS: find('MODIS'), VIIRS: find('VIIRS') }
  const b1 = calibrated.find(r => r.region_id === region && r.method === 'B1' && r.year === cell.year && r.month === cell.month)
  const period: CalendarSelection = { region, year: cell.year, month: cell.month, series }
  const historySensor: Sensor = series === 'B1' ? 'MODIS' : series
  const stateTag = series === 'B1' && (cell.state === 'value' || cell.state === 'zero') ? 'Estimated' : STATE_LABEL[cell.state]
  const others = (['MODIS', 'VIIRS'] as const).filter(sensor => sensor !== series)

  return <aside id="calendar-detail" className="calendar-detail flex flex-col gap-5 rounded-panel border border-hairline bg-white p-5 lg:sticky lg:top-[72px]" aria-labelledby="calendar-detail-title">
    <div aria-live="polite" className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="m-0 text-sm text-muted">{regionLabel}</p>
        <h2 id="calendar-detail-title" className="m-0 font-display text-2xl font-semibold text-ink">{formatMonthLong(cell.year, cell.month)}</h2>
      </header>

      <div className="flex flex-col gap-1">
        <p className="m-0 text-sm font-medium text-muted">{SERIES_LABEL[series]}{series === 'B1' ? ' · estimated' : ' · observed'}</p>
        <p className={cn('calendar-observed-value m-0 font-display text-4xl font-semibold tabular-nums text-ink', series === 'B1' && 'italic')}>
          {cell.state === 'value' || cell.state === 'zero' ? `${series === 'B1' && cell.state === 'value' ? '≈ ' : ''}${formatCount(cell.value)}` : '—'}
        </p>
        <p className="m-0 text-sm text-muted">cell-days{series === 'B1' ? ' (estimated)' : ''}</p>
        <p className={cn('calendar-detail-state mt-2 mb-0 inline-flex w-fit items-center gap-1.5 rounded-control px-2 py-0.5 text-xs font-medium',
          cell.state === 'value' && series !== 'B1' && 'bg-fire-1 text-ink',
          series === 'B1' && (cell.state === 'value' || cell.state === 'zero') && 'border border-dashed border-cinder text-cinder',
          cell.state === 'zero' && series !== 'B1' && 'bg-zero text-ink',
          cell.state === 'missing' && 'bg-hatch border border-hairline text-ink',
          cell.state === 'absent' && 'border border-dashed border-muted text-muted')}>{stateTag}</p>
        <p className="mt-2 mb-0 text-sm text-muted">{explanation(cell.state, series, regionLabel)}</p>
      </div>

      <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 border-t border-hairline pt-4 text-sm">
        {others.map(sensor => {
          const record = observed[sensor], state = observedState(record)
          return <div key={sensor} className="contents">
            <dt className="text-muted">{sensor} · observed</dt>
            <dd className="m-0 text-right tabular-nums text-ink">{state === 'value' || state === 'zero' ? `${formatCount(record!.cell_days)} cell-days` : STATE_LABEL[state]}</dd>
          </div>
        })}
      </dl>

      {b1 && <section className="calendar-estimates flex flex-col gap-2 rounded-control border border-dashed border-hairline p-3 text-sm" aria-label="B1 estimate">
        <p className="calendar-estimate m-0 text-ink">
          <strong title={b1.value === null ? undefined : String(b1.value)} className="font-medium">B1: {b1.value === null ? 'no value' : formatDecimal(b1.value, 1)}</strong> estimated cell-days · {SPLIT_LABEL[b1.split]}
        </p>
        <TestErrorNote testError={testError} />
      </section>}

      {mapHref && <a className={cn('calendar-map-action', buttonClasses('primary', 'md', 'w-full'))} href={mapHref(period)} onClick={event => onOpenMap?.(event, period)}>View this month on the map</a>}

      <HistoricalAnalysis records={records} regionLabel={regionLabel} selection={{ region, year: cell.year, month: cell.month, sensor: historySensor }} />

      <TechnicalDetailBlock region={region} series={series} record={series === 'B1' ? undefined : observed[series]} b1={b1} sourceUrl={sourceUrl} />
    </div>
  </aside>
}

/**
 * Error de B1 en el período de test. Es un resumen de todo ese período: no es el error de este mes
 * ni un porcentaje de confianza para otros meses (plan v1.3, regla de precisión).
 */
function TestErrorNote({ testError }: { testError: TestError | null }) {
  if (!testError) return <p className="m-0 text-xs text-muted">The test-period error for this area is not available.</p>
  if (!testError.reportable) return <p className="m-0 text-xs text-muted">No test-period error is reported for this area: there were too few MODIS detections in the test period to measure it.</p>
  return <p className="m-0 text-xs text-muted">
    Test-period error (WAPE): <strong className="font-medium text-ink">{formatPercent(testError.wape)}</strong>, over {formatPeriodRange(testError.period)}{testError.months ? ` (${testError.months} months)` : ''}. It summarizes the whole test period: it is not the error of this month, nor a confidence level for other months.
    {testError.note === 'ucayali' && testError.clean && <> This figure includes Ucayali, whose test months were already used in the Ucayali pilot evaluation; the clean result, for {testError.clean.label}, is {formatPercent(testError.clean.wape)}.</>}
  </p>
}
