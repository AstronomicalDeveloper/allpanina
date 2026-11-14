import { useState } from 'react'
import type { MonthlyRecord, Sensor } from '../../types/data.ts'
import type { SharedSelectionProps } from '../../types/selection.ts'
import { buildCalendar, filterCalendarRecords } from '../../services/data/calendar.ts'
import type { CalendarCell } from '../../services/data/calendar.ts'
import { calendarCsvFilename, downloadCsv, serializeMonthlySeries } from '../../services/data/csvExport.ts'
import CalendarGrid from './CalendarGrid.tsx'
import CalendarDetail from './CalendarDetail.tsx'

export default function HistoricalCalendar({ records, selection, onSelectionChange }: { records: MonthlyRecord[] } & SharedSelectionProps) {
  const regions = [...new Set(records.map(record => record.region_id))].sort()
  const [localRegion, setRegion] = useState(regions[0] ?? '')
  const [localSensor, setSensor] = useState<Sensor>('MODIS')
  const [localSelected, setSelected] = useState<CalendarCell | null>(null)
  const region = selection?.region || localRegion
  const sensor = selection?.sensor ?? localSensor
  const [exportError, setExportError] = useState<string | null>(null)
  const years = buildCalendar(records, region, sensor)
  const selected = selection?.year && selection.month ? years.find(row => row.year === selection.year)?.cells.find(cell => cell.month === selection.month) ?? null : localSelected
  const filteredRecords = filterCalendarRecords(records, region, sensor)
  const sensorHasRows = filteredRecords.length > 0

  function exportCsv() {
    setExportError(null)
    try {
      downloadCsv(serializeMonthlySeries(filteredRecords), calendarCsvFilename(region, sensor))
    } catch (error) {
      setExportError(`No se pudo generar o iniciar la descarga CSV: ${error instanceof Error ? error.message : 'Error desconocido'}`)
    }
  }
  const exportButton = <button className="calendar-export-button" type="button" disabled={!sensorHasRows} onClick={exportCsv}>Descargar CSV</button>

  if (!records.length) return <><p role="status">No hay datos disponibles en la serie mensual.</p>{exportButton}</>

  return (
    <>
      <div className="calendar-filters">
        <label htmlFor="calendar-region">Región
          <select id="calendar-region" value={region} onChange={event => { setRegion(event.target.value); setSelected(null); setExportError(null); onSelectionChange?.({ region: event.target.value, sensor, year: selection?.year ?? null, month: selection?.month ?? null }) }}>
            {regions.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label htmlFor="calendar-sensor">Sensor
          <select id="calendar-sensor" value={sensor} onChange={event => { const nextSensor = event.target.value as Sensor; setSensor(nextSensor); setSelected(null); setExportError(null); onSelectionChange?.({ region, sensor: nextSensor, year: selection?.year ?? null, month: selection?.month ?? null }) }}>
            <option value="MODIS">MODIS</option><option value="VIIRS">VIIRS</option>
          </select>
        </label>
        {exportButton}
      </div>
      <p>CSV DEMO: {filteredRecords.length} registros de {region} / {sensor}, todos los años cargados. Los meses ausentes no generan filas.</p>
      {exportError && <p role="alert">{exportError}</p>}
      {!sensorHasRows && <p role="status">No hay registros para {sensor} en {region}. Los meses se muestran como ausentes.</p>}
      <CalendarGrid years={years} region={region} sensor={sensor} selected={selected} onSelect={cell => { setSelected(cell); onSelectionChange?.({ region, sensor, year: cell.year, month: cell.month }) }} />
      <section className="calendar-legend" aria-label="Leyenda">
        <h2>Leyenda</h2>
        <ul>
          <li><span className="calendar-swatch calendar-swatch--value" />Valor positivo: azul proporcional a indicator, escala fija de 0 a 31 días-celda.</li>
          <li><span className="calendar-swatch calendar-cell--zero" />0 · válido: registro con qc_status=ok.</li>
          <li><span className="calendar-swatch calendar-cell--insufficient_data" />Insuficiente: qc_status=insufficient_data.</li>
          <li><span className="calendar-swatch calendar-cell--no_pass" />Sin paso: qc_status=no_pass.</li>
          <li><span className="calendar-swatch calendar-cell--absent" />Ausente: no existe fila para el mes y sensor.</li>
        </ul>
      </section>
      <CalendarDetail cell={selected} region={region} sensor={sensor} />
    </>
  )
}
