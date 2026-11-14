import { useEffect, useState } from 'react'
import { loadMonthlySeries, safelyLoad } from '../../services/data/loaders.ts'
import type { MonthlyRecord } from '../../types/data.ts'
import type { SharedSelectionProps } from '../../types/selection.ts'
import HistoricalCalendar from './HistoricalCalendar.tsx'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; records: MonthlyRecord[] }

function CalendarLoader({ dataUrl, selection, onSelectionChange }: { dataUrl: string } & SharedSelectionProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void safelyLoad(() => loadMonthlySeries(dataUrl, controller.signal)).then(result => {
      if (controller.signal.aborted) return
      setState(result.ok ? { status: 'loaded', records: result.data } : { status: 'error', message: result.error })
    })
    return () => controller.abort()
  }, [dataUrl, attempt])

  if (state.status === 'loading') return <p role="status">Cargando serie mensual…</p>
  if (state.status === 'error') return <div role="alert">
    <p>No se pudo cargar el calendario: {state.message}</p>
    <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt(attempt + 1) }}>Reintentar carga</button>
  </div>
  return <HistoricalCalendar records={state.records} selection={selection} onSelectionChange={onSelectionChange} />
}

export default function CalendarPage({ dataUrl, selection, onSelectionChange }: { dataUrl: string } & SharedSelectionProps) {
  return (
    <main className="historical-calendar">
      <h1>Calendario histórico</h1>
      <p className="calendar-demo"><strong>DATOS DEMO — NO SON OBSERVACIONES REALES</strong></p>
      <p>Serie mensual observada según el contrato de Aldo, ilustrada con datos sintéticos. indicator se expresa en días-celda; n_detections cuenta detecciones.</p>
      <p>No representa incendios confirmados ni superficie quemada. updated_at es la fecha de actualización del archivo, no la fecha de una detección.</p>
      <p className="calendar-source">Archivo: {dataUrl}</p>
      <CalendarLoader key={dataUrl} dataUrl={dataUrl} selection={selection} onSelectionChange={onSelectionChange} />
    </main>
  )
}
