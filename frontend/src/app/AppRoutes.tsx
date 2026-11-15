import { lazy } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import LandingPage from '../pages/landing/LandingPage'
import NotFoundPage from '../pages/NotFoundPage'
import { LEGACY_ROUTES, ROUTES } from '../shell/routes'

// Carga diferida por ruta (T2): la portada no descarga el calendario, el mapa, el método ni My region.
const CalendarPage = lazy(() => import('../pages/calendar/CalendarPage'))
const MapPage = lazy(() => import('../pages/map/MapPage'))
const MethodPage = lazy(() => import('../pages/method/MethodPage'))
const RegionPage = lazy(() => import('../pages/region/RegionPage'))
const AboutPage = lazy(() => import('../features/about/AboutPage'))

/** Redirige una ruta antigua conservando parámetros de consulta y ancla. */
function Redirect({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate replace to={{ pathname: to, search, hash }} />
}

/** `/` es la portada. Los enlaces antiguos que traían parámetros (`/?sensor=…`) siguen llevando al Calendario. */
function Home() {
  const { search } = useLocation()
  return search ? <Redirect to={ROUTES.calendar} /> : <LandingPage />
}

export default function AppRoutes() {
  return <Routes>
    <Route element={<MainLayout />}>
      <Route index element={<Home />} />
      <Route path="calendar" element={<CalendarPage />} />
      <Route path="map" element={<MapPage />} />
      <Route path="method" element={<MethodPage />} />
      <Route path="my-region" element={<RegionPage />} />
      <Route path="about" element={<AboutPage />} />
      {Object.entries(LEGACY_ROUTES).map(([from, to]) => <Route key={from} path={from.slice(1)} element={<Redirect to={to} />} />)}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
