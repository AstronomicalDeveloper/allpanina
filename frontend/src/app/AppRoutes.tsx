import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import CalendarPage from '../pages/calendar/CalendarPage'
import MapPage from '../pages/map/MapPage'
import MethodPage from '../pages/method/MethodPage'
import NotFoundPage from '../pages/NotFoundPage'
export default function AppRoutes() { const {search,hash}=useLocation(); return <Routes><Route element={<MainLayout />}><Route index element={<Navigate replace to={{pathname:'/calendario',search,hash}} />} /><Route path="calendario" element={<CalendarPage />} /><Route path="mapa" element={<MapPage />} /><Route path="metodo" element={<MethodPage />} /><Route path="*" element={<NotFoundPage />} /></Route></Routes> }
