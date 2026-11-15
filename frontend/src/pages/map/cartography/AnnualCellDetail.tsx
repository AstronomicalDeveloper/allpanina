import { MONTHS } from '../../../services/data/calendar.ts'
import { cellMonthlyActivity } from '../../../services/data/mapExploration.ts'
import type { MapCellProperties, MapYear } from '../../../services/data/mapExploration.ts'

export default function AnnualCellDetail({ cell, model, national = false }: { cell: MapCellProperties; model: MapYear; national?: boolean }) {
  const months = cellMonthlyActivity(model, cell)
  const max = Math.max(1, ...months.map(m => m.value ?? 0))
  const covered = months.filter(m => m.status === 'ok').length
  return <div className="map-annual-detail">
    <p>Año {cell.year} · {cell.sensor_group}</p><p><strong>{cell.cell_days} {national?'días-celda de 1 km':cell.cell_days === 1 ? 'día' : 'días'} con detecciones térmicas</strong></p>
    <p>{national?'Suma de pares celda-día de 1 km acumulados dentro de la cuadrícula de 10 km en los meses disponibles del año. No representa días distintos de la cuadrícula ni un total departamental.':'Suma de días registrados en esta celda durante los meses disponibles del año. No tienen que ser consecutivos ni equivalen a ese número de incendios.'}</p>
    {months.some(m => m.status !== 'unknown') && <p>{covered === 12 ? 'Año completo' : 'Año parcial'} · {covered}/12 meses utilizables.</p>}
    {!months.some(m => m.status !== 'unknown') && <p>Disponibilidad mensual no disponible.</p>}
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
    <p>Un mes utilizable sin registro de actividad para esta celda indica cero días-celda en la entrega. Los meses sin datos o no publicados permanecen sin valor.</p>
  </div>
}
