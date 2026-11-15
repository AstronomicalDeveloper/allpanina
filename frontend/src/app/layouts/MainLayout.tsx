import { Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from '../../shell/TopBar'
import Footer from '../../shell/Footer'
import { ROUTES, cleanPath } from '../../shell/routes'
import useDocumentTitle from '../useDocumentTitle'

/** Marco común: enlace de salto, barra superior, contenido y pie (el mapa ocupa toda la pantalla y no lleva pie). */
export default function MainLayout() {
  useDocumentTitle()
  const { pathname } = useLocation()
  const fullBleed = cleanPath(pathname) === ROUTES.map
  return <>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-2 focus:z-50 focus:rounded-control focus:bg-white focus:px-4 focus:py-2 focus:text-ink">Skip to content</a>
    <TopBar />
    <main id="main" tabIndex={-1} className="outline-none">
      <Suspense fallback={<p role="status" className="px-4 py-16 text-center text-muted">Loading…</p>}>
        <Outlet />
      </Suspense>
    </main>
    {!fullBleed && <Footer />}
  </>
}
