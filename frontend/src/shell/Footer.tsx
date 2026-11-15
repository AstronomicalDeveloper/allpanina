import { ExternalLink } from '../ui/ExternalLink'

const REPOSITORY = 'https://github.com/AstronomicalDeveloper/allpanina'

/** Footer on every page except the map (A3, D5): data credits, project and terms of use. */
export default function Footer() {
  return <footer className="on-dark bg-night text-paper/80">
    <div className="mx-auto grid max-w-[1440px] gap-10 px-4 py-12 text-sm md:grid-cols-3 md:px-10">
      <section aria-labelledby="footer-data">
        <h2 id="footer-data" className="m-0 mb-3 font-display text-lg font-semibold text-paper">Data</h2>
        <p className="m-0 mb-3 text-xs leading-relaxed">We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA's Earth Science Data and Information System (ESDIS) with funding provided by NASA Headquarters.</p>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-xs">
          <li><ExternalLink href="https://firms.modaps.eosdis.nasa.gov/">NASA FIRMS</ExternalLink>: MODIS (Terra, Aqua) and VIIRS (Suomi NPP) active-fire detections.</li>
          <li>INEI: department boundaries of Peru (2023).</li>
          <li>MINAM: protected natural areas.</li>
          <li>Esri and NASA GIBS: base maps.</li>
          <li><ExternalLink href="https://www.geoboundaries.org/">geoBoundaries</ExternalLink> (CC BY 4.0): world regions in My region.</li>
        </ul>
      </section>
      <section aria-labelledby="footer-project">
        <h2 id="footer-project" className="m-0 mb-3 font-display text-lg font-semibold text-paper">Project</h2>
        <ul className="m-0 grid list-none gap-1.5 p-0 text-xs">
          <li>Built by the AllpaNina team for the NASA Space Apps Challenge 2026.</li>
          <li><ExternalLink href={REPOSITORY}>Source code on GitHub</ExternalLink> (MIT License).</li>
          <li><ExternalLink href={`${REPOSITORY}/blob/main/AI_USE.md`}>How we used AI</ExternalLink></li>
        </ul>
      </section>
      <section aria-labelledby="footer-use">
        <h2 id="footer-use" className="m-0 mb-3 font-display text-lg font-semibold text-paper">Use</h2>
        <p className="m-0 text-xs leading-relaxed"><strong className="text-paper">Scientific prototype. Do not use for tactical decisions.</strong> A thermal detection seen from orbit is not a confirmed fire and does not measure burned area. FIRMS data are provided as is.</p>
      </section>
    </div>
  </footer>
}
