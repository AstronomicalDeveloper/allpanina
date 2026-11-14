import { useState } from 'react'
import type { MonthlyRecord, Sensor } from '../../types/data.ts'
import { buildCalendar } from '../../services/data/calendar.ts'
import type { CalendarCell } from '../../services/data/calendar.ts'
import CalendarGrid from './CalendarGrid.tsx'
import CalendarDetail from './CalendarDetail.tsx'

export default function HistoricalCalendar({ records }: { records: MonthlyRecord[] }) {
  const regions = [...new Set(records.map(record => record.region_id))].sort()
  const [region, setRegion] = useState(regions[0] ?? '')
  const [sensor, setSensor] = useState<Sensor>('MODIS')
  const [selected, setSelected] = useState<CalendarCell | null>(null)
  const years = buildCalendar(records, region, sensor)
  const sensorHasRows = records.some(record => record.region_id === region && record.sensor === sensor)

  if (!records.length) return <p role="status">No hay datos disponibles en la serie mensual.</p>

  return (
    <>
      <div className="calendar-filters">
        <label htmlFor="calendar-region">Región
          <select id="calendar-region" value={region} onChange={event => { setRegion(event.target.value); setSelected(null) }}>
            {regions.map(id => <option key={id} value={id}>{id}</option>)}
          </select>
        </label>
        <label htmlFor="calendar-sensor">Sensor
          <select id="calendar-sensor" value={sensor} onChange={event => { setSensor(event.target.value as Sensor); setSelected(null) }}>
            <option value="MODIS">MODIS</option><option value="VIIRS">VIIRS</option>
          </select>
        </label>
      </div>
      {!sensorHasRows && <p role="status">No hay registros para {sensor} en {region}. Los meses se muestran como ausentes.</p>}
      <CalendarGrid years={years} region={region} sensor={sensor} selected={selected} onSelect={setSelected} />
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
