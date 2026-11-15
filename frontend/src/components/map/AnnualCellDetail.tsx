import { MONTHS } from '../../services/data/calendar.ts'
import { cellMonthlyActivity } from '../../services/data/mapExploration.ts'
import type { MapCellProperties, MapYear } from '../../services/data/mapExploration.ts'

export default function AnnualCellDetail({ cell, model }: { cell: MapCellProperties; model: MapYear }) {
  const months = cellMonthlyActivity(model, cell)
  const max = Math.max(1, ...months.map(m => m.value ?? 0))
  const covered = months.filter(m => m.status === 'ok').length
  return <div className="map-annual-detail">
    <p>Total observado acumulado: <strong>{cell.cell_days} días-celda</strong></p>
    <p>Meses cubiertos por el conjunto: {months.some(m => m.status !== 'unknown') ? `${covered}/12` : 'No disponible'}. Disponibilidad publicada; no mide cobertura de nubes.</p>
    <table className="map-month-bars">
      <caption>Desglose mensual de actividad observada (días-celda)</caption>
      <thead><tr><th scope="col">Mes</th><th scope="col">Actividad</th><th scope="col">Valor / estado</th></tr></thead>
      <tbody>{months.map(m => <tr key={m.month}>
        <th scope="row">{MONTHS[m.month - 1]}</th>
        <td aria-hidden="true"><span className={`map-month-track map-month-track--${m.value === null ? 'missing' : 'value'}`}>
          {m.value !== null && <span className="map-month-bar" style={{ width: `${m.value / max * 100}%` }} />}
        </span></td>
        <td>{m.value !== null ? m.value === 0 ? '0 · sin detecciones registradas' : m.value : m.status === 'missing' ? 'Sin dato utilizable' : m.status === 'unpublished' ? 'No publicado' : 'Cobertura no disponible'}</td>
      </tr>)}</tbody>
    </table>
    <p>Un mes utilizable sin registro de actividad para esta celda indica cero días con detección en la entrega. Los meses sin datos o no publicados permanecen sin valor.</p>
  </div>
}
