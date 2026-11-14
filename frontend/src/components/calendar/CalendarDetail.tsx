import { MONTHS, cellLabel } from '../../services/data/calendar.ts'
import type { CalendarCell } from '../../services/data/calendar.ts'
import type { Sensor } from '../../types/data.ts'

interface Props { cell: CalendarCell | null; sensor: Sensor; region: string }

export default function CalendarDetail({ cell, sensor, region }: Props) {
  const record = cell?.record
  return (
    <section id="calendar-detail" className="calendar-detail" aria-labelledby="calendar-detail-title" aria-live="polite">
      <h2 id="calendar-detail-title">Detalle del mes</h2>
      {!cell ? <p>Selecciona un mes para ver sus datos y procedencia.</p> : <>
        <p>{cellLabel(cell)}{cell.status === 'absent' ? ': no existe una fila para esta combinación.' : ''}</p>
        {record && record.qc_status !== 'ok' && <p>El estado de calidad impide mostrar este mes como un valor válido. Los campos originales se conservan abajo.</p>}
        <dl>
          <div><dt>Región</dt><dd>{region}</dd></div>
          <div><dt>Año</dt><dd>{cell.year}</dd></div>
          <div><dt>Mes</dt><dd>{MONTHS[cell.month - 1]} ({cell.month})</dd></div>
          <div><dt>Sensor</dt><dd>{sensor}</dd></div>
          <div><dt>indicator (días-celda)</dt><dd>{record?.indicator ?? 'Sin dato'}</dd></div>
          <div><dt>n_detections (detecciones)</dt><dd>{record?.n_detections ?? 'Sin dato'}</dd></div>
          <div><dt>qc_status</dt><dd>{record?.qc_status ?? 'No disponible: fila ausente'}</dd></div>
          <div><dt>source_version</dt><dd>{record?.source_version ?? 'No disponible'}</dd></div>
          <div><dt>updated_at (fecha del archivo)</dt><dd>{record?.updated_at ?? 'No disponible'}</dd></div>
        </dl>
      </>}
    </section>
  )
}
