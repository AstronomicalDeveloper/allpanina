import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { datasetMode, datasetRoot } from '../../services/data/geography'
import { loadCalibratedSeries, loadManifest, loadMethodDocument, loadMonthlySeries, safelyLoad } from '../../services/data/loaders'
import type { LoadResult } from '../../services/data/loaders'
import type { CalibratedRecord, Manifest, MethodInfo, MonthlyRecord, NationalMethod } from '../../types/data'
import useExplorationSelection from '../../app/useExplorationSelection'
import TechnicalDetail from '../../components/ui/TechnicalDetail'
import { Button, Disclosure, Notice, formatPeriodRange } from '../../ui'
import { b1TestError, regionName } from './calendarData'
import CalendarView from './CalendarView'

type Publication = {
  monthly: LoadResult<MonthlyRecord[]>; calibrated: LoadResult<CalibratedRecord[]>
  manifest: LoadResult<Manifest>; method: LoadResult<MethodInfo | NationalMethod>
}

function Frame({ children }: { children: ReactNode }) {
  return <div className="historical-calendar calendar-v2 mx-auto flex max-w-[1280px] flex-col gap-6 px-4 py-8 sm:px-6 lg:px-10 lg:py-12">{children}</div>
}

function Title({ name }: { name: string | null }) {
  return <header className="calendar-heading"><h1 className="m-0 font-display text-4xl font-semibold text-ink sm:text-5xl">
    {name ? <>{name}<span className="sr-only"> · </span><span className="mt-1 block font-sans text-lg font-normal text-muted">Thermal detection calendar</span></> : 'Thermal detection calendar'}
  </h1></header>
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
      safelyLoad(() => loadMethodDocument(`${root}/method.json`, controller.signal)),
    ]).then(([monthly, calibrated, manifest, method]) => {
      if (!controller.signal.aborted) setData({ monthly, calibrated, manifest, method })
    })
    return () => controller.abort()
  }, [root, attempt])

  const manifest = data?.manifest.ok ? data.manifest.data : null
  const method = data?.method.ok ? data.method.data : null
  const records = data?.monthly.ok ? data.monthly.data : []
  const region = selection.region || manifest?.region_id || records[0]?.region_id || ''
  const national = method && 'contract_version' in method ? method : null
  const heading = regionName(method, region) ?? (region || null)
  const name = heading ?? region
  const retry = () => { setData(null); setAttempt(attempt + 1) }

  return <Frame>
    {!data ? <><Title name={heading} /><p role="status" className="m-0 text-base text-muted">Loading calendar…</p></>
      : !data.monthly.ok ? <><Title name={heading} />
        <Notice tone="error" title="The monthly series could not be loaded." action={<Button variant="secondary" size="sm" onClick={retry}>Retry loading</Button>}>
          <p>Check your connection and try again. No substitute values are shown.</p>
          <TechnicalDetail detail={data.monthly.error} />
        </Notice></>
      : manifest?.contract_version === '1.1' && !manifest.regions?.includes(region) ? <><Title name={region} />
        <Notice tone="error" title="This area is not part of the publication."><p>“{region}” is not in the published list. Choose an area in the top bar.</p></Notice></>
      : <>
        {(!data.calibrated.ok || !data.manifest.ok || !data.method.ok) && <Notice tone="error" title="Some published files could not be loaded." action={<Button variant="secondary" size="sm" onClick={retry}>Retry files</Button>}>
          <p>{!data.calibrated.ok && 'Estimates are not available. '}{!data.manifest.ok && 'The manifest is not available. '}{!data.method.ok && 'The area description is not available. '}The available observations are kept.</p>
          <TechnicalDetail detail={[data.calibrated, data.manifest, data.method].map(result => result.ok ? '' : result.error).filter(Boolean).join('\n')} />
        </Notice>}
        <CalendarView regionLabel={name} regions={[...new Set(records.map(r => r.region_id))].sort()} showRegionSelector={!national}
          records={records} calibrated={data.calibrated.ok ? data.calibrated.data : []} testError={id => b1TestError(method, id)}
          demo={demo} sourceUrl={root.startsWith('local:') ? '' : `${root}/monthly_series.csv`}
          selection={{ region, year: selection.year, month: selection.month, series: selection.calendarSeries, scope: selection.scope }}
          onSelectionChange={changeCalendar} mapHref={mapHref}
          onOpenMap={(event, period) => {
            if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
            event.preventDefault(); navigate(mapHref(period))
          }} />
      </>}
    <footer className="calendar-footer flex flex-col gap-3 border-t border-hairline pt-6">
      {manifest && <Disclosure summary="Published data" className="calendar-publication max-w-[68ch]">
        <p className="m-0">{formatPeriodRange(`${manifest.periodo.desde}:${manifest.periodo.hasta}`)} · {manifest.producto}</p>
      </Disclosure>}
      <p className="calendar-interpretation m-0 max-w-[68ch] text-sm text-muted">Thermal detections are not confirmed fires, nor burned area. Unit: cell-days, the regional sum of cell–day pairs with at least one detection.</p>
    </footer>
  </Frame>
}

export default function CalendarPage() {
  const [params] = useSearchParams()
  const mode = datasetMode(params)
  const root = datasetRoot(mode)
  return <CalendarPublication key={root} root={root} demo={mode === 'demo'} />
}
