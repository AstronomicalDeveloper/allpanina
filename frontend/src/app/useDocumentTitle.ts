import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { PATHS, normalizePath } from './routes'

const SITE = 'AllpaNina'
const titles: Record<string, string> = {
  [PATHS.home]: `${SITE} · Satellite fire detections`,
  [PATHS.calendar]: `Calendar · ${SITE}`,
  [PATHS.map]: `Map · ${SITE}`,
  [PATHS.method]: `Method · ${SITE}`,
  [PATHS.myRegion]: `My region · ${SITE}`,
  [PATHS.about]: `About · ${SITE}`,
}

/** Tab title for each route; unknown routes say so. */
export function titleFor(pathname: string): string {
  return titles[normalizePath(pathname)] ?? `Page not found · ${SITE}`
}

export default function useDocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => { document.title = titleFor(pathname) }, [pathname])
}
