import { useEffect, useState } from 'react'
import type { CalibratedRecord, MonthlyRecord, Sensor } from '../../types/data.ts'
import type { CalendarSelection, CalendarSelectionProps } from '../../types/selection.ts'
import { MONTHS, buildCalendar, calendarStatus, filterCalendarRecords } from '../../services/data/calendar.ts'
import type { CalendarCell } from '../../services/data/calendar.ts'
import { calendarCsvFilename, downloadCsv, serializeMonthlySeries } from '../../services/data/csvExport.ts'
import CalendarGrid, { AnnualCalendarGrid, SingleCalendarMonth } from './CalendarGrid.tsx'
import CalendarDetail from './CalendarDetail.tsx'

function defaultPeriod(records: MonthlyRecord[], region: string, requestedYear?: number | null) {
  const regional = records.filter(r => r.region_id === region)
  const usable = regional.filter(r => r.status === 'ok')
  const available = usable.length ? usable : regional
  const latest = available.reduce<MonthlyRecord | undefined>((last, r) => !last || r.year * 12 + r.month > last.year * 12 + last.month ? r : last, undefined)
  const year = requestedYear ?? latest?.year ?? null
  const months = available.filter(r => r.year === year).map(r => r.month)
  return { year, month: months.length ? Math.max(...months) : latest?.month ?? 1 }
}

export default function HistoricalCalendar({ records, calibrated = [], demo = false, selection, onSelectionChange, mapHref, onOpenMap }: { records: MonthlyRecord[]; calibrated?: CalibratedRecord[]; demo?: boolean } & CalendarSelectionProps) {
  const regions = [...new Set(records.map(record => record.region_id))].sort()
  const [local, setLocal] = useState<CalendarSelection>(() => ({ region: regions[0] ?? '', ...defaultPeriod(records, regions[0] ?? ''), series: 'MODIS', scope: 'year' }))
  const [customScale, setCustomScale] = useState<number | null>(null)
  const [comparing, setComparing] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const region = selection?.region || local.region
  const fallback = defaultPeriod(records, region, selection?.year)
  const year = selection ? selection.year ?? fallback.year ?? 1 : local.year ?? 1
  const month = selection ? selection.month ?? fallback.month : local.month ?? 1
  const sensor = selection?.series ?? local.series
  const scope = selection?.scope ?? local.scope ?? 'year'
  const scaleMax = customScale ?? Math.max(1, ...records.filter(r => r.region_id === region).map(r => r.cell_days ?? 0))
  const years = buildCalendar(records, region, sensor)
  const yearNumbers = [...new Set([...years.map(r => r.year), year])].sort((a, b) => a - b)
  const cells = years.find(r => r.year === year)?.cells ?? MONTHS.map((_, i): CalendarCell => ({ year, month: i + 1, record: null, status: calendarStatus(null) }))
  const selected = cells[month - 1]
  const filteredRecords = filterCalendarRecords(records, region, sensor)
  const sensorHasRows = filteredRecords.length > 0

  // Resolve null defaults once from published rows, never from the system clock.
  useEffect(() => {
    if (selection && records.length && (!selection.region || selection.year === null || selection.month === null || !selection.scope)) {
      onSelectionChange?.({ region, year, month, series: sensor, scope })
    }
  }, [selection, records.length, region, year, month, sensor, scope, onSelectionChange])

  function change(patch: Partial<CalendarSelection>) {
    const next = { region, year, month, series: sensor, scope, ...patch }
    setExportError(null)
    if (selection && onSelectionChange) onSelectionChange(next)
    else setLocal(next)
  }
  function pick(cell: CalendarCell) { change({ year: cell.year, month: cell.month }) }
  function adjacentMonth(delta: number) {
    const date = year * 12 + month - 1 + delta
    change({ year: Math.floor(date / 12), month: date % 12 + 1 })
  }
  function exportCsv() {
    setExportError(null)
    try { downloadCsv(serializeMonthlySeries(filteredRecords), calendarCsvFilename(region, sensor, demo)) }
    catch (error) { setExportError(`No se pudo generar o iniciar la descarga CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`) }
  }
  const exportButton = <button className="calendar-export-button" type="button" disabled={!sensorHasRows} onClick={exportCsv}>Descargar CSV</button>
  if (!records.length) return <><p role="status">No hay datos disponibles en la serie mensual.</p>{exportButton}</>
  const yearIndex = yearNumbers.indexOf(year)
  const gridProps = { scaleMax, sensor, selected, onSelect: pick }

  return <>
    <div className="calendar-filters">
      <label>Modalidad<select aria-label="Modalidad del calendario" value={scope} onChange={event => change({ scope: event.target.value === 'month' ? 'month' : 'year' })}>
        <option value="year">Anual</option><option value="month">Mensual</option>
      </select></label>
      <label htmlFor="calendar-sensor">Serie<select id="calendar-sensor" value={sensor} onChange={event => change({ series: event.target.value as Sensor })}>
        <option value="MODIS">MODIS</option><option value="VIIRS">VIIRS</option>
      </select></label>
      <label htmlFor="calendar-region">Región<select id="calendar-region" value={region} onChange={event => change({ region: event.target.value })}>{regions.map(id => <option key={id}>{id}</option>)}</select></label>
      {exportButton}
    </div>
    <div className="calendar-period-toolbar">
      <button type="button" aria-label="Año anterior" disabled={yearIndex <= 0} onClick={() => change({ year: yearNumbers[yearIndex - 1] })}>←</button>
      <label>Año<select aria-label="Año del calendario" value={year} onChange={event => change({ year: Number(event.target.value) })}>{yearNumbers.map(y => <option key={y}>{y}</option>)}</select></label>
      <button type="button" aria-label="Año siguiente" disabled={yearIndex >= yearNumbers.length - 1} onClick={() => change({ year: yearNumbers[yearIndex + 1] })}>→</button>
      <button type="button" className="calendar-compare-toggle" aria-expanded={comparing} aria-controls="calendar-view" onClick={() => setComparing(!comparing)}>{comparing ? scope === 'year' ? 'Volver a la cuadrícula anual' : 'Volver al mes seleccionado' : 'Comparar años'}</button>
    </div>
    {exportError && <p role="alert">{exportError}</p>}
    {!sensorHasRows && <p role="status">No hay registros para {sensor} en {region}. Los meses se muestran como ausentes.</p>}
    <div className={comparing ? 'calendar-exploration calendar-exploration--history' : 'calendar-exploration'}>
      <div id="calendar-view" className="calendar-view">
        <h2>{comparing ? 'Comparación histórica' : scope === 'year' ? `Año ${year} · ${sensor}` : `${MONTHS[month - 1]} ${year} · ${sensor}`}</h2>
        {comparing ? <CalendarGrid years={years} region={region} {...gridProps} />
          : scope === 'year' ? <AnnualCalendarGrid cells={cells} year={year} {...gridProps} />
          : <>
            <div className="calendar-month-navigation">
              <button type="button" aria-label="Mes anterior" disabled={yearIndex === 0 && month === 1} onClick={() => adjacentMonth(-1)}>← Mes anterior</button>
              <label>Mes<select aria-label="Mes del calendario" value={month} onChange={event => change({ month: Number(event.target.value) })}>{MONTHS.map((name, i) => <option key={name} value={i + 1}>{name}</option>)}</select></label>
              <button type="button" aria-label="Mes siguiente" disabled={yearIndex === yearNumbers.length - 1 && month === 12} onClick={() => adjacentMonth(1)}>Mes siguiente →</button>
            </div>
            <SingleCalendarMonth cell={selected} {...gridProps} />
          </>}
        <section className="calendar-legend" aria-label="Leyenda">
          <h2>Leyenda · días-celda</h2>
          <p className="calendar-numeric-legend"><span className="calendar-swatch calendar-swatch--value" />{[0, .25, .5, .75, 1].map(f => (f * scaleMax).toFixed(1)).join(' · ')}</p>
          <ul>
            <li><span className="calendar-swatch calendar-cell--zero" />0 · válido</li>
            <li><span className="calendar-swatch calendar-cell--missing" />Sin dato utilizable</li>
            <li><span className="calendar-swatch calendar-cell--absent" />Ausente / no publicado</li>
          </ul>
          <details className="calendar-display-options"><summary>Ajustar escala visual</summary>
            <label>Máximo de escala (días-celda)<input type="number" min="1" value={scaleMax} onInput={event => { const value = Number(event.currentTarget.value); if (Number.isFinite(value) && value > 0) setCustomScale(value) }} /></label>
            <button type="button" onClick={() => setCustomScale(null)}>Escala automática</button>
            <p>Solo cambia la intensidad del color. Los valores superiores al máximo conservan su cifra.</p>
          </details>
        </section>
      </div>
      <CalendarDetail mapHref={mapHref} onOpenMap={onOpenMap} calibrated={calibrated} cell={selected} region={region} sensor={sensor} />
    </div>
    <p className="calendar-export-note">CSV{demo ? ' DEMO' : ''}: {filteredRecords.length} registros de {region} / {sensor}, todos los años cargados. Los meses ausentes no generan filas.</p>
  </>
}
