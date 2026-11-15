import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { datasetRoot } from '../../services/data/geography'
import { loadMethodDocument, loadMonthlySeries, safelyLoad } from '../../services/data/loaders'
import type { LoadResult } from '../../services/data/loaders'
import type { MethodInfo, MonthlyRecord, NationalMethod } from '../../types/data'
import { ROUTES } from '../../shell/routes'
import { areaName } from '../../shell/scope'
import { Button, ButtonLink, Select, Stat, formatMonth, formatMonthLong } from '../../ui'
import { seriesYears } from '../calendar/calendarData'
import HeroCalendar from './HeroCalendar'

type Published = { monthly: LoadResult<MonthlyRecord[]>; method: LoadResult<MethodInfo | NationalMethod> }

const linkClass = 'font-medium text-ink underline decoration-hairline underline-offset-4 hover:decoration-ink'
const h2 = 'm-0 font-display text-2xl font-semibold text-ink sm:text-3xl'

/** Portada (A4): titular, elección de departamento y el calendario de 14 años con datos publicados del Perú. */
export default function LandingPage() {
  const [data, setData] = useState<Published | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [region, setRegion] = useState('PE')
  useEffect(() => {
    const controller = new AbortController(), root = datasetRoot('peru')
    void Promise.all([
      safelyLoad(() => loadMonthlySeries(`${root}/monthly_series.csv`, controller.signal)),
      safelyLoad(() => loadMethodDocument(`${root}/method.json`, controller.signal)),
    ]).then(([monthly, method]) => { if (!controller.signal.aborted) setData({ monthly, method }) })
    return () => controller.abort()
  }, [attempt])

  const records = data?.monthly.ok ? data.monthly.data : []
  const method = data?.method.ok && 'contract_version' in data.method.data ? data.method.data : null
  const areas = method ? method.regions.map(r => ({ id: r.region_id, name: areaName(r.region_id, r.nombre) })) : [{ id: 'PE', name: 'Peru' }]
  const regionLabel = areas.find(a => a.id === region)?.name ?? region
  const years = seriesYears(records, [], region, 'MODIS')
  const departments = areas.filter(a => a.id !== 'PE').length
  const cells = years.flatMap(row => row.cells).filter(c => c.state !== 'absent')
  const first = cells[0], last = cells.at(-1)
  const scoped = (path: string) => `${path}?${new URLSearchParams({ mapRegion: region })}`

  return <article className="landing">
    <section className="bg-night text-white" aria-labelledby="landing-title">
      <div className="mx-auto grid max-w-[1440px] gap-12 px-4 py-14 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,620px)] lg:gap-16 lg:px-10 lg:py-20">
        <div className="flex flex-col justify-center gap-6">
          <h1 id="landing-title" className="m-0 max-w-[14ch] font-display text-4xl font-semibold leading-[1.02] text-white sm:text-5xl">Fourteen years of thermal detections in Peru, seen from space</h1>
          <p className="m-0 max-w-[46ch] text-lg text-mist">AllpaNina joins the detections of NASA's MODIS and VIIRS satellite instruments into one monthly series for Peru and each of its 25 departments, so regional governments can see when and where thermal activity concentrates before each season.</p>
          <form className="flex flex-wrap items-center gap-3" onSubmit={event => event.preventDefault()}>
            <label htmlFor="landing-region" className="sr-only">Department</label>
            <Select id="landing-region" className="min-w-[15rem]" value={region} onChange={event => setRegion(event.target.value)} disabled={!method}>
              {areas.map(area => <option key={area.id} value={area.id}>{area.id === 'PE' ? 'Peru (all departments)' : area.name}</option>)}
            </Select>
            <ButtonLink variant="glow" to={scoped(ROUTES.calendar)}>See its calendar</ButtonLink>
            <Link to={ROUTES.method} className="text-base text-white underline underline-offset-4 hover:text-mist">How we measure it</Link>
          </form>
        </div>
        <div className="min-w-0">
          {!data ? <div className="grid h-[22rem] place-items-center rounded-panel border border-rule"><p role="status" className="m-0 text-sm text-mist">Loading the calendar…</p></div>
            : !data.monthly.ok ? <div role="alert" className="flex h-[22rem] flex-col items-start justify-center gap-3 rounded-panel border border-rule p-6 text-sm text-mist">
              <p className="m-0 text-base text-white">The published series could not be loaded.</p>
              <p className="m-0">Check your connection and try again. Nothing is shown in its place.</p>
              <Button variant="glow" size="sm" onClick={() => { setData(null); setAttempt(attempt + 1) }}>Retry</Button>
            </div>
            : <HeroCalendar years={years} region={region} regionLabel={regionLabel} />}
        </div>
      </div>
    </section>

    <section aria-label="How to use AllpaNina" className="border-b border-hairline">
      <ol className="mx-auto m-0 grid max-w-[1440px] list-none gap-10 px-4 py-14 sm:px-6 md:grid-cols-3 md:gap-0 lg:px-10">
        {[
          { n: 1, title: 'When', text: 'The calendar shows every month since 2013 and when thermal activity concentrates in each department.', to: scoped(ROUTES.calendar), action: 'Open the calendar' },
          { n: 2, title: 'Where', text: 'The map places the cells with detections on the territory, by year or by month.', to: scoped(ROUTES.map), action: 'Open the map' },
          { n: 3, title: 'How reliable', text: 'We calibrated VIIRS against MODIS and tested it once, on months the method had not seen. We publish the error.', to: scoped(ROUTES.method), action: 'Read the method' },
        ].map(step => <li key={step.n} className="flex flex-col gap-3 md:border-l md:border-hairline md:px-8 md:first:border-l-0 md:first:pl-0">
          <span className="font-display text-sm font-semibold text-cinder">{step.n}</span>
          <h2 className="m-0 font-display text-2xl font-semibold text-ink">{step.title}</h2>
          <p className="m-0 max-w-[40ch] text-base text-muted">{step.text}</p>
          <Link className={linkClass} to={step.to}>{step.action}</Link>
        </li>)}
      </ol>
    </section>

    <section aria-labelledby="landing-who" className="border-b border-hairline">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:px-10">
        <div className="flex flex-col gap-4">
          <h2 id="landing-who" className={h2}>Who it is for</h2>
          <p className="m-0 max-w-[60ch] text-base text-muted">Regional governments and the agencies that plan fire prevention. Real-time alerts already exist; AllpaNina adds the history behind them: which months and which departments concentrate thermal activity, and how each year compares with the others.</p>
          <p className="m-0 max-w-[60ch] text-base text-muted">The detections come from NASA FIRMS: MODIS on the Terra and Aqua satellites, and VIIRS on Suomi NPP. Department boundaries are the official ones from INEI.</p>
        </div>
        <div className="grid grid-cols-1 content-center gap-6 sm:grid-cols-3">
          <Stat value={first && last ? last.year - first.year + 1 : 14} label={first && last ? `years, ${formatMonth(first.year, first.month)} to ${formatMonth(last.year, last.month)}` : 'years of records'} />
          <Stat value={departments || 25} label="departments, plus Peru as a whole" />
          <Stat value={2} label="instruments: MODIS and VIIRS" />
        </div>
      </div>
    </section>

    <section aria-labelledby="landing-read" className="border-b border-hairline">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 py-14 sm:px-6 lg:px-10">
        <h2 id="landing-read" className={h2}>How to read the results</h2>
        <dl className="m-0 grid gap-x-12 gap-y-6 md:grid-cols-2">
          {[
            ['Cell-days', 'A cell-day is one 1 km cell on one day with at least one thermal detection. Monthly totals add up cell-days; they are not a number of fires.'],
            ['Colours', 'Each calendar has 9 colour classes by quantile, computed for that area and series. Compare months and years within an area; to compare areas, compare the numbers.'],
            ['Zero, missing and not published', 'Zero means no detections were recorded, not that there was no fire. Hatched cells have no usable data, and dashed cells were not published; neither is a zero.'],
            ['The B1 estimate', 'B1 brings VIIRS to the MODIS scale with one factor per area. It is an estimate. Its published error covers the whole test period; it is not the error of a single month.'],
          ].map(([term, text]) => <div key={term} className="flex flex-col gap-1.5">
            <dt className="font-display text-lg font-semibold text-ink">{term}</dt>
            <dd className="m-0 max-w-[60ch] text-base text-muted">{text}</dd>
          </div>)}
        </dl>
      </div>
    </section>

    <section aria-labelledby="landing-limits">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-6 px-4 py-14 sm:px-6 lg:px-10">
        <h2 id="landing-limits" className={h2}>What these data do not say</h2>
        <ul className="m-0 flex max-w-[68ch] list-disc flex-col gap-2 pl-5 text-base text-muted">
          <li>A thermal detection is not a confirmed fire.</li>
          <li>It does not predict future fires and does not show real-time data: it is a historical series.</li>
          <li>No detections does not prove there was no fire: satellites cannot see through clouds and do not observe at every moment.</li>
          <li>NASA FIRMS data are provided “as is” and must not be used for tactical decisions or local-scale conditions. AllpaNina is a scientific prototype.</li>
        </ul>
        <p className="landing-coverage m-0 max-w-[68ch] text-sm text-muted">This version covers Peru and its 25 departments{first && last ? `, from ${formatMonthLong(first.year, first.month)} to ${formatMonthLong(last.year, last.month)}` : ''}. The national map groups the observations into 10 km blocks.</p>
        <p className="m-0"><Link className={linkClass} to={ROUTES.method}>See the full method, evaluation and limitations</Link></p>
      </div>
    </section>
  </article>
}
