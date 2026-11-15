import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import LandingPage from '../pages/landing/LandingPage'
import CalendarPage from '../pages/calendar/CalendarPage'
import MapPage from '../pages/map/MapPage'
import MethodPage from '../pages/method/MethodPage'
import NotFoundPage from '../pages/NotFoundPage'
import RegionPage from '../pages/region/RegionPage'
/** `/` es la página de inicio. Los enlaces antiguos que traían parámetros de consulta (`/?sensor=…`) siguen llevando al Calendario. */
function Home() { const {search,hash}=useLocation(); return search ? <Navigate replace to={{pathname:'/calendario',search,hash}} /> : <LandingPage /> }
export default function AppRoutes() { return <Routes><Route element={<MainLayout />}><Route index element={<Home />} /><Route path="calendario" element={<CalendarPage />} /><Route path="mapa" element={<MapPage />} /><Route path="metodo" element={<MethodPage />} /><Route path="mi-region" element={<RegionPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes> }
