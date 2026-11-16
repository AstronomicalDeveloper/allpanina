import { Link } from 'react-router-dom'
import { ButtonLink, Notice, Panel } from '../../ui'
import { REPOSITORY_URL, ROUTES } from '../../shell/routes'

/** Integrantes y responsabilidades, según el plan del equipo (AllpaNina v1.3, §2). Sin datos inventados. */
const TEAM = [
  { name: 'Aldo', role: 'Scientific method, study area, data contracts and the frozen test period' },
  { name: 'Marco', role: 'NASA FIRMS data acquisition, normalization, cell-days, series and observed maps' },
  { name: 'Antonella', role: 'B0/B1 calibration, error metrics and monthly residuals, validation and test' },
  { name: 'Juan Matías', role: 'Interactive map: React and MapLibre, filters, interactions and integration tests' },
  { name: 'Landry', role: 'Web architecture, calendar, method page, integration and deployment' },
  { name: 'Adriana', role: 'Wireframes, visual system, perceptual accessibility, legends, video and pitch' },
]

const h2 = 'm-0 font-display text-2xl font-semibold text-ink'
const prose = 'm-0 max-w-[68ch] text-base text-muted'
const list = 'm-0 flex list-disc flex-col gap-2 pl-5 text-base text-muted'
const link = 'text-cinder underline underline-offset-4'

function External({ href, children }: { href: string; children: string }) {
  return <a className={link} href={href} target="_blank" rel="noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>
}

/** Acerca de (A4, D9): qué es y para quién, equipo, Space Apps, fuentes y créditos, uso de IA y versión anterior. */
export default function AboutPage() {
  return <article className="mx-auto flex max-w-[1200px] flex-col gap-14 px-4 py-14 sm:px-6 lg:px-10 lg:py-20">
    <header className="flex max-w-[68ch] flex-col gap-4">
      <h1 className="m-0 font-display text-4xl font-semibold text-ink sm:text-5xl">About AllpaNina</h1>
      <p className="m-0 text-lg text-muted">
        <em className="not-italic text-ink">Allpa nina</em> means “earth and fire” in Quechua. AllpaNina joins the thermal detections recorded by NASA's MODIS and VIIRS instruments into one comparable series for Peru and its 25 departments, month by month, from January 2013 to July 2026.
      </p>
    </header>

    <section aria-labelledby="about-who" className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h2 id="about-who" className={h2}>Who it is for</h2>
        <p className={prose}>Regional governments and the agencies that plan fire prevention. Real-time alerts already exist; what AllpaNina adds is the historical record: which months and which departments concentrate thermal activity, and how each year compares with the others.</p>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className={h2}>What it does not do</h2>
        <p className={prose}>It does not detect fires in real time, predict future fires or measure burned area. A thermal detection is not a confirmed fire. The calibrated estimate has a measured error, published on the <Link className={link} to={ROUTES.method}>Method</Link> page.</p>
      </div>
    </section>

    <section aria-labelledby="about-team" className="flex flex-col gap-6">
      <h2 id="about-team" className={h2}>Team</h2>
      <ul className="m-0 grid list-none gap-6 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {TEAM.map(person => <li key={person.name} className="flex flex-col gap-1 border-l-2 border-ember pl-4">
          <p className="m-0 font-display text-xl font-semibold text-ink">{person.name}</p>
          <p className="m-0 text-sm text-muted">{person.role}</p>
        </li>)}
      </ul>
      <Notice tone="exploratory" title="Pending: full names, affiliations and short bios">
        <p>Each member will add their own. Until then, only first names and the roles agreed in the team plan are shown.</p>
      </Notice>
    </section>

    <section aria-labelledby="about-space-apps" className="flex flex-col gap-3">
      <h2 id="about-space-apps" className={h2}>NASA Space Apps Challenge 2026</h2>
      <p className={prose}>AllpaNina is the team's project for the NASA Space Apps Challenge 2026, on comparing MODIS and VIIRS fire detections. The code and the data processing are public in the <External href={REPOSITORY_URL}>project repository</External>.</p>
    </section>

    <section aria-labelledby="about-credits" className="grid gap-8 md:grid-cols-2">
      <div className="flex flex-col gap-3">
        <h2 id="about-credits" className={h2}>Data sources</h2>
        <ul className={list}>
          <li>Active fire detections: <External href="https://firms.modaps.eosdis.nasa.gov/">NASA FIRMS</External> standard archive, MODIS Collection 6.1 (MCD14ML, Terra and Aqua) and VIIRS 375 m (VNP14IMGML, Suomi NPP).</li>
          <li>Department boundaries: <External href="https://ide.inei.gob.pe/">INEI Peru</External>, departmental limits updated to 2023.</li>
          <li>Basemaps: NASA GIBS (Blue Marble), Esri and <External href="https://geoservidorperu.minam.gob.pe/">MINAM Geoservidor</External>.</li>
          <li>World regions for My region: <External href="https://www.geoboundaries.org/">geoBoundaries</External>, CC BY 4.0.</li>
        </ul>
        <p className="m-0 max-w-[68ch] text-sm text-muted">We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (FIRMS), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) and NASA's Earth Science Data and Information System (ESDIS).</p>
      </div>
      <div className="flex flex-col gap-3">
        <h2 className={h2}>Software and type</h2>
        <ul className={list}>
          <li>React, React Router and Vite.</li>
          <li>MapLibre GL JS for the map.</li>
          <li>Tailwind CSS for the interface.</li>
          <li>IBM Plex Sans and IBM Plex Sans Condensed, under the SIL Open Font License, served from this site.</li>
        </ul>
      </div>
    </section>

    <section aria-labelledby="about-ai" className="flex flex-col gap-3">
      <h2 id="about-ai" className={h2}>Use of AI</h2>
      <p className={prose}>The team used ChatGPT (OpenAI), Codex (OpenAI) and Claude (Anthropic) for assistance with development, code review, documentation and technical questions. Scientific decisions and final validation remain the responsibility of the human team.</p>
    </section>

    <Panel className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 font-display text-xl font-semibold text-ink">Earlier version</h2>
        <p className="m-0 max-w-[60ch] text-sm text-muted">The Ucayali pilot (v1.0) calibrated a single department with one factor. It stays available for comparison; the current version (v1.1) covers Peru and its 25 departments.</p>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <ButtonLink variant="secondary" to={`${ROUTES.calendar}?data=pilot&mapRegion=PE-UCA`}>Open the Ucayali pilot</ButtonLink>
        <a className="inline-flex min-h-11 items-center text-sm text-ink underline underline-offset-4" href={REPOSITORY_URL} target="_blank" rel="noreferrer">Source code<span className="sr-only"> (opens in a new tab)</span></a>
      </div>
    </Panel>
  </article>
}
