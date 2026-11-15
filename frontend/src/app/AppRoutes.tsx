import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import { AboutPage, CalendarPage, LandingPage, MapPage, MethodPage, NotFoundPage, RegionPage } from './routeModules'
import { LEGACY_PATHS, PATHS } from './routes'

/** Redirect that keeps query parameters and hash (scope, period, sensor, local data...). */
function KeepParams({ to }: { to: string }) {
  const { search, hash } = useLocation()
  return <Navigate replace to={{ pathname: to, search, hash }} />
}

/** `/` is the home page. Old links with query parameters on the root (`/?sensor=…`) still open the Calendar. */
function Home() {
  const { search } = useLocation()
  return search ? <KeepParams to={PATHS.calendar} /> : <LandingPage />
}

export default function AppRoutes() {
  return <Routes>
    <Route element={<MainLayout />}>
      <Route index element={<Home />} />
      <Route path={PATHS.calendar.slice(1)} element={<CalendarPage />} />
      <Route path={PATHS.map.slice(1)} element={<MapPage />} />
      <Route path={PATHS.method.slice(1)} element={<MethodPage />} />
      <Route path={PATHS.myRegion.slice(1)} element={<RegionPage />} />
      <Route path={PATHS.about.slice(1)} element={<AboutPage />} />
      {Object.entries(LEGACY_PATHS).map(([from, to]) => <Route key={from} path={from.slice(1)} element={<KeepParams to={to} />} />)}
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  </Routes>
}
