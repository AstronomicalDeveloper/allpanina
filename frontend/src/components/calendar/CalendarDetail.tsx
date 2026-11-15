import { MONTHS } from '../../services/data/calendar.ts'
import type { CalendarCell } from '../../services/data/calendar.ts'
import type { CalendarSelectionProps } from '../../types/selection.ts'
import type { CalibratedRecord, Sensor } from '../../types/data.ts'
import { CALENDAR_STATE_TEXT } from './calendarPresentation.ts'

interface Props extends Pick<CalendarSelectionProps, 'mapHref' | 'onOpenMap'> {
  calibrated?: CalibratedRecord[]
  cell: CalendarCell | null
  sensor: Sensor
  region: string
  sourceUrl?: string
}

export default function CalendarDetail({ cell, sensor, region, calibrated = [], sourceUrl, mapHref, onOpenMap }: Props) {
  const record = cell?.record
  const estimates = cell ? calibrated.filter(r => r.region_id === region && r.year === cell.year && r.month === cell.month) : []
  return (
    <section id="calendar-detail" className="calendar-detail" aria-labelledby="calendar-detail-title" aria-live="polite">
      <p className="calendar-eyebrow">Detalle del período</p>
      <h2 id="calendar-detail-title">{cell ? `${MONTHS[cell.month - 1]} ${cell.year}` : 'Selecciona un mes'}</h2>
      {!cell ? <p>Selecciona un mes para ver sus datos y procedencia.</p> : <>
        <div className="calendar-observation">
          <p className="calendar-observation-label">Observación · {sensor}</p>
          <p className="calendar-observed-value">{record?.status === 'ok' ? record.cell_days : '—'}</p>
          <p className="calendar-observed-unit">días-celda observados</p>
          <span className={`calendar-status-tag calendar-status-tag--${cell.status}`}>{cell.status === 'zero' ? '0 · válido' : CALENDAR_STATE_TEXT[cell.status]}</span>
        </div>
        {cell.status === 'absent' && <p className="calendar-state-note">No existe una fila para este período. La ausencia no equivale a cero.</p>}
        {record && record.status !== 'ok' && <p className="calendar-state-note">Sin dato utilizable. Los campos originales se conservan en la procedencia.</p>}
        {mapHref && <a className="calendar-map-action" href={mapHref({ region, year: cell.year, month: cell.month, series: sensor })} onClick={event => onOpenMap?.(event, { region, year: cell.year, month: cell.month, series: sensor })}>Ver este período en el mapa <span aria-hidden="true">↗</span></a>}
        <div className="calendar-estimates">
          <h3>Estimaciones regionales</h3>
          <p className="calendar-estimates-note">Valores recibidos de B0/B1, diferenciados de la observación. Sin calibración por celda.</p>
          {estimates.map(r => <article className="calendar-estimate" key={r.method} aria-label={`Estimación regional ${r.method}`}>
            <p className="calendar-estimate-value"><strong>{r.method}: {r.value ?? 'Sin dato'}</strong><span>días-celda</span></p>
            <p className="calendar-estimate-meta">split: <b>{r.split}</b> · status: {r.status}</p>
            <p className="calendar-estimate-residual">Residual: {r.residual ?? 'No disponible'}</p>
          </article>)}
          {!estimates.length && <p className="calendar-state-note">No hay estimaciones para este mes.</p>}
        </div>
        <details className="calendar-provenance">
          <summary>Estado y procedencia</summary>
          <dl>
            <div><dt>Región</dt><dd>{region}</dd></div>
            <div><dt>Año</dt><dd>{cell.year}</dd></div>
            <div><dt>Mes</dt><dd>{MONTHS[cell.month - 1]} ({cell.month})</dd></div>
            <div><dt>Sensor</dt><dd>{sensor}</dd></div>
            <div><dt>cell_days (días-celda)</dt><dd>{record?.cell_days ?? 'Sin dato'}</dd></div>
            <div><dt>status</dt><dd>{record?.status ?? 'No disponible: fila ausente'}</dd></div>
            <div><dt>source_version</dt><dd>{record?.source_version ?? 'No disponible'}</dd></div>
            <div><dt>updated_at (fecha del archivo)</dt><dd>{record?.updated_at ?? 'No disponible'}</dd></div>
          </dl>
          {sourceUrl && <p className="calendar-source">Archivo de observaciones: <a href={sourceUrl}>monthly_series.csv</a></p>}
          <p className="calendar-source">updated_at indica la actualización del archivo, no la fecha de una detección. Las detecciones no son incendios confirmados ni superficie quemada.</p>
        </details>
      </>}
    </section>
  )
}
