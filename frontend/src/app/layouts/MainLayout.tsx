import { Suspense, useEffect } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import TopBar from '../../shell/TopBar'
import Footer from '../../shell/Footer'
import useDocumentTitle from '../useDocumentTitle'
import { PATHS, normalizePath } from '../routes'
import { preloadPages } from '../routeModules'

function RouteLoading() {
  return <p role="status" className="m-0 px-4 py-16 text-center text-sm text-muted md:px-10">Loading…</p>
}

export default function MainLayout() {
  useDocumentTitle()
  const { pathname } = useLocation()
  const isMap = normalizePath(pathname) === PATHS.map
  // After the first page is shown, load the other pages in the background so navigation is instant.
  useEffect(() => {
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number }).requestIdleCallback
    const run = () => { void preloadPages().catch(() => {}) }
    if (idle) idle(run); else setTimeout(run, 1500)
  }, [])
  return <>
    <a className="skip" href="#main">Skip to content</a>
    <TopBar />
    <main id="main" tabIndex={-1} className="outline-none">
      <Suspense fallback={<RouteLoading />}><Outlet /></Suspense>
    </main>
    {!isMap && <Footer />}
  </>
}
