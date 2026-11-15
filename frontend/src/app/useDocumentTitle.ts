import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const SITE = 'AllpaNina'
const titles: Record<string, string> = {
  '/': `${SITE} · Detecciones térmicas satelitales`,
  '/calendario': `Calendario histórico · ${SITE}`,
  '/mapa': `Mapa de observaciones · ${SITE}`,
  '/metodo': `Método y evaluación · ${SITE}`,
  '/mi-region': `Mi región · ${SITE}`,
}

/** Título de la pestaña según la ruta; las rutas desconocidas se identifican como tales. */
export function titleFor(pathname: string): string {
  const key = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname
  return titles[key] ?? `Página no encontrada · ${SITE}`
}

export default function useDocumentTitle() {
  const { pathname } = useLocation()
  useEffect(() => { document.title = titleFor(pathname) }, [pathname])
}
