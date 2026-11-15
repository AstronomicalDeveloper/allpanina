import { MONTHS } from '../../../services/data/calendar'
import type { CalendarCell } from '../../../services/data/calendar'
import type { CalibratedRecord, Sensor } from '../../../types/data'
import type { CalendarSelectionProps } from '../../../types/selection'
import { CALENDAR_STATE_TEXT } from './calendarPresentation'
const decimal = new Intl.NumberFormat('es-PE', { maximumFractionDigits: 2 })
const format = (value: number | null) => value === null ? 'No disponible' : decimal.format(value)
type Props = Pick<CalendarSelectionProps,'mapHref'|'onOpenMap'> & { cell: CalendarCell | null; region: string; sensor: Sensor; calibrated?: CalibratedRecord[]; sourceUrl?: string }
export default function CalendarDetail({ cell, region, sensor, calibrated=[], sourceUrl, mapHref, onOpenMap }: Props) {
  const record=cell?.record
  const estimates=cell ? calibrated.filter(r=>r.region_id===region && r.year===cell.year && r.month===cell.month) : []
  const period=cell ? {region,year:cell.year,month:cell.month,series:sensor} : null
  return <aside id="calendar-detail" className="calendar-detail" aria-labelledby="calendar-description-title">
    <h2 id="calendar-description-title">Descripción</h2>
    <div className={cell?'calendar-detail-body':'calendar-detail-empty'} aria-live="polite">
      {!cell && <svg className="calendar-empty-symbol" viewBox="0 0 64 64" fill="none" aria-hidden="true"><rect x="9" y="13" width="46" height="42" rx="7" /><path d="M9 25h46M22 8v10M42 8v10" /><rect x="20" y="34" width="8" height="8" rx="2" /><path d="M36 38h7M24 47h19" /></svg>}
      <h3 id="calendar-detail-title">{cell?`${MONTHS[cell.month-1]} ${cell.year}`:'Selecciona un mes'}</h3>
      {!cell ? <p>Elige una celda para consultar su observación y procedencia.</p> : <>
        <p className="calendar-observation-label">Serie observada · {sensor}</p>
        <p className="calendar-observed-value">{record?.status==='ok'?record.cell_days:'—'}</p><p className="calendar-observed-unit">días-celda</p>
        <p className={`calendar-detail-state calendar-detail-state--${cell.status}`}>{cell.status==='zero'?'0 · válido':CALENDAR_STATE_TEXT[cell.status]}</p>
        {cell.status==='absent' && <p className="calendar-state-note">No hay registro publicado para este período. No equivale a cero.</p>}
        {mapHref && period && <a className="calendar-map-action" href={mapHref(period)} onClick={e=>onOpenMap?.(e,period)}>Ver este período en el mapa</a>}
        <details className="calendar-technical"><summary>Detalles científicos y procedencia</summary>
        {!!estimates.length && <section className="calendar-estimates"><h4>Comparación regional</h4><p>B0/B1 parten de VIIRS y se evalúan frente a MODIS. No son observaciones calibradas por celda.</p>{estimates.map(r=><div className="calendar-estimate" key={r.method}><strong title={r.value === null ? undefined : String(r.value)}>{r.method}: {r.value === null ? 'Sin dato' : format(r.value)}</strong><span>días-celda · split: {r.split}</span><span>Estado: {r.status} · Residual: {format(r.residual)}</span></div>)}</section>}
        <details className="calendar-provenance"><summary>Estado y procedencia</summary><dl><div><dt>Región</dt><dd>{region}</dd></div><div><dt>Sensor</dt><dd>{sensor}</dd></div><div><dt>cell_days</dt><dd>{record?.cell_days??'Sin dato'}</dd></div><div><dt>status</dt><dd>{record?.status??'Sin fila publicada'}</dd></div><div><dt>source_version</dt><dd>{record?.source_version??'No disponible'}</dd></div><div><dt>updated_at</dt><dd>{record?.updated_at??'No disponible'}</dd></div></dl>{sourceUrl && <a href={sourceUrl}>Archivo de observaciones</a>}<p>updated_at es la actualización del archivo, no la fecha de una detección.</p></details></details>
      </>}
    </div>
  </aside>
}
