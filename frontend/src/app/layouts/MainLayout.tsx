import GeographicSelection from '../../components/ui/GeographicSelection'
import { Outlet, useLocation } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import useDocumentTitle from '../useDocumentTitle'
export default function MainLayout() { useDocumentTitle(); const {pathname}=useLocation(); return <><a className="skip" href="#main">Saltar al contenido</a><Navbar /><main id="main" tabIndex={-1}>{['/calendario','/mapa','/metodo'].includes(pathname)&&<GeographicSelection />}<Outlet /></main></> }
