import { Link, useSearchParams } from 'react-router-dom'
import { datasetMode, datasetRoot } from '../services/data/geography'
import type { DatasetMode } from '../services/data/geography'
import { REPOSITORY_URL, ROUTES } from './routes'

/** Nombre del conjunto de datos activo, para que el enlace al manifiesto diga qué publicación abre. */
const DATASET_LABEL: Record<DatasetMode, string> = {
  peru: 'Peru v1.1',
  pilot: 'Ucayali pilot v1.0',
  demo: 'DEMO (fictitious data)',
  local: 'My region (this browser)',
}

const heading = 'm-0 mb-3 font-display text-base font-semibold text-white'
const link = 'text-mist underline underline-offset-4 hover:text-white'

function External({ href, children }: { href: string; children: string }) {
  return <a className={link} href={href} target="_blank" rel="noreferrer">{children}<span className="sr-only"> (opens in a new tab)</span></a>
}

/** Pie de página (PLAN_REDISENO §A3, D5): fuentes con el reconocimiento oficial de FIRMS, proyecto y aviso de uso. */
export default function Footer() {
  const [params] = useSearchParams()
  const mode = datasetMode(params)
  return <footer className="border-t border-rule bg-night text-sm text-mist">
    <div className="mx-auto grid max-w-[1200px] gap-10 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-10">
      <section aria-labelledby="footer-data">
        <h2 id="footer-data" className={heading}>Data</h2>
        <p className="m-0 mb-3 max-w-[48ch] leading-relaxed">
          We acknowledge the use of data and/or imagery from NASA's Fire Information for Resource Management System (<External href="https://firms.modaps.eosdis.nasa.gov/">FIRMS</External>), part of NASA's Land, Atmosphere Near real-time Capability for Earth observations (LANCE) and NASA's Earth Science Data and Information System (ESDIS).
        </p>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          <li>Department boundaries: <External href="https://ide.inei.gob.pe/">INEI Peru</External></li>
          <li>Basemaps: NASA GIBS, Esri, <External href="https://geoservidorperu.minam.gob.pe/">MINAM Geoservidor</External></li>
          <li>World regions for My region: <External href="https://www.geoboundaries.org/">geoBoundaries</External> (CC BY 4.0)</li>
          <li>{mode === 'local'
            ? <Link className={link} to={ROUTES.myRegion}>Data · {DATASET_LABEL.local}</Link>
            : <a className={link} href={`${datasetRoot(mode)}/manifest.json`}>Data manifest · {DATASET_LABEL[mode]}</a>}</li>
        </ul>
      </section>
      <section aria-labelledby="footer-project">
        <h2 id="footer-project" className={heading}>Project</h2>
        <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
          <li><Link className={link} to={ROUTES.about}>About AllpaNina and the team</Link></li>
          <li><Link className={link} to={ROUTES.method}>Method and evaluation</Link></li>
          <li><External href={REPOSITORY_URL}>Source code on GitHub</External></li>
          <li>Built for the NASA Space Apps Challenge 2026</li>
        </ul>
      </section>
      <section aria-labelledby="footer-use">
        <h2 id="footer-use" className={heading}>Use</h2>
        <p className="m-0 max-w-[48ch] leading-relaxed">
          AllpaNina is a scientific prototype. A thermal detection is not a confirmed fire, and no detection does not prove there was no fire. FIRMS data are provided as is and should not be used for tactical decisions or local-scale conditions.
        </p>
      </section>
    </div>
  </footer>
}
