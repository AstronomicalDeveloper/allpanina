import { useEffect, useRef, useState } from 'react'
import type { CalibratedRecord, MonthlyRecord, Sensor } from '../../../types/data'
import type { CalendarSelection, CalendarSelectionProps } from '../../../types/selection'
import { MONTHS, buildCalendar, calendarStatus, filterCalendarRecords } from '../../../services/data/calendar'
import type { CalendarCell } from '../../../services/data/calendar'
import { calendarCsvFilename, downloadCsv, serializeMonthlySeries } from '../../../services/data/csvExport'
import CalendarGrid, { AnnualCalendarGrid } from './CalendarGrid'
import CalendarDetail from './CalendarDetail'
import { calendarHeatColor } from './calendarPresentation'

const comparisonKey = 'allpanina.calendar.comparison-years'
function storedYears(): Record<string, number[]> {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(comparisonKey) ?? '{}')
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
    return Object.fromEntries(Object.entries(value).filter(([, years]) => Array.isArray(years) && years.every(y => Number.isInteger(y) && y > 0 && y < 10000)))
  } catch { return {} }
}
type Props = Pick<CalendarSelectionProps, 'mapHref' | 'onOpenMap'> & {
  regionLabel: string; records: MonthlyRecord[]; calibrated: CalibratedRecord[]; demo: boolean; sourceUrl: string;
  selection: CalendarSelection; onSelectionChange: (next: CalendarSelection) => void;
}
export default function CalendarExplorer({ regionLabel, records, calibrated, demo, sourceUrl, selection, onSelectionChange, mapHref, onOpenMap }: Props) {
  const [yearChoices, setYearChoices] = useState(storedYears)
  useEffect(() => {
    try { window.sessionStorage.setItem(comparisonKey, JSON.stringify(yearChoices)) } catch { /* Local state still works when storage is unavailable. */ }
  }, [yearChoices])
  const yearMenu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof window.Node && !yearMenu.current?.contains(event.target) && yearMenu.current) yearMenu.current.open = false
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [])
  const [comparing, setComparing] = useState(false)
  const [customScale, setCustomScale] = useState<number | null>(null)
  const [exportError, setExportError] = useState<string | null>(null)
  const regions = [...new Set(records.map(r => r.region_id))].sort()
  const region = selection.region || regions[0] || ''
  const sensor = selection.series
  const years = buildCalendar(records, region, sensor)
  const initialYears = years.slice(-3).map(r=>r.year)
  const comparisonYears = yearChoices[region] ?? initialYears
  const compared = years.filter(r=>comparisonYears.includes(r.year))
  const year = selection.year ?? years.at(-1)?.year ?? 0
  const yearNumbers = [...new Set([...years.map(r => r.year), ...(year ? [year] : [])])].sort((a,b) => a-b)
  const cells = years.find(r => r.year === year)?.cells ?? MONTHS.map((_,i): CalendarCell => ({ year, month: i+1, record: null, status: calendarStatus(null) }))
  const selected = selection.month === null || (comparing && !comparisonYears.includes(year)) ? null : cells[selection.month-1]
  const scaleMax = customScale ?? Math.max(1, ...records.filter(r => r.region_id === region).map(r => r.cell_days ?? 0))
  const visibleRecords = filterCalendarRecords(records, region, sensor)
  const change = (patch: Partial<CalendarSelection>) => onSelectionChange({ ...selection, region, year, ...patch })
  function chooseYears(values: number[]) {
    setYearChoices(previous=>({...previous,[region]:values}))
    if (selection.month !== null && !values.includes(year)) change({ month: null })
  }
  const index = yearNumbers.indexOf(year)
  const gridProps = { scaleMax, sensor, selected, onSelect: (cell: CalendarCell) => change({ year: cell.year, month: cell.month }) }
  function exportCsv() {
    setExportError(null)
    try { downloadCsv(serializeMonthlySeries(visibleRecords), calendarCsvFilename(region,sensor,demo)) }
    catch (error) { setExportError(`No se pudo descargar el CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`) }
  }
  const detail = <CalendarDetail cell={selected} region={region} sensor={sensor} calibrated={calibrated} sourceUrl={sourceUrl} mapHref={mapHref} onOpenMap={onOpenMap} />
  return <>
    <div className="calendar-options" aria-label="Opciones del calendario">
      <header className="calendar-heading"><h1>Calendario histórico</h1><span>{regionLabel || region}</span></header>

      {regions.length > 1 && <label>Región<select id="calendar-region" value={region} onChange={e=>change({region:e.target.value})}>{regions.map(id=><option key={id}>{id}</option>)}</select></label>}



      <div className="calendar-toolbar-controls">
      <div className="calendar-period-slot">
      <div className="calendar-year-navigation" aria-hidden={comparing}><button type="button" aria-label="Año anterior" disabled={comparing || index<=0} onClick={()=>change({year:yearNumbers[index-1]})}>‹</button><select disabled={comparing} aria-label="Año del calendario" value={year} onChange={e=>change({year:Number(e.target.value)})}>{yearNumbers.map(y=><option key={y}>{y}</option>)}</select><button type="button" aria-label="Año siguiente" disabled={comparing || index<0 || index>=yearNumbers.length-1} onClick={()=>change({year:yearNumbers[index+1]})}>›</button>
      </div>
      {comparing && <details className="calendar-year-menu" ref={yearMenu} onKeyDown={event => {
        if (event.key === 'Escape') { event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus() }
      }}><summary>Elegir años <span className="calendar-year-count">{compared.length}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg></summary>
      <div className="calendar-year-dropdown">
        <label className="calendar-all-years"><input type="checkbox" aria-label="Todos los años" checked={years.length>0 && compared.length===years.length} onChange={e=>chooseYears(e.target.checked?years.map(r=>r.year):[])} />Todos los años</label>
        <div className="calendar-year-choices">{years.map(row=>{const available=row.cells.filter(c=>c.status==='value'||c.status==='zero').length;return <label key={row.year}><input type="checkbox" aria-label={`Comparar ${row.year}`} checked={comparisonYears.includes(row.year)} onChange={e=>chooseYears(e.target.checked?[...comparisonYears,row.year]:comparisonYears.filter(y=>y!==row.year))} /><span>{row.year}{available<12 && <small title={`${available}/12 meses con datos`}>Parcial · {available}/12</small>}</span></label>})}</div>
      </div></details>}
      </div>
      <div className="calendar-perspectives" role="group" aria-label="Visualización del calendario"><button type="button" aria-pressed={!comparing} onClick={()=>setComparing(false)}>Un año</button><button type="button" aria-pressed={comparing} onClick={()=>setComparing(true)}>Comparar años</button></div>
      <label className="calendar-series" htmlFor="calendar-sensor"><span className="calendar-accessible-label">Serie observada</span><select id="calendar-sensor" value={sensor} onChange={e => change({ series: e.target.value as Sensor })}><option>MODIS</option><option>VIIRS</option></select></label>
      <button className="calendar-export-button" type="button" aria-label="Descargar CSV" title="Descargar CSV" disabled={!visibleRecords.length} onClick={exportCsv}><svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M5 16v5h14v-5" /></svg></button>
      </div>
    </div>
    {exportError && <p role="alert">{exportError}</p>}
    <div className={`calendar-exploration${comparing ? ' calendar-exploration--history' : ''}`}>
      {comparing && detail}
      <section className="calendar-visual" aria-label={comparing ? 'Comparación histórica' : `Calendario anual ${year}`}>
        {!records.length ? <p role="status">No hay datos disponibles en la serie mensual.</p> : comparing ? compared.length ? <CalendarGrid years={compared} region={region} {...gridProps} /> : <p role="status">Selecciona al menos un año para comparar.</p> : <AnnualCalendarGrid cells={cells} year={year} {...gridProps} />}
        {!!records.length && !visibleRecords.length && <p role="status">No hay registros para {region} / {sensor}. No se sustituyen por ceros.</p>}
        <section className="calendar-legend" aria-label="Leyenda">
          <details className="calendar-scale-control"><summary>Escala</summary><div><label>Máximo de escala (días-celda)<input type="number" min="1" value={scaleMax} onInput={e=>{const value=Number(e.currentTarget.value);if(Number.isFinite(value)&&value>0)setCustomScale(value)}} /></label><button type="button" onClick={()=>setCustomScale(null)}>Automática</button><p>La saturación solo afecta el color; los valores se conservan.</p></div></details>
          <div className="calendar-numeric-legend"><span className="calendar-legend-title">Intensidad observada <small>días-celda</small></span><div className="calendar-scale-gradient" aria-hidden="true" style={{background:`linear-gradient(to right, ${calendarHeatColor(0,scaleMax)}, ${calendarHeatColor(scaleMax,scaleMax)})`}} /><div className="calendar-scale-ticks">{[0,.25,.5,.75,1].map(f=><span key={f}>{(f*scaleMax).toFixed(1)}</span>)}</div></div>
          <ul><li><i className="calendar-cell--zero" />Cero válido</li><li><i className="calendar-cell--missing" />Sin dato</li><li><i className="calendar-cell--absent" />No publicado</li></ul>
        </section>
      </section>
      {!comparing && detail}
    </div>
    <p className="calendar-export-note">CSV: {visibleRecords.length} registros de {region || 'la región'} / {sensor}, todos los años disponibles. La selección del mes no filtra la descarga.</p>
  </>
}
