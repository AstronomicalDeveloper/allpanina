import { useEffect, useState } from 'react'
import { loadMonthlySeries, loadCalibratedSeries, safelyLoad } from '../../services/data/loaders.ts'
import type { CalibratedRecord, MonthlyRecord } from '../../types/data.ts'
import type { LoadResult } from '../../services/data/loaders.ts'
import type { CalendarSelectionProps } from '../../types/selection.ts'
import HistoricalCalendar from './HistoricalCalendar.tsx'

type State = { status: 'loading' } | { status: 'error'; message: string } | { status: 'loaded'; records: MonthlyRecord[] }

function CalendarLoader({ dataUrl, selection, onSelectionChange, mapHref, onOpenMap }: { dataUrl: string } & CalendarSelectionProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [calibrated, setCalibrated] = useState<LoadResult<CalibratedRecord[]> | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void safelyLoad(() => loadMonthlySeries(dataUrl, controller.signal)).then(result => {
      if (controller.signal.aborted) return
      setState(result.ok ? { status: 'loaded', records: result.data } : { status: 'error', message: result.error })
    })
    void safelyLoad(() => loadCalibratedSeries(dataUrl.replace(/[^/]+$/, 'calibrated_series.csv'), controller.signal)).then(result => { if (!controller.signal.aborted) setCalibrated(result) })
    return () => controller.abort()
  }, [dataUrl, attempt])

  if (state.status === 'loading') return <p role="status">Cargando serie mensual…</p>
  if (state.status === 'error') return <div role="alert">
    <p>No se pudo cargar el calendario: {state.message}</p>
    <button type="button" onClick={() => { setState({ status: 'loading' }); setAttempt(attempt + 1) }}>Reintentar carga</button>
  </div>
  return <>{!calibrated && <p role="status">Cargando estimaciones regionales…</p>}{calibrated && !calibrated.ok && <div role="alert">No se pudo cargar calibrated_series.csv: {calibrated.error}<button type="button" onClick={() => { setCalibrated(null); setAttempt(attempt + 1) }}>Reintentar estimaciones</button></div>}<HistoricalCalendar sourceUrl={dataUrl} calibrated={calibrated?.ok ? calibrated.data : []} demo={dataUrl.includes('/demo/')} records={state.records} selection={selection} onSelectionChange={onSelectionChange} mapHref={mapHref} onOpenMap={onOpenMap} /></>
}

export default function CalendarPage({ dataUrl, selection, onSelectionChange, mapHref, onOpenMap }: { dataUrl: string } & CalendarSelectionProps) {
  return (
    <main className="historical-calendar">
      <header className="calendar-heading">
        <h1>Calendario histórico</h1>
        <p>Explora detecciones térmicas por mes, en días-celda; no incendios confirmados.</p>
      </header>
      {dataUrl.includes('/demo') && <p className="calendar-demo"><strong>DATOS DEMO — NO SON OBSERVACIONES REALES</strong></p>}
      <CalendarLoader key={dataUrl} dataUrl={dataUrl} selection={selection} onSelectionChange={onSelectionChange} mapHref={mapHref} onOpenMap={onOpenMap} />
    </main>
  )
}
