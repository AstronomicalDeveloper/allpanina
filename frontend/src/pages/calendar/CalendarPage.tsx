import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { loadMonthlySeries, loadCalibratedSeries, loadManifest, loadMethod, safelyLoad } from '../../services/data/loaders'
import type { LoadResult } from '../../services/data/loaders'
import type { MonthlyRecord, CalibratedRecord, Manifest, MethodInfo } from '../../types/data'
import useExplorationSelection from '../../app/useExplorationSelection'
import CalendarExplorer from './sections/CalendarExplorer'
import CalendarDetail from './sections/CalendarDetail'

type Publication = {
  monthly: LoadResult<MonthlyRecord[]>; calibrated: LoadResult<CalibratedRecord[]>;
  manifest: LoadResult<Manifest>; method: LoadResult<MethodInfo>;
}
function CalendarPublication({ root, demo }: { root: string; demo: boolean }) {
  const [data, setData] = useState<Publication | null>(null)
  const [attempt, setAttempt] = useState(0)
  const { selection, changeCalendar, mapHref } = useExplorationSelection()
  const navigate = useNavigate()
  useEffect(() => {
    const controller = new AbortController()
    void Promise.all([
      safelyLoad(() => loadMonthlySeries(`${root}/monthly_series.csv`, controller.signal)),
      safelyLoad(() => loadCalibratedSeries(`${root}/calibrated_series.csv`, controller.signal)),
      safelyLoad(() => loadManifest(`${root}/manifest.json`, controller.signal)),
      safelyLoad(() => loadMethod(`${root}/method.json`, controller.signal)),
    ]).then(([monthly, calibrated, manifest, method]) => {
      if (!controller.signal.aborted) setData({ monthly, calibrated, manifest, method })
    })
    return () => controller.abort()
  }, [root, attempt])
  const manifest = data?.manifest.ok ? data.manifest.data : null
  const method = data?.method.ok ? data.method.data : null
  const region = selection.region || manifest?.region_id || (data?.monthly.ok ? data.monthly.data[0]?.region_id : '') || ''
  const name = method?.region_id === region ? method.region?.split('. ')[0].replace(/^Departamento de /, '') : null
  const retry = () => { setData(null); setAttempt(attempt + 1) }
  return <div className="historical-calendar calendar-v2">
    {(!data || !data.monthly.ok) && <header className="calendar-heading"><h1>Calendario histórico</h1><span>{name ?? (region || 'Actividad térmica regional')}</span></header>}
    {demo && <p className="calendar-demo"><strong>DATOS DEMO — NO SON OBSERVACIONES REALES</strong></p>}
    {!data ? <div className="calendar-exploration"><p role="status">Cargando calendario…</p><CalendarDetail cell={null} region={region} sensor={selection.calendarSeries} /></div>
      : !data.monthly.ok ? <div className="calendar-exploration"><div role="alert"><p>No se pudo cargar el calendario: {data.monthly.error}</p><button type="button" onClick={retry}>Reintentar carga</button></div><CalendarDetail cell={null} region={region} sensor={selection.calendarSeries} /></div>
      : <>
        {(!data.calibrated.ok || !data.manifest.ok || !data.method.ok) && <div role="alert"><p>{!data.calibrated.ok && `Estimaciones no disponibles: ${data.calibrated.error}. `}{!data.manifest.ok && `Manifiesto no disponible: ${data.manifest.error}. `}{!data.method.ok && `Descripción de región no disponible: ${data.method.error}. `}Las observaciones disponibles se conservan.</p><button type="button" onClick={retry}>Reintentar archivos</button></div>}
        <CalendarExplorer regionLabel={name ?? region} records={data.monthly.data} calibrated={data.calibrated.ok ? data.calibrated.data : []} demo={demo} sourceUrl={`${root}/monthly_series.csv`} selection={{ region, year: selection.year, month: selection.month, series: selection.calendarSeries, scope: selection.scope }} onSelectionChange={changeCalendar} mapHref={mapHref} onOpenMap={(event, period) => {
          if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
          event.preventDefault(); navigate(mapHref(period))
        }} />
      </>}
    <footer className="calendar-footer">
    {manifest && <details className="calendar-publication"><summary>Datos publicados</summary><p>{manifest.periodo.desde} — {manifest.periodo.hasta}<br />{manifest.producto}</p></details>}
    <p className="calendar-interpretation">Las detecciones térmicas no equivalen a incendios confirmados ni a superficie quemada. Unidad: días-celda, suma regional de pares celda-día con detección.</p>
    </footer>
  </div>
}
export default function CalendarPage() {
  const [params] = useSearchParams()
  const demo = params.get('data') === 'demo'
  const root = `${import.meta.env?.BASE_URL ?? '/'}data${demo ? '/demo' : ''}`
  return <CalendarPublication key={root} root={root} demo={demo} />
}
