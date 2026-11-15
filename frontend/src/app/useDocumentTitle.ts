import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { ROUTES, cleanPath } from '../shell/routes'

const SITE = 'AllpaNina'
const titles: Record<string, string> = {
  [ROUTES.home]: `${SITE} · Satellite thermal detections in Peru`,
  [ROUTES.calendar]: `Calendar · ${SITE}`,
  [ROUTES.map]: `Map · ${SITE}`,
  [ROUTES.method]: `Method · ${SITE}`,
  [ROUTES.myRegion]: `My region · ${SITE}`,
  [ROUTES.about]: `About · ${SITE}`,
}

/** Título de la pestaña según la ruta; las rutas desconocidas se identifican como tales. */
export function titleFor(pathname: string): string {
  return titles[cleanPath(pathname)] ?? `Page not found · ${SITE}`
}

export default function useDocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => { document.title = titleFor(pathname) }, [pathname])
}
