import { useState } from 'react'
import type { MouseEvent } from 'react'
import { filterCalendarRecords } from '../../services/data/calendar'
import { calendarCsvFilename, downloadCsv, serializeCsv, serializeMonthlySeries } from '../../services/data/csvExport'
import { Button, DataStateLegend, Disclosure, FireLegend, Notice, Segmented, Select, cn, formatMonth } from '../../ui'
import type { Option } from '../../ui'
import type { CalibratedRecord, MonthlyRecord } from '../../types/data'
import type { CalendarSelection, CalendarSeries } from '../../types/selection'
import { SERIES_LABEL, initialCell, seasonSummary, seriesBreaks, seriesYears } from './calendarData'
import type { TestError } from './calendarData'
import MonthPanel from './MonthPanel'
import YearMonthMatrix from './YearMonthMatrix'

const CALIBRATED_COLUMNS = ['region_id', 'year', 'month', 'method', 'value', 'split', 'status', 'residual'] as const

type Props = {
  regionLabel: string
  regions: string[]
  showRegionSelector: boolean
  records: MonthlyRecord[]
  calibrated: CalibratedRecord[]
  testError: (region: string) => TestError | null
  demo: boolean
  sourceUrl: string
  selection: CalendarSelection
  onSelectionChange: (next: CalendarSelection) => void
  mapHref?: (selection: CalendarSelection) => string
  onOpenMap?: (event: MouseEvent<HTMLAnchorElement>, selection: CalendarSelection) => void
}

/** Calendario (A4): encabezado con resumen, conmutador de serie, descarga, matriz de 14 años y panel del mes. */
export default function CalendarView({ regionLabel, regions, showRegionSelector, records, calibrated, testError, demo, sourceUrl, selection, onSelectionChange, mapHref, onOpenMap }: Props) {
  const [exportError, setExportError] = useState<string | null>(null)
  const region = selection.region || regions[0] || ''
  const hasB1 = calibrated.some(r => r.region_id === region && r.method === 'B1')
  const series: CalendarSeries = selection.series === 'B1' && !hasB1 ? 'MODIS' : selection.series
  const years = seriesYears(records, calibrated, region, series)
  const breaks = seriesBreaks(years)
  const summary = seasonSummary(years)
  const requested = selection.year !== null && selection.month !== null ? years.find(r => r.year === selection.year)?.cells[selection.month - 1] ?? null : null
  const cell = requested ?? initialCell(years, selection.year)
  const change = (patch: Partial<CalendarSelection>) => onSelectionChange({ ...selection, region, series, ...patch })

  const observedRows = series === 'B1' ? [] : filterCalendarRecords(records, region, series)
  const estimatedRows = series === 'B1' ? calibrated.filter(r => r.region_id === region && r.method === 'B1').sort((a, b) => a.year - b.year || a.month - b.month) : []
  const rowCount = series === 'B1' ? estimatedRows.length : observedRows.length
  const last = [...years].reverse().flatMap(row => [...row.cells].reverse()).find(c => c.state !== 'absent')
  const first = years.flatMap(row => row.cells).find(c => c.state !== 'absent')

  function exportCsv() {
    setExportError(null)
    try {
      const csv = series === 'B1'
        ? serializeCsv([CALIBRATED_COLUMNS, ...estimatedRows.map(row => CALIBRATED_COLUMNS.map(column => row[column]))])
        : serializeMonthlySeries(observedRows)
      downloadCsv(csv, calendarCsvFilename(region, series, demo))
    } catch (error) {
      setExportError(`The CSV could not be downloaded: ${error instanceof Error ? error.message : 'unknown error'}`)
    }
  }

  const options: Option<CalendarSeries>[] = [
    { value: 'MODIS', label: 'MODIS' },
    { value: 'VIIRS', label: 'VIIRS' },
    ...(hasB1 ? [{ value: 'B1' as const, label: 'Estimate (B1)' }] : []),
  ]

  return <>
    <header className="calendar-heading flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="flex max-w-[60ch] flex-col gap-3">
        <h1 className="m-0 font-display text-4xl font-semibold text-ink sm:text-5xl">
          {regionLabel}<span className="sr-only"> · </span>
          <span className="mt-1 block font-sans text-lg font-normal text-muted">Thermal detection calendar</span>
        </h1>
        {summary && <p className="calendar-summary m-0 text-base text-ink">
          Most active months: <strong className="font-semibold">{summary.peakLabel}</strong>. Most intense year: <strong className="font-semibold">{summary.peakYear}</strong>.
          <span className="text-muted"> {series === 'B1' ? 'Estimated' : SERIES_LABEL[series]} cell-days, complete years {summary.firstYear}–{summary.lastYear}.</span>
        </p>}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        {showRegionSelector && regions.length > 1 && <label className="flex flex-col gap-1.5 text-sm font-medium text-ink">Area
          <Select id="calendar-region" value={region} onChange={event => change({ region: event.target.value })}>{regions.map(id => <option key={id} value={id}>{id}</option>)}</Select>
        </label>}
        <Segmented label="Series" options={options} value={series} onChange={value => change({ series: value })} />
        <Button variant="secondary" size="sm" disabled={!rowCount} onClick={exportCsv} aria-describedby="calendar-csv-note" className="min-h-9">
          <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5" /></svg>
          Download CSV
        </Button>
      </div>
    </header>
    <p id="calendar-csv-note" className="calendar-export-note m-0 text-xs text-muted">
      CSV: {rowCount} {series === 'B1' ? 'B1 estimate' : 'observed'} records for {region || 'this area'} / {series}, all years, with the published columns
      ({(series === 'B1' ? CALIBRATED_COLUMNS : ['region_id', 'year', 'month', 'sensor_group', 'cell_days', 'status', 'source_version', 'updated_at']).join(', ')}). The selected month does not filter the download.
    </p>
    {exportError && <Notice tone="error"><p>{exportError}</p></Notice>}
    {demo && <Notice tone="warning"><p className="calendar-demo m-0 font-semibold">DEMO DATA — NOT REAL OBSERVATIONS</p></Notice>}
    {series === 'B1' && <Notice tone="exploratory"><p className="m-0">You are viewing the <strong>B1 estimate</strong>: VIIRS observations multiplied by the regional factor κ to approximate what MODIS would have counted. It is an estimate, not an observation. Its error was measured once, over the test period.</p></Notice>}

    {!records.length ? <p role="status" className="m-0 text-base text-muted">No data is available in the monthly series.</p>
      : !years.length ? <p role="status" className="m-0 text-base text-muted">There are no records for {region} / {SERIES_LABEL[series]}. They are not replaced with zeros.</p>
      : <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <section className="calendar-visual flex flex-col gap-5" aria-label={`${SERIES_LABEL[series]} calendar`}>
          <YearMonthMatrix years={years} breaks={breaks} series={series} regionLabel={regionLabel} selected={cell} onSelect={next => change({ year: next.year, month: next.month })} />
          {series !== 'B1' && !observedRows.length && <p role="status" className="m-0 text-sm text-muted">There are no {series} records for {region}. They are not replaced with zeros.</p>}
          <section className="calendar-legend flex flex-col gap-3 border-t border-hairline pt-4" aria-label="Legend">
            <FireLegend breaks={breaks} unit={`${series === 'B1' ? 'Estimated' : 'Observed'} cell-days per month · 9 classes by quantile, for ${regionLabel} and ${SERIES_LABEL[series]}`} />
            <DataStateLegend />
            {years.some(row => row.available < 12) && <p className="m-0 text-xs text-muted"><span className="text-cinder" aria-hidden="true">*</span> Partial year{first && last ? `: the published series runs from ${formatMonth(first.year, first.month)} to ${formatMonth(last.year, last.month)}` : ''}.</p>}
            <Disclosure summary="What is a cell-day?" className="calendar-cell-days-help max-w-[68ch]">
              <div className="flex flex-col gap-2">
                <p className="m-0">The territory is divided into 1 km cells. A cell-day is one cell on one day with at least one thermal detection. If a cell has detections on three different days of a month, it adds three cell-days; ten cells with detections on the same day add ten cell-days.</p>
                <p className="m-0">It is not a number of fires. Use it to compare months and years within the same area: colours are classes of this area and series, so the same colour can mean different values in another department.</p>
              </div>
            </Disclosure>
          </section>
        </section>
        {cell ? <MonthPanel cell={cell} region={region} regionLabel={regionLabel} series={series} records={records} calibrated={calibrated} testError={testError(region)} sourceUrl={sourceUrl} mapHref={mapHref} onOpenMap={onOpenMap} />
          : <p role="status" className={cn('m-0 text-sm text-muted')}>No month with data to show.</p>}
      </div>}
  </>
}
