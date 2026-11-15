import { Outlet } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
export default function MainLayout() { return <><a className="skip" href="#main">Saltar al contenido</a><Navbar /><main id="main" tabIndex={-1}><Outlet /></main></> }
