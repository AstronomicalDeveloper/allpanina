import { Link } from 'react-router-dom'
import { ROUTES } from '../shell/routes'

const link = 'text-cinder underline underline-offset-4'

export default function NotFoundPage() {
  return <div className="mx-auto flex max-w-[1200px] flex-col gap-4 px-4 py-20 sm:px-6 lg:px-10">
    <h1 className="m-0 font-display text-4xl font-semibold text-ink">Page not found</h1>
    <p className="m-0 text-lg text-muted">This address does not exist. Try one of these:</p>
    <ul className="m-0 flex list-none flex-wrap gap-x-6 gap-y-2 p-0 text-base">
      <li><Link className={link} to={ROUTES.home}>Home</Link></li>
      <li><Link className={link} to={ROUTES.calendar}>Calendar</Link></li>
      <li><Link className={link} to={ROUTES.map}>Map</Link></li>
    </ul>
  </div>
}
