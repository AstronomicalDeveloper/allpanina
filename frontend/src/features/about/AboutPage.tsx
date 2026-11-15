import { Link } from 'react-router-dom'
import { ButtonLink, Panel } from '../../ui'
import { REPOSITORY_URL, ROUTES } from '../../shell/routes'

/** Integrantes y responsabilidades, según el plan del equipo (AllpaNina v1.3, §2). */
const TEAM = [
  { name: 'Aldo', role: 'Scientific method, decisions and test sign-off' },
  { name: 'Marco', role: 'FIRMS data acquisition, processing and maps' },
  { name: 'Antonella', role: 'Calibration, validation and error metrics' },
  { name: 'Juan Matías', role: 'Interactive map' },
  { name: 'Landry', role: 'Web architecture, calendar and integration' },
  { name: 'Adriana', role: 'Visual design, accessibility and pitch' },
]

const h2 = 'm-0 font-display text-2xl font-semibold text-ink'
const prose = 'm-0 max-w-[68ch] text-base text-muted'

/** Acerca de (D9): qué es, para quién, equipo, créditos, uso de IA y versiones anteriores. */
export default function AboutPage() {
  return <article className="mx-auto flex max-w-[1200px] flex-col gap-14 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
    <header className="flex max-w-[68ch] flex-col gap-4">
      <h1 className="m-0 font-display text-4xl font-semibold text-ink sm:text-5xl">About AllpaNina</h1>
      <p className="m-0 text-lg text-muted">
        <em className="not-italic text-ink">Allpa nina</em> means “earth and fire” in Quechua. AllpaNina joins the thermal detections recorded by NASA's MODIS and VIIRS satellites into one comparable series for Peru and its 25 departments, month by month, from 2013 to July 2026.
      </p>
    </header>

    <section aria-labelledby="about-who" className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h2 id="about-who" className={h2}>Who it is for</h2>
        <p className={prose}>Regional governments and the agencies that plan fire prevention. Real-time alerts already exist; what AllpaNina adds is the historical record: which months and which departments concentrate thermal activity, and how each year compares with the others.</p>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className={h2}>What it does not do</h2>
        <p className={prose}>It does not detect fires in real time, predict future fires or measure burned area. A thermal detection is not a confirmed fire. The calibrated estimate has a measured error, published on the <Link className="text-cinder underline underline-offset-4" to={ROUTES.method}>Method</Link> page.</p>
      </div>
    </section>

    <section aria-labelledby="about-team" className="flex flex-col gap-6">
      <h2 id="about-team" className={h2}>Team</h2>
      <ul className="m-0 grid list-none gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map(person => <li key={person.name} className="border-l-2 border-ember pl-4">
          <p className="m-0 font-display text-xl font-semibold text-ink">{person.name}</p>
          <p className="m-0 text-sm text-muted">{person.role}</p>
        </li>)}
      </ul>
      <p className={prose}>Built for the NASA Space Apps Challenge 2026.</p>
    </section>

    <section aria-labelledby="about-credits" className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h2 id="about-credits" className={h2}>Data and credits</h2>
        <ul className="m-0 flex list-disc flex-col gap-2 pl-5 text-base text-muted">
          <li>Active fire detections: NASA FIRMS, MODIS Collection 6.1 (Terra and Aqua) and VIIRS 375 m (Suomi NPP).</li>
          <li>Department boundaries: INEI Peru, “Departamental (actualizado al 2023)”.</li>
          <li>Basemaps: NASA GIBS (Blue Marble), Esri, MINAM Geoservidor.</li>
          <li>World regions for My region: geoBoundaries, CC BY 4.0.</li>
        </ul>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className={h2}>Use of AI</h2>
        <p className={prose}>The team used Claude, an AI assistant by Anthropic, to help review code, reproduce results and draft documents. Every scientific decision and sign-off was made by the team, and each review is recorded in the repository.</p>
      </div>
    </section>

    <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-xl font-semibold text-ink">Earlier version</h2>
        <p className="m-0 text-sm text-muted">The Ucayali pilot (v1.0) used one calibration factor for a single department. It stays available for comparison.</p>
      </div>
      <div className="flex flex-wrap gap-3">
        <ButtonLink variant="secondary" to={`${ROUTES.calendar}?data=pilot&mapRegion=PE-UCA`}>Open the Ucayali pilot</ButtonLink>
        <a className="inline-flex min-h-11 items-center text-sm text-ink underline underline-offset-4" href={REPOSITORY_URL} target="_blank" rel="noreferrer">Source code<span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </Panel>
  </article>
}
