import { MONTHS, cellLabel } from '../../services/data/calendar.ts'
import type { CalendarCell } from '../../services/data/calendar.ts'
import type { CalibratedRecord, Sensor } from '../../types/data.ts'

interface Props { calibrated?: CalibratedRecord[]; cell: CalendarCell | null; sensor: Sensor; region: string }

export default function CalendarDetail({ cell, sensor, region, calibrated = [] }: Props) {
  const record = cell?.record
  return (
    <section id="calendar-detail" className="calendar-detail" aria-labelledby="calendar-detail-title" aria-live="polite">
      <h2 id="calendar-detail-title">Detalle del mes</h2>
      {!cell ? <p>Selecciona un mes para ver sus datos y procedencia.</p> : <>
        <p>{cellLabel(cell)}{cell.status === 'absent' ? ': no existe una fila para esta combinación.' : ''}</p>
        {record && record.status !== 'ok' && <p>El estado de calidad impide mostrar este mes como un valor válido. Los campos originales se conservan abajo.</p>}
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
        <h3>Estimaciones regionales recibidas (sin calibración por celda)</h3>
        {calibrated.filter(r => r.region_id === region && r.year === cell.year && r.month === cell.month).map(r => <p key={r.method}>{r.method}: {r.value ?? 'Sin dato'} días-celda · split: {r.split} · status: {r.status} · residual: {r.residual ?? 'No disponible'}</p>)}
        {!calibrated.some(r => r.region_id === region && r.year === cell.year && r.month === cell.month) && <p>No hay estimaciones para este mes.</p>}
      </>}
    </section>
  )
}
