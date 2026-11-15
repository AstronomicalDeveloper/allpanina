import { Link } from 'react-router-dom'
import { PATHS } from '../app/routes'
import { Container } from '../ui/Panel'

const link = 'text-cinder underline underline-offset-4'

export default function NotFoundPage() {
  return <Container className="py-16 md:py-24">
    <h1 className="m-0 font-display text-3xl font-semibold text-ink">Page not found</h1>
    <p className="mt-4 text-base text-muted">This address does not exist. Try one of these pages:</p>
    <p className="m-0 flex flex-wrap gap-x-6 gap-y-2 text-base">
      <Link className={link} to={PATHS.home}>Home</Link>
      <Link className={link} to={PATHS.calendar}>Calendar</Link>
      <Link className={link} to={PATHS.map}>Map</Link>
    </p>
  </Container>
}
