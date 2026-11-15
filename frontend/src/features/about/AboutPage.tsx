import { Link } from 'react-router-dom'
import { PATHS } from '../../app/routes'
import { Container, PageHeader, Section } from '../../ui/Panel'
import { ExternalLink } from '../../ui/ExternalLink'

const REPOSITORY = 'https://github.com/AstronomicalDeveloper/allpanina'

/** About (D9). F1 base: what it is, who it is for, credits, AI use and earlier versions. F2 completes it. */
export default function AboutPage() {
  return <div className="bg-paper text-ink">
    <Container className="max-w-[960px] py-12 md:py-16">
      <PageHeader eyebrow="About" title="About AllpaNina"
        lead="AllpaNina means “land and fire” in Quechua. It joins NASA's MODIS and VIIRS active-fire detections into one monthly series for Peru and its 25 departments." />
      <Section id="about-who" title="Who it is for" className="mt-10">
        <p className="m-0 text-base text-ink">Regional governments and anyone who plans fire prevention: the calendar shows when each fire season starts and peaks, and the map shows where detections concentrate.</p>
      </Section>
      <Section id="about-team" title="Team">
        <p className="m-0 text-base text-ink">Built by the AllpaNina team for the NASA Space Apps Challenge 2026. <ExternalLink href={REPOSITORY}>Source code on GitHub</ExternalLink>, under the MIT License.</p>
      </Section>
      <Section id="about-credits" title="Credits">
        <p className="m-0 text-base text-ink">We acknowledge the use of data and imagery from LANCE FIRMS operated by NASA's Earth Science Data and Information System (ESDIS) with funding provided by NASA Headquarters. Department boundaries: INEI. Protected areas: MINAM. Base maps: Esri and NASA GIBS. World regions in My region: geoBoundaries (CC BY 4.0).</p>
      </Section>
      <Section id="about-ai" title="Use of artificial intelligence">
        <p className="m-0 text-base text-ink">We used an AI coding assistant under the team's direction. <ExternalLink href={`${REPOSITORY}/blob/main/AI_USE.md`}>Read our AI use statement</ExternalLink>.</p>
      </Section>
      <Section id="about-versions" title="Earlier versions">
        <p className="m-0 text-base text-ink">Version 1.0 was a validated pilot for the Ucayali department. <Link className="text-cinder underline underline-offset-4" to={`${PATHS.calendar}?data=pilot&mapRegion=PE-UCA`}>Open the Ucayali pilot (v1.0)</Link>.</p>
      </Section>
    </Container>
  </div>
}
